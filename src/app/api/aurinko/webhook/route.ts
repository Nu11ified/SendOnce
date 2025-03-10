import { NextRequest } from "next/server";
import crypto from "crypto";
import axios from "axios";
import Account from "@/lib/account";
import { db } from "@/server/db";
import { waitUntil } from "@vercel/functions";
import { OramaManager } from "@/lib/orama";

const AURINKO_SIGNING_SECRET = process.env.AURINKO_SIGNING_SECRET;

export const POST = async (req: NextRequest) => {
    console.log("Webhook: POST request received");
    const query = req.nextUrl.searchParams;
    const validationToken = query.get("validationToken");
    if (validationToken) {
        console.log("Webhook: Validation request received");
        return new Response(validationToken, { status: 200 });
    }

    const timestamp = req.headers.get("X-Aurinko-Request-Timestamp");
    const signature = req.headers.get("X-Aurinko-Signature");
    const body = await req.text();

    if (!timestamp || !signature || !body) {
        console.error("Webhook: Missing required headers", { timestamp, signature, hasBody: !!body });
        return new Response("Bad Request", { status: 400 });
    }

    const basestring = `v0:${timestamp}:${body}`;
    const expectedSignature = crypto
        .createHmac("sha256", AURINKO_SIGNING_SECRET!)
        .update(basestring)
        .digest("hex");

    if (signature !== expectedSignature) {
        console.error("Webhook: Invalid signature");
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        // Process webhook notification if present
        if (body) {
            type AurinkoNotification = {
                subscription: number;
                resource: string;
                accountId: number;
                payloads: {
                    id: string;
                    changeType: string;
                    attributes: {
                        threadId: string;
                    };
                }[];
            };

            const payload = JSON.parse(body) as AurinkoNotification;
            console.log("Webhook: Received notification:", JSON.stringify(payload, null, 2));
            
            // Find all accounts with matching Aurinko ID
            const accounts = await db.account.findMany({
                where: {
                    provider: 'aurinko'
                }
            });

            console.log(`Webhook: Found ${accounts.length} Aurinko accounts`);
            console.log('Webhook: Looking for account with Aurinko ID:', payload.accountId);

            // Find matching account
            let matchingAccount = null;
            for (const account of accounts) {
                try {
                    console.log(`Webhook: Checking account ${account.id}`);
                    
                    // Update the account ID to match Aurinko's ID
                    if (account.id !== payload.accountId.toString()) {
                        console.log(`Webhook: Updating account ID from ${account.id} to ${payload.accountId}`);
                        await db.account.update({
                            where: { id: account.id },
                            data: { id: payload.accountId.toString() }
                        });
                        matchingAccount = {
                            ...account,
                            id: payload.accountId.toString()
                        };
                        break;
                    } else {
                        matchingAccount = account;
                        break;
                    }
                } catch (e) {
                    console.error(`Webhook: Failed to process account ${account.id}:`, e);
                }
            }

            if (!matchingAccount) {
                console.error(`Webhook: No account found for Aurinko ID ${payload.accountId}`);
                console.log('Webhook: All accounts:', accounts.map(acc => ({
                    id: acc.id,
                    provider: acc.provider,
                    emailAddress: acc.emailAddress,
                    tokenPreview: acc.token.substring(0, 50) + '...'
                })));
                return new Response("Account not found", { status: 404 });
            }

            // Process the notification with the matching account
            console.log(`Webhook: Processing account ${matchingAccount.id} (Aurinko ID: ${payload.accountId})`);
            
            // Initialize search index
            const oramaManager = new OramaManager(matchingAccount.id);
            await oramaManager.initialize();
            console.log("Webhook: Search index initialized");

            // Sync the account
            try {
                const acc = new Account(matchingAccount.token);
                if (!matchingAccount.nextDeltaToken) {
                    console.log('Webhook: No delta token found, performing initial sync');
                    const response = await acc.performInitialSync();
                    if (response) {
                        await db.account.update({
                            where: { id: matchingAccount.id },
                            data: { 
                                nextDeltaToken: response.deltaToken,
                                lastSyncedAt: new Date()
                            }
                        });
                        console.log('Webhook: Initial sync completed');
                    }
                } else {
                    console.log('Webhook: Performing incremental sync');
                    await acc.syncEmails();
                    await db.account.update({
                        where: { id: matchingAccount.id },
                        data: { lastSyncedAt: new Date() }
                    });
                    console.log('Webhook: Incremental sync completed');
                }
            } catch (error) {
                console.error(`Webhook: Failed to sync account ${matchingAccount.id}:`, error);
            }
        }

        // Also check for any accounts that need periodic sync
        const accountsToSync = await db.account.findMany({
            where: {
                AND: [
                    { nextDeltaToken: { not: null } },
                    {
                        OR: [
                            { lastSyncedAt: { lt: new Date(Date.now() - 4 * 60 * 1000) } },
                            { lastSyncedAt: null }
                        ]
                    }
                ]
            },
            take: 3
        });

        if (accountsToSync.length > 0) {
            console.log(`Webhook: Found ${accountsToSync.length} accounts needing periodic sync`);
            
            // Process unique accounts
            const uniqueAccounts = [...new Map(accountsToSync.map(acc => [acc.id, acc])).values()];

            // Sync each account
            await Promise.all(uniqueAccounts.map(async (account) => {
                try {
                    const acc = new Account(account.token);
                    await acc.syncEmails();
                    await db.account.update({
                        where: { id: account.id },
                        data: { lastSyncedAt: new Date() }
                    });
                    console.log(`Webhook: Successfully synced account ${account.id}`);
                } catch (error) {
                    console.error(`Webhook: Failed to sync account ${account.id}:`, error);
                }
            }));
        }

        return new Response("Sync completed", { status: 200 });
    } catch (error) {
        console.error("Webhook: Sync failed:", error);
        return new Response("Error processing sync", { status: 500 });
    }
};

