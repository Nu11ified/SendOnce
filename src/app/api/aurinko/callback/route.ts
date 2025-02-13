import { getAccountDetails, getAurinkoToken } from "@/lib/aurinko";
import { waitUntil } from '@vercel/functions'
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import axios from "axios";
import { type NextRequest, NextResponse } from "next/server";
import Account from "@/lib/account";

export const GET = async (req: NextRequest) => {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const params = req.nextUrl.searchParams
    const status = params.get('status');
    if (status !== 'success') return NextResponse.json({ error: "Account connection failed" }, { status: 400 });

    const code = params.get('code');
    const token = await getAurinkoToken(code as string)
    if (!token) return NextResponse.json({ error: "Failed to fetch token" }, { status: 400 });
    const accountDetails = await getAccountDetails(token.accessToken)
    
    const account = new Account(token.accessToken);
    const profile = await account.getProfile();
    console.log('Received profile from Aurinko:', profile);

    // Store token as JSON object with both access token and account ID
    const tokenObject = {
        accessToken: token.accessToken,
        accountId: profile.id
    };

    console.log('Callback: Creating/updating account with:', {
        id: profile.id.toString(),
        provider: 'aurinko',
        emailAddress: profile.email,
        tokenPreview: JSON.stringify(tokenObject).substring(0, 100) + '...'
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

    console.log('Stored account in database:', dbAccount);

    waitUntil(
        axios.post(`${process.env.NEXT_PUBLIC_URL}/api/initial-sync`, { accountId: profile.id.toString(), userId }).then((res) => {
            console.log(res.data)
        }).catch((err) => {
            console.log(err.response.data)
        })
    )

    return NextResponse.redirect(new URL('/mail', req.url))
}