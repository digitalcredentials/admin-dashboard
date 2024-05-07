import { buildConfig } from 'payload/config';
import path from 'path';
import Users from './collections/Users';
import CredentialsTemplatesCollection from './collections/CredentialTemplates';
import CredentialsBatchesCollection from './collections/CredentialBatches';
import CredentialsCollection from './collections/Credentials';
import EmailTemplatesCollection from './collections/EmailTemplates';
//components
import { Logo } from './components/Logo';
import { Icon } from './components/Icon';
import SideNav from './components/SideNav/SideNav';

//endpoints
import { readPayloadVersion } from './endpoints/readPayloadVersion';
import { createBatchCredentials } from './endpoints/createCredentialsForBatch';
import { getBatchCredentials } from './endpoints/getBatchCredentials';
import { getBatchFields } from './endpoints/getBatchFields';
import { sendEmail } from './endpoints/sendEmail';
import { getCredential } from './endpoints/getCredential';
import { sendBatchEmail } from './endpoints/sendBatchEmail';
import { getCollectionCount } from './endpoints/getCollectionCount';

import { getCredentialLinks } from './endpoints/getCredentialLinks';
import { forwardExchangeRequest } from './endpoints/exchange';
import { revokeCredential } from './endpoints/revokeCredential';
import DashboardRedirect from './components/DashboardRedirect';
import AccountSettings from './components/AccountSettings';

export default buildConfig({
    rateLimit: {
        max: 100000, // limit each IP per windowMs
        trustProxy: true,
        window: 2 * 60 * 1000, // 2 minutes
      },
    email: {
        transportOptions: {
            host: process.env.SMTP_HOST,
            transportMethod: 'SMTP',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            port: 587,
            secure: false, // use TLS
            tls: {
                // do not fail on invalid certs
                rejectUnauthorized: false,
            },
        },
        //logMockCredentials: true,
        fromName: 'DCC',
        fromAddress: 'chartraj@mit.edu',
    },
    serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000',
    cors: '*',
    admin: {
        css: require.resolve('./components/global.scss'),
        user: Users.slug,
        meta: {
            titleSuffix: '- Digital Credentials Consortium',
            favicon: '/assets/tdm-logo.png',
            ogImage: '/assets/tdm-og.png',
        },
        components: {
            Nav: SideNav,
            graphics: {
                Logo,
                Icon,
            },
            views: {
                Dashboard: DashboardRedirect,
                Account: AccountSettings,
            },
        },
        webpack: config => ({
            ...config,
            resolve: {
                ...config.resolve,
                alias: {
                    ...config.resolve.alias,
                    [require.resolve('./helpers/jwtHelpers.ts')]:
                        require.resolve('./mocks/emptyObject'),
                    [require.resolve('./jobs/queue.server.ts')]:
                        require.resolve('./mocks/emptyObject'),
                    [require.resolve('./endpoints/getCredential')]:
                        require.resolve('./mocks/emptyObject'),
                    [require.resolve('./endpoints/getCredentialLinks')]:
                        require.resolve('./mocks/emptyObject'),
                    [require.resolve('./endpoints/exchange')]:
                        require.resolve('./mocks/emptyObject'),
                },
            },
        }),
    },
    collections: [
        Users,
        CredentialsTemplatesCollection,
        CredentialsBatchesCollection,
        CredentialsCollection,
        EmailTemplatesCollection,
    ],
    endpoints: [
        { method: 'post', path: '/send-email', handler: sendEmail },
        { method: 'post', path: '/send-batch-email', handler: sendBatchEmail },
        { method: 'get', path: '/payload-version', handler: readPayloadVersion },
        { method: 'post', path: '/get-batch-credentials', handler: getBatchCredentials },
        { method: 'post', path: '/get-batch-fields', handler: getBatchFields },
        { method: 'post', path: '/create-batch-credentials', handler: createBatchCredentials },
        // This is a security hole that needs to go away when we're done testing!!!
        // Commented out to close hole. If you need to generate a link for a cred, just hit the
        // Resend button and check browser logs!
        // { method: 'get', path: '/get-credential-jwt', handler: getCredentialJwt },
        { method: 'get', path: '/get-credential', handler: getCredential },
        { method: 'post', path: '/get-collection-count', handler: getCollectionCount },
        { method: 'get', path: '/get-credential-links', handler: getCredentialLinks },
        { method: 'post', path: '/exchange/:a/:b/:token', handler: forwardExchangeRequest },
        { method: 'post', path: '/revoke-credential/:id', handler: revokeCredential },
    ],
    typescript: {
        outputFile: path.resolve(__dirname, 'payload-types.ts'),
    },
    graphQL: {
        schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
    },
});
