import payload from 'payload';
import { PayloadHandler } from 'payload/config';
import Handlebars from 'handlebars';

import { sendSingleEmail } from '../jobs/queue.server';
import { generateJwtFromId } from '../helpers/jwtHelpers';
import { CREDENTIAL_STATUS } from '../constants/credentials';

export const sendEmail: PayloadHandler = async (req, res) => {
    if (!req.user) return res.sendStatus(400);

    const { credentialId } = req.body;

    if (!credentialId) return res.sendStatus(400);

    const credential = await payload.findByID({
        collection: 'credential',
        depth: 3,
        id: credentialId,
        locale: 'en',
    });

    if (
        !credential ||
        !credential.batch ||
        typeof credential.batch === 'string' ||
        !credential.batch.emailTemplate
    ) {
        return res.sendStatus(404);
    }

    const emailTemplateField = credential.batch.emailTemplate;

    const emailTemplateRecord =
        typeof emailTemplateField === 'string'
            ? await payload.findByID({
                collection: 'email-template',
                id: emailTemplateField,
                depth: 2,
                showHiddenFields: true,
                locale: 'en',
            })
            : emailTemplateField;

    // email template code
    const emailTemplate = emailTemplateRecord?.emailTemplatesHandlebarsCode;

    if (!emailTemplate) return res.sendStatus(404);

    const handlebarsTemplate = Handlebars.compile(emailTemplate);

    const claimPageBaseUrl = process.env.CLAIM_PAGE_URL || 'https://localhost:4321';

    const jwt = generateJwtFromId(credential.id);
    const link = `${claimPageBaseUrl}/?token=${jwt}`;
    // replace handlebar variables in email template with record data
    const mergedRecordWithLink = {
        ...(credential.extraFields as any),
        link,
        credentialName: credential.credentialName,
        earnerName: credential.earnerName,
        emailAddress: credential.emailAddress,
        now: new Date().toISOString(),
        issuanceDate: new Date().toISOString(),
    };
    const parsedHtml = handlebarsTemplate(mergedRecordWithLink);

    const email = {
        to: credential.emailAddress,
        from: credential.batch.from || emailTemplateRecord.from,
        subject: emailTemplateRecord?.emailSubjectTitle || 'Claim Credential',
        email: 'test email2',
        html: `${parsedHtml}`,
    };

    try {
        if (credential.status === CREDENTIAL_STATUS.DRAFT) {
            await payload.update({
                collection: 'credential',
                id: credential.id,
                data: { status: CREDENTIAL_STATUS.SENT },
            });
        }
        console.log('///emailsData', email);
        sendSingleEmail(email)
        

        res.status(200).json({ email, link });
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
};
