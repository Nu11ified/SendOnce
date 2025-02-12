import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import Account from "@/lib/account";

// Constants for rate limiting
const RESYNC_COOLDOWN_HOURS = 24; // One resync per 24 hours
const MAX_RESYNC_PER_DAY = 1;

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { accountId } = await req.json();
        if (!accountId) {
            return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
        }

        // Get account and verify ownership
        const account = await db.account.findUnique({
            where: {
                id: accountId,
                userId,
            },
        });

        if (!account) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        // Check rate limiting
        if (account.lastResyncAt) {
            const hoursSinceLastResync = Math.floor(
                (Date.now() - account.lastResyncAt.getTime()) / (1000 * 60 * 60)
            );

            if (hoursSinceLastResync < RESYNC_COOLDOWN_HOURS) {
                const hoursRemaining = RESYNC_COOLDOWN_HOURS - hoursSinceLastResync;
                return NextResponse.json({
                    error: `Please wait ${hoursRemaining} hours before resyncing again`,
                    hoursRemaining,
                }, { status: 429 });
            }

            // Reset resync count if it's been more than 24 hours
            if (hoursSinceLastResync >= 24) {
                await db.account.update({
                    where: { id: accountId },
                    data: { resyncCount: 0 }
                });
            }
        }

        // Check daily limit
        if (account.resyncCount >= MAX_RESYNC_PER_DAY) {
            return NextResponse.json({
                error: "Daily resync limit reached. Please try again tomorrow.",
            }, { status: 429 });
        }

        // Perform the resync
        const accountInstance = new Account(account.token);
        const syncResult = await accountInstance.performInitialSync();

        // Update resync tracking
        await db.account.update({
            where: { id: accountId },
            data: {
                lastResyncAt: new Date(),
                resyncCount: {
                    increment: 1
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: "Resync initiated successfully",
            processedEmails: syncResult.processedEmails,
            hasMoreEmails: syncResult.hasMoreEmails,
            deltaToken: syncResult.deltaToken
        });

    } catch (error) {
        console.error('Error in resync:', error);
        return NextResponse.json({
            error: "Failed to resync account",
        }, { status: 500 });
    }
} 