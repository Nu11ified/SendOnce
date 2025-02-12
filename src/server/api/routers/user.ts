import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const userRouter = createTRPCRouter({
    getTokenBalance: protectedProcedure
        .query(async ({ ctx }) => {
            const tokenBalance = await ctx.db.tokenBalance.findUnique({
                where: { userId: ctx.auth.userId }
            });

            return tokenBalance || {
                monthlyTokens: 0,
                bonusTokens: 0,
                usedTokens: 0
            };
        }),

    updateAutoRefill: protectedProcedure
        .input(z.object({
            enabled: z.boolean(),
            threshold: z.number(),
            amount: z.number()
        }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.db.stripeSubscription.update({
                where: { userId: ctx.auth.userId },
                data: {
                    autoRefillEnabled: input.enabled,
                    autoRefillThreshold: input.threshold,
                    autoRefillAmount: input.amount
                }
            });
        })
}); 