'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { createCheckoutSession } from '@/lib/stripe-actions'
import { api } from '@/trpc/react'
import { TOKEN_PACK_PRICES, TOTAL_TOKENS_PER_MSG } from '@/app/constants'

interface TokenBalance {
    monthlyTokens: number
    bonusTokens: number
    usedTokens: number
}

const TokenUsagePanel = () => {
    const [isLoading, setIsLoading] = useState(false)
    const { data: tokenBalance, refetch } = api.user.getTokenBalance.useQuery()
    
    const totalTokens = (tokenBalance?.monthlyTokens || 0) + (tokenBalance?.bonusTokens || 0)
    const usedTokens = tokenBalance?.usedTokens || 0
    const remainingTokens = totalTokens - usedTokens
    const usagePercentage = totalTokens > 0 ? (usedTokens / totalTokens) * 100 : 0
    const estimatedMessages = Math.floor(remainingTokens / TOTAL_TOKENS_PER_MSG)

    const handlePurchaseTokens = async (amount: number) => {
        setIsLoading(true)
        try {
            await createCheckoutSession('token_purchase', amount)
        } catch (error) {
            console.error('Error purchasing tokens:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="bg-gray-900 p-4 rounded-lg border">
            <h2 className="text-white text-xl font-semibold mb-4">Token Usage</h2>
            
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                        <span>{remainingTokens.toLocaleString()} tokens remaining</span>
                        <span>~{estimatedMessages} messages remaining</span>
                    </div>
                    <Progress value={usagePercentage} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 p-3 rounded-lg">
                        <p className="text-gray-400 text-sm">Monthly Tokens</p>
                        <p className="text-white text-lg font-semibold">{tokenBalance?.monthlyTokens?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                        <p className="text-gray-400 text-sm">Bonus Tokens</p>
                        <p className="text-white text-lg font-semibold">{tokenBalance?.bonusTokens?.toLocaleString() || 0}</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-white font-semibold">Purchase More Tokens</h3>
                    <div className="grid grid-cols-3 gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => handlePurchaseTokens(TOKEN_PACK_PRICES.SMALL.tokens)}
                            disabled={isLoading}
                            className="flex flex-col items-center"
                        >
                            <span>{(TOKEN_PACK_PRICES.SMALL.tokens / 1000).toLocaleString()}k</span>
                            <span className="text-sm text-gray-400">${TOKEN_PACK_PRICES.SMALL.price}</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => handlePurchaseTokens(TOKEN_PACK_PRICES.MEDIUM.tokens)}
                            disabled={isLoading}
                            className="flex flex-col items-center"
                        >
                            <span>{(TOKEN_PACK_PRICES.MEDIUM.tokens / 1000).toLocaleString()}k</span>
                            <span className="text-sm text-gray-400">${TOKEN_PACK_PRICES.MEDIUM.price}</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => handlePurchaseTokens(TOKEN_PACK_PRICES.LARGE.tokens)}
                            disabled={isLoading}
                            className="flex flex-col items-center"
                        >
                            <span>{(TOKEN_PACK_PRICES.LARGE.tokens / 1000).toLocaleString()}k</span>
                            <span className="text-sm text-gray-400">${TOKEN_PACK_PRICES.LARGE.price}</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TokenUsagePanel 