import { NextRequest } from "next/server";
import crypto from "crypto";
import axios from "axios";
import Account from "@/lib/account";
import { db } from "@/server/db";
import { waitUntil } from "@vercel/functions";

const AURINKO_SIGNING_SECRET = process.env.AURINKO_SIGNING_SECRET;

export const POST = async (req: NextRequest) => {
    console.log("POST request received");
    const query = req.nextUrl.searchParams;
    const validationToken = query.get("validationToken");
    if (validationToken) {
        return new Response(validationToken, { status: 200 });
    }

    const timestamp = req.headers.get("X-Aurinko-Request-Timestamp");
    const signature = req.headers.get("X-Aurinko-Signature");
    const body = await req.text();

    if (!timestamp || !signature || !body) {
        return new Response("Bad Request", { status: 400 });
    }

    const basestring = `v0:${timestamp}:${body}`;
    const expectedSignature = crypto
        .createHmac("sha256", AURINKO_SIGNING_SECRET!)
        .update(basestring)
        .digest("hex");

    if (signature !== expectedSignature) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        // Check for accounts that need syncing (more than 4 minutes since last sync)
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
            take: 3 // Process a few accounts at a time
        });

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
            console.log("Received notification:", JSON.stringify(payload, null, 2));
            const notifiedAccount = await db.account.findUnique({
                where: { id: payload.accountId.toString() }
            });

            if (notifiedAccount) {
                accountsToSync.push(notifiedAccount);
            }
        }

        // Process unique accounts
        const uniqueAccounts = [...new Map(accountsToSync.map(acc => [acc.id, acc])).values()];

        // Sync each account
        await Promise.all(uniqueAccounts.map(async (account) => {
            try {
                const acc = new Account(account.token);
                if (!account.nextDeltaToken) {
                    console.log('No delta token found, performing initial sync');
                    const response = await acc.performInitialSync();
                    if (response) {
                        await db.account.update({
                            where: { id: account.id },
                            data: { 
                                nextDeltaToken: response.deltaToken,
                                lastSyncedAt: new Date()
                            }
                        });
                    }
                } else {
                    await acc.syncEmails();
                    await db.account.update({
                        where: { id: account.id },
                        data: { lastSyncedAt: new Date() }
                    });
                }
                console.log(`Successfully synced account ${account.id}`);
            } catch (error) {
                console.error(`Failed to sync account ${account.id}:`, error);
            }
        }));

        return new Response("Sync completed", { status: 200 });
    } catch (error) {
        console.error("Sync failed:", error);
        return new Response("Error processing sync", { status: 500 });
    }
};
