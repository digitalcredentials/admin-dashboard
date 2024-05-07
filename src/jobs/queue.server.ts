import type { Job, Processor } from 'bullmq';
import { FlowProducer, QueueEvents } from 'bullmq';
import { Queue, Worker } from 'bullmq';
import payload from 'payload';
import { CREDENTIAL_BATCH_STATUS } from '../constants/batches';
import { CREDENTIAL_STATUS } from '../constants/credentials';

const redisUrl = process.env.REDIS_URL ?? 'localhost';
const redisPort = Number(process.env.REDIS_PORT ?? '6379');

// redis settings...
const connection = {
    host: redisUrl,
    port: redisPort,
};

type AugmentedQueue<T> = Queue<T> & {
    events: QueueEvents;
};
type RegisteredQueue = {
    queue: Queue;
    queueEvents: QueueEvents;
    worker: Worker;
};
declare global {
    var __registeredQueues: Record<string, RegisteredQueue> | undefined;
}
const registeredQueues = global.__registeredQueues || (global.__registeredQueues = {});

let flowProducer;
let emailQueue;

/**
 *
 * @param name Unique name of the queue
 * @param processor
 */
export function registerQueue<T>(name: string, processor: Processor<T>) {
    if (!registeredQueues[name]) {
        const queue = new Queue(name, { connection });
        const queueEvents = new QueueEvents(name, { connection });
        const worker = new Worker<T>(name, processor, {
            connection,
            lockDuration: 1000 * 60 * 15,
            concurrency: 8,
        });
        registeredQueues[name] = {
            queue,
            queueEvents,
            worker,
        };
    }
    const queue = registeredQueues[name].queue as AugmentedQueue<T>;
    queue.events = registeredQueues[name].queueEvents;
    return queue;
}

export type Email = {
    credentialId?: string;
    to: string;
    from?: string;
    subject: string;
    text?: string;
    html?: string;
};

export const sendEmails = async (batchId: string, emails: Email[]) => {
    initializeQueues();
    return flowProducer.add({
        name: `send-emails-for-${batchId}`,
        queueName: 'emailsFinished',
        data: { batchId },
        children: emails.map(email => ({
            name: email.credentialId || email.to,
            queueName: 'email',
            data: email,
        })),
    });
};

export const sendSingleEmail = async (email: Email) => {
    initializeQueues();
    emailQueue.add('send-test-email', email);
}

const initializeQueues = () => {
    if (!flowProducer) {
        flowProducer = new FlowProducer({ connection });
    }

    if (!emailQueue) {
        // This will run in the same thread as the main app
        // if this is more processor intensive then we should offload this to a background process
        /*
        "If we pass a path to a javascript file instead of a function to 
        the registerQueue function, BullMQ will spawn a new process to run the file. 
        These are called sandboxed processors."
        */
        emailQueue = registerQueue('email', async (job: Job<Email>) => {
            console.log('///emailQueue job', job);

            const { to, from, subject, text, html, credentialId } = job.data;

            await payload.sendEmail({
                to,
                subject,
                text,
                html,
                from:
                    from || process.env.EMAIL_FROM || 'Digital Credentials Consortium Demo Isser <DCC-support@mit.edu>',
            });

            if (credentialId) {
                await payload.update({
                    collection: 'credential',
                    id: credentialId,
                    data: { status: CREDENTIAL_STATUS.SENT },
                });
            }
        });
    }

    if (!registeredQueues['emailsFinished']) {
        registerQueue(
            'emailsFinished',
            async (job: Job<{ batchId: string }>) => {
                console.log('///emailsFinishedQueu job', job);

                return payload.update({
                    collection: 'credential-batch',
                    id: job.data.batchId,
                    data: { status: CREDENTIAL_BATCH_STATUS.SENT },
                });
            }
        );
    }

}