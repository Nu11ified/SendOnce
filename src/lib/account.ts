import type { EmailHeader, EmailMessage, SyncResponse, SyncUpdatedResponse } from '@/lib/types';
import { db } from '@/server/db';
import axios from 'axios';
import { syncEmailsToDatabase } from './sync-to-db';

const API_BASE_URL = 'https://api.aurinko.io/v1';

class Account {
    private token: string;
    private accessToken: string;

    constructor(token: string) {
        this.token = token;
        this.accessToken = token; // Token is now directly the access token
    }

    private getHeaders() {
        return {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
        };
    }

    async getProfile() {
        const res = await axios.get(`${API_BASE_URL}/users/me`, {
            headers: this.getHeaders()
        });
        return res.data;
    }

    private async startSync(daysWithin: number): Promise<SyncResponse> {
        console.log(`Starting sync for past ${daysWithin} days`);
        const response = await axios.post<SyncResponse>(
            `${API_BASE_URL}/email/sync`,
            {},
            {
                headers: this.getHeaders(),
                params: {
                    daysWithin,
                    bodyType: 'html',
                    includeHistory: true
                }
            }
        );
        return response.data;
    }

    async createSubscription() {
        const webhookUrl = process.env.NODE_ENV === 'development' ? 'https://potatoes-calculator-reports-crisis.trycloudflare.com' : process.env.NEXT_PUBLIC_URL
        const res = await axios.post('https://api.aurinko.io/v1/subscriptions',
            {
                resource: '/email/messages',
                notificationUrl: webhookUrl + '/api/aurinko/webhook'
            },
            {
                headers: this.getHeaders()
            }
        )
        return res.data
    }

    async syncEmails() {
        const account = await db.account.findUnique({
            where: {
                token: this.token
            },
        })
        if (!account) throw new Error("Invalid token")
        if (!account.nextDeltaToken) throw new Error("No delta token")
        let response = await this.getUpdatedEmails({ deltaToken: account.nextDeltaToken })
        let allEmails: EmailMessage[] = response.records
        let storedDeltaToken = account.nextDeltaToken
        if (response.nextDeltaToken) {
            storedDeltaToken = response.nextDeltaToken
        }
        while (response.nextPageToken) {
            response = await this.getUpdatedEmails({ pageToken: response.nextPageToken });
            allEmails = allEmails.concat(response.records);
            if (response.nextDeltaToken) {
                storedDeltaToken = response.nextDeltaToken
            }
        }

        if (!response) throw new Error("Failed to sync emails")

        try {
            await syncEmailsToDatabase(allEmails, account.id)
        } catch (error) {
            console.log('error', error)
        }

        await db.account.update({
            where: {
                id: account.id,
            },
            data: {
                nextDeltaToken: storedDeltaToken,
            }
        })
    }

    async getUpdatedEmails({ deltaToken, pageToken }: { deltaToken?: string, pageToken?: string }): Promise<SyncUpdatedResponse> {
        let params: Record<string, string> = {};
        if (deltaToken) {
            params.deltaToken = deltaToken;
        }
        if (pageToken) {
            params.pageToken = pageToken;
        }
        const response = await axios.get<SyncUpdatedResponse>(
            `${API_BASE_URL}/email/sync/updated`,
            {
                params,
                headers: this.getHeaders()
            }
        );
        return response.data;
    }

    async performInitialSync() {
        try {
            console.log('Starting initial sync');
            // Start the sync process
            const daysWithin = 30;
            let syncResponse = await this.startSync(daysWithin);
            console.log('Initial sync response:', syncResponse);

            // Wait until the sync is ready
            while (!syncResponse.ready) {
                console.log('Waiting for sync to be ready...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                syncResponse = await this.startSync(daysWithin);
            }
            console.log('Sync is ready');

            // Get account ID by querying the database
            const account = await db.account.findUnique({
                where: { token: this.token }
            });
            if (!account) {
                throw new Error('Account not found');
            }
            const accountId = account.id;

            // Perform initial sync of updated emails
            let storedDeltaToken: string = syncResponse.syncUpdatedToken;
            console.log('Getting updated emails with token:', storedDeltaToken);
            let updatedResponse = await this.getUpdatedEmails({ deltaToken: syncResponse.syncUpdatedToken });
            console.log('Got updated emails:', updatedResponse.records.length);
            
            if (updatedResponse.nextDeltaToken) {
                storedDeltaToken = updatedResponse.nextDeltaToken;
            }
            let allEmails: EmailMessage[] = updatedResponse.records;

            // Fetch all pages if there are more
            while (updatedResponse.nextPageToken) {
                console.log('Getting next page of emails');
                updatedResponse = await this.getUpdatedEmails({ pageToken: updatedResponse.nextPageToken });
                allEmails = allEmails.concat(updatedResponse.records);
                console.log('Total emails so far:', allEmails.length);
                if (updatedResponse.nextDeltaToken) {
                    storedDeltaToken = updatedResponse.nextDeltaToken;
                }
            }

            console.log('Total emails to sync:', allEmails.length);
            
            // Store emails in database
            try {
                console.log('Syncing emails to database');
                await syncEmailsToDatabase(allEmails, accountId);
                console.log('Successfully synced emails to database');
            } catch (error) {
                console.error('Failed to sync emails to database:', error);
                throw error;
            }

            return {
                emails: allEmails,
                deltaToken: storedDeltaToken,
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error during sync:', JSON.stringify(error.response?.data, null, 2));
            } else {
                console.error('Error during sync:', error);
            }
            throw error;
        }
    }

    async sendEmail({
        from,
        subject,
        body,
        inReplyTo,
        references,
        threadId,
        to,
        cc,
        bcc,
        replyTo,
    }: {
        from: EmailAddress;
        subject: string;
        body: string;
        inReplyTo?: string;
        references?: string;
        threadId?: string;
        to: EmailAddress[];
        cc?: EmailAddress[];
        bcc?: EmailAddress[];
        replyTo?: EmailAddress;
    }) {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/email/messages`,
                {
                    from,
                    subject,
                    body,
                    inReplyTo,
                    references,
                    threadId,
                    to,
                    cc,
                    bcc,
                    replyTo: [replyTo],
                },
                {
                    params: {
                        returnIds: true
                    },
                    headers: { Authorization: `Bearer ${this.token}` }
                }
            );

            console.log('sendmail', response.data)
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error sending email:', JSON.stringify(error.response?.data, null, 2));
            } else {
                console.error('Error sending email:', error);
            }
            throw error;
        }
    }

    async getWebhooks() {
        type Response = {
            records: {
                id: number;
                resource: string;
                notificationUrl: string;
                active: boolean;
                failSince: string;
                failDescription: string;
            }[];
            totalSize: number;
            offset: number;
            done: boolean;
        }
        const res = await axios.get<Response>(`${API_BASE_URL}/subscriptions`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        })
        return res.data
    }

    async createWebhook(resource: string, notificationUrl: string) {
        const res = await axios.post(`${API_BASE_URL}/subscriptions`, {
            resource,
            notificationUrl
        }, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        })
        return res.data
    }

    async deleteWebhook(subscriptionId: string) {
        const res = await axios.delete(`${API_BASE_URL}/subscriptions/${subscriptionId}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        })
        return res.data
    }

    async syncHistoricalEmails(daysToSync: number) {
        console.log(`Starting historical sync for ${daysToSync} days`);
        try {
            // Start the sync process
            let syncResponse = await this.startSync(daysToSync);
            console.log('Historical sync response:', syncResponse);

            // Wait until the sync is ready
            while (!syncResponse.ready) {
                console.log('Waiting for historical sync to be ready...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                syncResponse = await this.startSync(daysToSync);
            }
            console.log('Historical sync is ready');

            // Get account ID by querying the database
            const account = await db.account.findUnique({
                where: { token: this.token }
            });
            if (!account) {
                throw new Error('Account not found');
            }

            // Perform sync of historical emails
            let storedDeltaToken: string = syncResponse.syncUpdatedToken;
            console.log('Getting historical emails with token:', storedDeltaToken);
            let updatedResponse = await this.getUpdatedEmails({ deltaToken: syncResponse.syncUpdatedToken });
            console.log('Got historical emails:', updatedResponse.records.length);
            
            let allEmails: EmailMessage[] = updatedResponse.records;

            // Fetch all pages if there are more
            while (updatedResponse.nextPageToken) {
                console.log('Getting next page of historical emails');
                updatedResponse = await this.getUpdatedEmails({ pageToken: updatedResponse.nextPageToken });
                allEmails = allEmails.concat(updatedResponse.records);
                console.log('Total historical emails so far:', allEmails.length);
            }

            console.log('Total historical emails to sync:', allEmails.length);
            
            // Store emails in database
            try {
                console.log('Syncing historical emails to database');
                await syncEmailsToDatabase(allEmails, account.id);
                console.log('Successfully synced historical emails to database');
            } catch (error) {
                console.error('Failed to sync historical emails to database:', error);
                throw error;
            }

            return {
                count: allEmails.length,
                oldestEmail: allEmails.length > 0 ? new Date(allEmails[allEmails.length - 1]?.sentAt ?? new Date()) : null
            };
        } catch (error) {
            console.error('Error during historical sync:', error);
            throw error;
        }
    }
}
type EmailAddress = {
    name: string;
    address: string;
}

export default Account;
