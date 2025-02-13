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

        // Create account instance and get profile
        const account = new Account(token.accessToken);
        console.log('Callback: Getting profile from Aurinko');
        const profile = await account.getProfile();
        console.log('Callback: Got profile:', JSON.stringify(profile, null, 2));

        // Store token as JSON object with both access token and account ID
        const tokenObject = {
            accessToken: token.accessToken,
            accountId: profile.id
        };

        // Create/update account in database
        console.log('Callback: Upserting account in database:', {
            id: profile.id.toString(),
            userId,
            provider: 'aurinko',
            emailAddress: profile.email,
            name: profile.name,
            tokenPreview: JSON.stringify(tokenObject).substring(0, 50) + '...'
        });

        const dbAccount = await db.account.upsert({
            where: {
                id: profile.id.toString()
            },
            create: {
                id: profile.id.toString(),
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
        await account.createSubscription();
        console.log('Callback: Successfully created webhook subscription');

        // Trigger initial sync
        console.log('Callback: Triggering initial sync');
        waitUntil(
            axios.post(`${process.env.NEXT_PUBLIC_URL}/api/initial-sync`, { 
                accountId: profile.id.toString(), 
                userId 
            }).then((res) => {
                console.log('Callback: Initial sync triggered:', res.data);
            }).catch((err) => {
                console.error('Callback: Failed to trigger initial sync:', err.response?.data);
            })
        );

        return NextResponse.redirect(new URL('/mail', req.url));
    } catch (error) {
        console.error('Callback: Error during authorization:', error);
        return NextResponse.json({ 
            error: "Failed to authorize account",
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}