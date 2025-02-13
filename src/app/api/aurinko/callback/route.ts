import { getAccountDetails, getAurinkoToken } from "@/lib/aurinko";
import { waitUntil } from '@vercel/functions'
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import axios from "axios";
import { type NextRequest, NextResponse } from "next/server";
import Account from "@/lib/account";

export const GET = async (req: NextRequest) => {
    try {
        console.log('Callback: Starting authorization process');
        
        const { userId } = await auth()
        if (!userId) {
            console.error('Callback: No userId found');
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }

        const params = req.nextUrl.searchParams
        const status = params.get('status');
        if (status !== 'success') {
            console.error('Callback: Status is not success:', status);
            return NextResponse.json({ error: "Account connection failed" }, { status: 400 });
        }

        const code = params.get('code');
        if (!code) {
            console.error('Callback: No code provided');
            return NextResponse.json({ error: "No authorization code provided" }, { status: 400 });
        }

        console.log('Callback: Getting token from Aurinko');
        const token = await getAurinkoToken(code);
        if (!token) {
            console.error('Callback: Failed to get token from Aurinko');
            return NextResponse.json({ error: "Failed to fetch token" }, { status: 400 });
        }
        console.log('Callback: Successfully got token from Aurinko');

        // Get account details using the imported function
        console.log('Callback: Getting account details from Aurinko');
        const profile = await getAccountDetails(token.accessToken);
        console.log('Callback: Got account details:', JSON.stringify(profile, null, 2));

        // Extract account ID from token response
        const accountId = token.accountId.toString();

        // Store token as JSON object with both access token and account ID
        const tokenObject = {
            accessToken: token.accessToken,
            accountId: token.accountId
        };

        // Create/update account in database
        console.log('Callback: Upserting account in database:', {
            id: accountId,
            userId,
            provider: 'aurinko',
            emailAddress: profile.email,
            name: profile.name,
            tokenPreview: JSON.stringify(tokenObject).substring(0, 50) + '...'
        });

        const dbAccount = await db.account.upsert({
            where: {
                id: accountId
            },
            create: {
                id: accountId,
                userId,
                token: JSON.stringify(tokenObject),
                provider: 'aurinko',
                emailAddress: profile.email,
                name: profile.name
            },
            update: {
                token: JSON.stringify(tokenObject),
                emailAddress: profile.email,
                name: profile.name
            }
        });

        console.log('Callback: Successfully stored account in database');

        // Create subscription for webhooks
        console.log('Callback: Creating webhook subscription');
        const account = new Account(token.accessToken);
        await account.createSubscription();
        console.log('Callback: Successfully created webhook subscription');

        // Trigger initial sync
        console.log('Callback: Triggering initial sync');
        try {
            const response = await account.performInitialSync();
            if (response) {
                await db.account.update({
                    where: { id: accountId },
                    data: { 
                        nextDeltaToken: response.deltaToken,
                        lastSyncedAt: new Date()
                    }
                });
                console.log('Callback: Initial sync completed');
            }
        } catch (error) {
            console.error('Callback: Failed to perform initial sync:', error);
            // Continue with the redirect even if sync fails
        }

        return NextResponse.redirect(new URL('/mail', req.url));
    } catch (error) {
        console.error('Callback: Error during authorization:', error);
        return NextResponse.json({ 
            error: "Failed to authorize account",
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}