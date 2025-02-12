import { Configuration, OpenAIApi } from "openai-edge";
import { Message, OpenAIStream, StreamingTextResponse } from "ai";

import { NextResponse } from "next/server";
import { OramaManager } from "@/lib/orama";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { getSubscriptionStatus } from "@/lib/stripe-actions";
import { FREE_CREDITS_PER_DAY, AVG_INPUT_TOKENS_PER_MSG, AVG_OUTPUT_TOKENS_PER_MSG, TOTAL_TOKENS_PER_MSG } from "@/app/constants";

// export const runtime = "edge";

const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

// Estimated tokens per message for GPT-4
const ESTIMATED_TOKENS_PER_MESSAGE = 150;

export async function POST(req: Request) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's token balance
        const tokenBalance = await db.tokenBalance.findUnique({
            where: { userId }
        });

        const isSubscribed = await getSubscriptionStatus();
        
        if (!isSubscribed && !tokenBalance) {
            // Free tier user with no token balance
            const chatbotInteraction = await db.chatbotInteraction.findUnique({
                where: {
                    day: new Date().toDateString(),
                    userId
                }
            });

            if (!chatbotInteraction) {
                await db.chatbotInteraction.create({
                    data: {
                        day: new Date().toDateString(),
                        count: 1,
                        userId
                    }
                });
            } else if (chatbotInteraction.count >= FREE_CREDITS_PER_DAY) {
                return NextResponse.json({ 
                    error: "Free tier message limit reached. Please upgrade to continue.", 
                    type: "LIMIT_REACHED" 
                }, { status: 429 });
            } else {
                await db.chatbotInteraction.update({
                    where: {
                        id: chatbotInteraction.id
                    },
                    data: {
                        count: chatbotInteraction.count + 1
                    }
                });
            }
        } else if (tokenBalance) {
            // Check if user has enough tokens
            const availableTokens = (tokenBalance.monthlyTokens + tokenBalance.bonusTokens) - tokenBalance.usedTokens;
            
            if (availableTokens < TOTAL_TOKENS_PER_MSG) {
                // Check if auto-refill is enabled
                const subscription = await db.stripeSubscription.findUnique({
                    where: { userId }
                });

                if (subscription?.autoRefillEnabled && 
                    availableTokens <= subscription.autoRefillThreshold) {
                    // TODO: Trigger auto-refill purchase
                    // This would be handled by a separate endpoint/function
                    return NextResponse.json({ 
                        error: "Insufficient tokens. Auto-refill in progress.", 
                        type: "AUTO_REFILL_TRIGGERED" 
                    }, { status: 402 });
                }

                return NextResponse.json({ 
                    error: "Insufficient tokens. Please purchase more to continue.", 
                    type: "INSUFFICIENT_TOKENS",
                    availableTokens,
                    requiredTokens: TOTAL_TOKENS_PER_MSG
                }, { status: 402 });
            }

            // Update token usage
            await db.tokenBalance.update({
                where: { userId },
                data: {
                    usedTokens: {
                        increment: TOTAL_TOKENS_PER_MSG
                    }
                }
            });
        }

        const { messages, accountId } = await req.json();
        const oramaManager = new OramaManager(accountId)
        await oramaManager.initialize()

        const lastMessage = messages[messages.length - 1]


        const context = await oramaManager.vectorSearch({ prompt: lastMessage.content })
        console.log(context.hits.length + ' hits found')
        // console.log(context.hits.map(hit => hit.document))

        const prompt = {
            role: "system",
            content: `You are an AI email assistant embedded in an email client app. Your purpose is to help the user compose emails by answering questions, providing suggestions, and offering relevant information based on the context of their previous emails.
            THE TIME NOW IS ${new Date().toLocaleString()}
      
      START CONTEXT BLOCK
      ${context.hits.map((hit) => JSON.stringify(hit.document)).join('\n')}
      END OF CONTEXT BLOCK
      
      When responding, please keep in mind:
      - Be helpful, clever, and articulate.
      - Rely on the provided email context to inform your responses.
      - If the context does not contain enough information to answer a question, politely say you don't have enough information.
      - Avoid apologizing for previous responses. Instead, indicate that you have updated your knowledge based on new information.
      - Do not invent or speculate about anything that is not directly supported by the email context.
      - Keep your responses concise and relevant to the user's questions or the email being composed.`
        };


        const response = await openai.createChatCompletion({
            model: "gpt-4o-mini-2024-07-18",
            messages: [
                prompt,
                ...messages.filter((message: Message) => message.role === "user"),
            ],
            stream: true,
        });
        const stream = OpenAIStream(response, {
            onStart: async () => {
            },
            onCompletion: async (completion) => {
                const today = new Date().toDateString()
                await db.chatbotInteraction.update({
                    where: {
                        userId,
                        day: today
                    },
                    data: {
                        count: {
                            increment: 1
                        }
                    }
                })
            },
        });
        return new StreamingTextResponse(stream);
    } catch (error) {
        console.error('Error in chat route:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
