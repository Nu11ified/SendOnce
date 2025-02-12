'use server'

import { auth } from "@clerk/nextjs/server";
import { stripe } from "./stripe";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { ADDITIONAL_ACCOUNT_PRICE } from "@/app/constants";

export async function createCheckoutSession(
    mode: 'subscription' | 'token_purchase' = 'subscription',
    tokenAmount?: number,
    additionalAccounts: number = 0
) {
    const { userId } = await auth();

    if (!userId) {
        throw new Error('User not found');
    }

    let sessionConfig: any = {
        payment_method_types: ['card'],
        success_url: `${process.env.NEXT_PUBLIC_URL}/mail`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
        client_reference_id: userId.toString(),
    };

    if (mode === 'subscription') {
        const lineItems = [
            {
                price: process.env.STRIPE_PRICE_ID,
                quantity: 1,
            }
        ];

        // Add additional accounts if requested
        if (additionalAccounts > 0) {
            lineItems.push({
                price: process.env.STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID,
                quantity: additionalAccounts,
            });
        }

        sessionConfig = {
            ...sessionConfig,
            mode: 'subscription',
            line_items: lineItems,
            subscription_data: {
                metadata: {
                    additionalAccounts
                }
            }
        };
    } else if (mode === 'token_purchase' && tokenAmount) {
        // Get the appropriate price ID based on token amount
        let priceId;
        switch (tokenAmount) {
            case 500_000:
                priceId = process.env.STRIPE_TOKEN_500_PRICE_ID;
                break;
            case 1_500_000:
                priceId = process.env.STRIPE_TOKEN_1000_PRICE_ID;
                break;
            case 5_000_000:
                priceId = process.env.STRIPE_TOKEN_2500_PRICE_ID;
                break;
            default:
                throw new Error('Invalid token amount');
        }

        sessionConfig = {
            ...sessionConfig,
            mode: 'payment',
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
        };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    redirect(session.url!);
}

export async function createBillingPortalSession() {
    const { userId } = await auth();
    if (!userId) {
        return false
    }
    const subscription = await db.stripeSubscription.findUnique({
        where: { userId: userId },
    });
    if (!subscription?.customerId) {
        throw new Error('Subscription not found');
    }
    const session = await stripe.billingPortal.sessions.create({
        customer: subscription.customerId,
        return_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
    });
    redirect(session.url!)
}

export async function getSubscriptionStatus() {
    const { userId } = await auth();
    if (!userId) {
        return false
    }
    const subscription = await db.stripeSubscription.findUnique({
        where: { userId: userId },
    });
    if (!subscription) {
        return false;
    }
    return subscription.currentPeriodEnd > new Date();
}

export async function updateAutoRefillSettings(enabled: boolean, threshold: number, amount: number) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error('User not found');
    }

    await db.stripeSubscription.update({
        where: { userId },
        data: {
            autoRefillEnabled: enabled,
            autoRefillThreshold: threshold,
            autoRefillAmount: amount
        }
    });
}

