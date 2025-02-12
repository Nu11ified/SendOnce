import type { EmailHeader, EmailMessage, SyncResponse, SyncUpdatedResponse } from '@/lib/types';
import { db } from '@/server/db';
import axios from 'axios';
import { syncEmailsToDatabase } from './sync-to-db';

const API_BASE_URL = 'https://api.aurinko.io/v1';
const BATCH_SIZE = 50; // Process emails in smaller batches

class Account {
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    public async startSync(daysWithin: number): Promise<SyncResponse> {
        const response = await axios.post<SyncResponse>(
            `${API_BASE_URL}/email/sync`,
            {},
            {
                headers: { Authorization: `Bearer ${this.token}` }, 
                params: {
                    daysWithin,
                    bodyType: 'html'
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
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            }
        )
        return res.data
    }

    async syncEmails() {
        const account = await db.account.findUnique({
            where: { token: this.token },
        })
        if (!account) throw new Error("Invalid token")
        if (!account.nextDeltaToken) throw new Error("No delta token")
        
        let response = await this.getUpdatedEmails({ deltaToken: account.nextDeltaToken })
        let allEmails: EmailMessage[] = []
        let storedDeltaToken = account.nextDeltaToken
        let currentBatch = response.records

        // Process first batch
        if (currentBatch.length > 0) {
            await syncEmailsToDatabase(currentBatch.slice(0, BATCH_SIZE), account.id)
            allEmails = allEmails.concat(currentBatch)
        }

        if (response.nextDeltaToken) {
            storedDeltaToken = response.nextDeltaToken
        }

        // Process remaining pages in batches
        while (response.nextPageToken) {
            try {
                response = await this.getUpdatedEmails({ pageToken: response.nextPageToken });
                currentBatch = response.records

                if (currentBatch.length > 0) {
                    for (let i = 0; i < currentBatch.length; i += BATCH_SIZE) {
                        const batch = currentBatch.slice(i, i + BATCH_SIZE)
                        await syncEmailsToDatabase(batch, account.id)
                    }
                    allEmails = allEmails.concat(currentBatch)
                }

                if (response.nextDeltaToken) {
                    storedDeltaToken = response.nextDeltaToken
                }
            } catch (error) {
                console.error('Error processing batch:', error)
                break // Stop processing but save what we have
            }
        }

        // Update the delta token
        await db.account.update({
            where: { id: account.id },
            data: { nextDeltaToken: storedDeltaToken }
        })

        return allEmails
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
                headers: { Authorization: `Bearer ${this.token}` }
            }
        );
        return response.data;
    }

    async performInitialSync() {
        try {
            // Start the sync process with 30 days of history
            const daysWithin = 30;
            let syncResponse = await this.startSync(daysWithin);

            // Wait until the sync is ready with shorter timeout
            let attempts = 0;
            const maxAttempts = 5; // Reduced from 10 to stay within time limit
            while (!syncResponse.ready && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500)); // Reduced from 1000ms to 500ms
                syncResponse = await this.startSync(daysWithin);
                attempts++;
            }

            if (!syncResponse.ready) {
                throw new Error('Sync timed out after ' + maxAttempts + ' attempts');
            }

            // Get first batch with smaller batch size for faster processing
            const SYNC_BATCH_SIZE = 25; // Reduced from 50 to process faster
            let updatedResponse = await this.getUpdatedEmails({ deltaToken: syncResponse.syncUpdatedToken });
            let storedDeltaToken = updatedResponse.nextDeltaToken || syncResponse.syncUpdatedToken;

            // Process first batch
            if (updatedResponse.records.length > 0) {
                const batch = updatedResponse.records.slice(0, SYNC_BATCH_SIZE);
                await syncEmailsToDatabase(batch, this.token);
            }

            // Store the delta token even if we don't process all emails
            // This allows for incremental syncing of remaining emails
            const account = await db.account.findUnique({
                where: { token: this.token }
            });

            if (account) {
                await db.account.update({
                    where: { id: account.id },
                    data: { nextDeltaToken: storedDeltaToken }
                });
            }

            return {
                success: true,
                deltaToken: storedDeltaToken,
                hasMoreEmails: !!updatedResponse.nextPageToken,
                processedEmails: updatedResponse.records.length
            };

        } catch (error) {
            console.error('Error during initial sync:', error);
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
}
type EmailAddress = {
    name: string;
    address: string;
}

export default Account;
