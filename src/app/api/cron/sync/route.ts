import { db } from "@/server/db";
import Account from "@/lib/account";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

// This endpoint should be called every 5 minutes by cron
export async function GET(req: Request) {
    // Verify the request is authorized
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const BATCH_SIZE = 3; // Process 3 accounts per run to stay within time limit
        
        // Get accounts that haven't been synced recently (more than 4 minutes ago)
        const accounts = await db.account.findMany({
            select: {
                id: true,
                token: true,
                userId: true,
                lastSyncedAt: true,
            },
            where: {
                AND: [
                    { nextDeltaToken: { not: null } },
                    {
                        OR: [
                            { lastSyncedAt: { lt: new Date(Date.now() - 4 * 60 * 1000) } }, // 4 minutes ago
                            { lastSyncedAt: null }
                        ]
                    }
                ]
            },
            orderBy: {
                lastSyncedAt: 'asc' // Sync oldest first
            },
            take: BATCH_SIZE
        });

        console.log(`Starting periodic sync for batch of ${accounts.length} accounts`);

        // Sync each account in the batch
        const syncPromises = accounts.map(async (account) => {
            try {
                const acc = new Account(account.token);
                await acc.syncEmails();
                
                // Update last synced timestamp
                await db.account.update({
                    where: { id: account.id },
                    data: { lastSyncedAt: new Date() }
                });
                
                console.log(`Successfully synced account ${account.id}`);
            } catch (error) {
                console.error(`Failed to sync account ${account.id}:`, error);
                // Don't update lastSyncedAt on failure so it will be retried
            }
        });

        // Wait for all syncs in this batch to complete
        await Promise.all(syncPromises);

        return NextResponse.json({ 
            success: true, 
            message: `Synced batch of ${accounts.length} accounts` 
        });
    } catch (error) {
        console.error("Periodic sync failed:", error);
        return NextResponse.json({ 
            success: false, 
            error: "Failed to sync emails" 
        }, { status: 500 });
    }
} 