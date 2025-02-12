import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function POST(req: Request) {
    const body = await req.text();
    const signature = headers().get("Stripe-Signature") as string;
    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET as string
        );
    } catch (error) {
        return new NextResponse("webhook error", { status: 400 });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    console.log(event.type)

    // Handle subscription creation
    if (event.type === "checkout.session.completed") {
        // Check if this is a subscription or one-time purchase
        if (session.mode === 'subscription') {
            const subscription = await stripe.subscriptions.retrieve(
                session.subscription as string,
                {
                    expand: ['items.data.price.product'],
                }
            );
            if (!session?.client_reference_id) {
                return new NextResponse("no userid", { status: 400 });
            }
            const plan = subscription.items.data[0]?.price;

            if (!plan) {
                throw new Error('No plan found for this subscription.');
            }

            const productId = (plan.product as Stripe.Product).id;
            const product = await stripe.products.retrieve(productId);
            const monthlyTokens = parseInt(product.metadata.monthly_tokens || '1000');

            if (!productId) {
                throw new Error('No product ID found for this subscription.');
            }

            const stripeSubscription = await db.stripeSubscription.create({
                data: {
                    subscriptionId: subscription.id,
                    productId: productId,
                    priceId: plan.id,
                    customerId: subscription.customer as string,
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    userId: session.client_reference_id,
                    monthlyTokenAllocation: monthlyTokens
                }
            });

            // Create or update token balance
            await db.tokenBalance.upsert({
                where: {
                    userId: session.client_reference_id
                },
                create: {
                    userId: session.client_reference_id,
                    monthlyTokens: monthlyTokens,
                    lastResetDate: new Date()
                },
                update: {
                    monthlyTokens: monthlyTokens,
                    lastResetDate: new Date()
                }
            });
        } else if (session.mode === 'payment') {
            // Handle one-time token purchase
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
            const productId = lineItems.data[0]?.price?.product as string;
            const product = await stripe.products.retrieve(productId);
            const tokenAmount = parseInt(product.metadata.tokens || '0');

            if (tokenAmount > 0) {
                // Record the token purchase
                await db.tokenPurchase.create({
                    data: {
                        userId: session.client_reference_id!,
                        amount: tokenAmount,
                        cost: session.amount_total! / 100, // Convert from cents to dollars
                        stripePaymentId: session.payment_intent as string
                    }
                });

                // Update token balance
                await db.tokenBalance.upsert({
                    where: {
                        userId: session.client_reference_id!
                    },
                    create: {
                        userId: session.client_reference_id!,
                        bonusTokens: tokenAmount
                    },
                    update: {
                        bonusTokens: {
                            increment: tokenAmount
                        }
                    }
                });
            }
        }

        return NextResponse.json({ message: "success" }, { status: 200 });
    }

    // Handle subscription renewal
    if (event.type === "invoice.payment_succeeded") {
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
            {
                expand: ['items.data.price.product'],
            }
        );
        const plan = subscription.items.data[0]?.price;

        if (!plan) {
            throw new Error('No plan found for this subscription.');
        }

        const productId = (plan.product as Stripe.Product).id;
        const product = await stripe.products.retrieve(productId);
        const monthlyTokens = parseInt(product.metadata.monthly_tokens || '1000');

        await db.stripeSubscription.update({
            where: {
                subscriptionId: subscription.id
            },
            data: {
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                productId: productId,
                priceId: plan.id,
                monthlyTokenAllocation: monthlyTokens
            }
        });

        // Reset monthly tokens and keep bonus tokens
        const tokenBalance = await db.tokenBalance.findUnique({
            where: {
                userId: subscription.customer as string
            }
        });

        if (tokenBalance) {
            await db.tokenBalance.update({
                where: {
                    userId: subscription.customer as string
                },
                data: {
                    monthlyTokens: monthlyTokens,
                    usedTokens: 0,
                    lastResetDate: new Date()
                }
            });
        }

        return NextResponse.json({ message: "success" }, { status: 200 });
    }

    if (event.type === 'customer.subscription.updated') {
        console.log('subscription updated', session)
        const subscription = await stripe.subscriptions.retrieve(session.id as string);
        await db.stripeSubscription.update({
            where: {
                subscriptionId: session.id as string
            },
            data: {
                updatedAt: new Date(),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            }
        })
        return NextResponse.json({ message: "success" }, { status: 200 });
    }

    return NextResponse.json({ message: "success" }, { status: 200 });
} 