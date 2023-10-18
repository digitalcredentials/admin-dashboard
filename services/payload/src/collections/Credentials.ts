import payload from 'payload';
import { CollectionConfig } from 'payload/types';

import ActionsButton from '../components/ActionsButton';
import CredentialStatusCell from '../components/credential/CredentialStatusCell';
import { CREDENTIAL_STATUS } from '../constants/credentials';
import DefaultListView from '../components/List/DefaultListView';

const CredentialsCollection: CollectionConfig = {
    slug: 'credential',
    admin: {
        defaultColumns: ['credentialName', 'id', 'status', 'actionButton'],
        useAsTitle: 'credentialName',
        disableDuplicate: true,
        components: { views: { List: DefaultListView } },
    },
    access: {
        delete: async ({ id }) => {
            try {
                if (!id) return false;

                const doc = await payload.findByID({ collection: 'credential', id });

                if (!doc) return false;

                return doc.status === CREDENTIAL_STATUS.DRAFT;
            } catch (error) {
                console.error('Error getting delete permission for credential batch!', {
                    error,
                    id,
                });

                return false;
            }
        },
    },
    fields: [
        { name: 'credentialName', type: 'text' },
        { name: 'earnerName', type: 'text' },
        { name: 'emailAddress', type: 'email' },
        { name: 'extraFields', type: 'json' },
        {
            name: 'status',
            type: 'text',
            required: true,
            defaultValue: CREDENTIAL_STATUS.DRAFT,
            admin: {
                hidden: true,
                components: { Cell: CredentialStatusCell },
            },
        },
        {
            name: 'batch',
            label: 'Batch Name',
            type: 'relationship',
            required: true,
            relationTo: 'credential-batch',
            hasMany: false,
        },
        { name: 'revocationReason', type: 'text', admin: { hidden: true } },
        { name: 'revocationDate', type: 'date', admin: { hidden: true } },
        {
            name: 'revokedBy',
            type: 'relationship',
            relationTo: 'users',
            hasMany: false,
            admin: { hidden: true },
        },
        {
            name: 'actionButton',
            label: 'Actions Button',
            type: 'ui',
            admin: { components: { Field: () => null, Cell: ActionsButton } },
        },
    ],
};

export default CredentialsCollection;
