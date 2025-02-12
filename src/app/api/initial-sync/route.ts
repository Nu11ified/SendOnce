import Account from "@/lib/account";
import { syncEmailsToDatabase } from "@/lib/sync-to-db";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

// Set max duration to 60 seconds (Vercel hobby plan limit)
export const maxDuration = 60

export const POST = async (req: NextRequest) => {
    const body = await req.json()
    const { accountId, userId, pageToken, deltaToken } = body
    if (!accountId || !userId) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });

    const dbAccount = await db.account.findUnique({
        where: {
            id: accountId,
            userId,
        }
    })
    if (!dbAccount) return NextResponse.json({ error: "ACCOUNT_NOT_FOUND" }, { status: 404 });

    const account = new Account(dbAccount.token)

    try {
        // If we have a pageToken, we're continuing a sync
        if (pageToken) {
            const response = await account.getUpdatedEmails({ pageToken });
            await syncEmailsToDatabase(response.records, accountId);
            
            // Update deltaToken if we have a new one
            if (response.nextDeltaToken) {
                await db.account.update({
                    where: { id: accountId },
                    data: { nextDeltaToken: response.nextDeltaToken }
                });
            }

            return NextResponse.json({ 
                success: true, 
                nextPageToken: response.nextPageToken,
                nextDeltaToken: response.nextDeltaToken,
                complete: !response.nextPageToken 
            });
        }
        
        // If we have a deltaToken, we're doing an incremental sync
        if (deltaToken) {
            const response = await account.getUpdatedEmails({ deltaToken });
            await syncEmailsToDatabase(response.records, accountId);
            
            // Update deltaToken if we have a new one
            if (response.nextDeltaToken) {
                await db.account.update({
                    where: { id: accountId },
                    data: { nextDeltaToken: response.nextDeltaToken }
                });
            }

            return NextResponse.json({ 
                success: true, 
                nextPageToken: response.nextPageToken,
                nextDeltaToken: response.nextDeltaToken,
                complete: !response.nextPageToken 
            });
        }

        // Otherwise, we're starting a new sync
        await account.createSubscription()
        const daysWithin = 3; // Sync last 3 days initially
        let syncResponse = await account.startSync(daysWithin);

        // If sync is not ready, return status for client to retry
        if (!syncResponse.ready) {
            return NextResponse.json({ 
                success: true,
                syncInProgress: true,
                complete: false
            });
        }

        // Get first batch of emails
        const updatedResponse = await account.getUpdatedEmails({ deltaToken: syncResponse.syncUpdatedToken });
        await syncEmailsToDatabase(updatedResponse.records, accountId);

        // Update deltaToken
        if (updatedResponse.nextDeltaToken) {
            await db.account.update({
                where: { id: accountId },
                data: { nextDeltaToken: updatedResponse.nextDeltaToken }
            });
        }

        return NextResponse.json({ 
            success: true,
            nextPageToken: updatedResponse.nextPageToken,
            nextDeltaToken: updatedResponse.nextDeltaToken,
            complete: !updatedResponse.nextPageToken
        });

    } catch (error) {
        console.error('Error in initial sync:', error);
        return NextResponse.json({ error: "FAILED_TO_SYNC" }, { status: 500 });
    }
}