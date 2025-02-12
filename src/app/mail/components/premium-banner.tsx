'use client'
import { motion } from 'framer-motion'
import React from 'react'
import StripeButton from './stripe-button'
import { api } from '@/trpc/react'
import { FREE_CREDITS_PER_DAY } from '@/app/constants'
import { getSubscriptionStatus } from '@/lib/stripe-actions'

const PremiumBanner = () => {
    const [isSubscribed, setIsSubscribed] = React.useState(false)
    React.useEffect(() => {
        (async () => {
            const subscriptionStatus = await getSubscriptionStatus()
            setIsSubscribed(subscriptionStatus)
        })()
    }, [])

    const { data: chatbotInteraction } = api.mail.getChatbotInteraction.useQuery()
    const remainingCredits = chatbotInteraction?.remainingCredits || 0

    if (isSubscribed) return (
        <motion.div layout className="bg-gray-900 relative p-4 rounded-lg border overflow-hidden flex flex-col md:flex-row gap-4">
            <div className="flex-1">
                <h1 className='text-white text-xl font-semibold'>Premium Plan</h1>
                <div className="h-2"></div>
                <p className='text-gray-400 text-sm'>Ask as many questions as you want</p>
                <div className="h-4"></div>
                <StripeButton />
            </div>
            <div className="md:w-[180px] flex-shrink-0">
                <img src='/bot.webp' className='h-[180px] w-auto object-contain' />
            </div>
        </motion.div>
    )

    return (
        <motion.div layout className="bg-gray-900 relative p-4 rounded-lg border overflow-hidden flex flex-col md:flex-row gap-4">
            <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <h1 className='text-white text-xl font-semibold'>Basic Plan</h1>
                    <p className='text-gray-400 text-sm'>{remainingCredits} / {FREE_CREDITS_PER_DAY} messages remaining</p>
                </div>
                <div className="h-4"></div>
                <p className='text-gray-400 text-sm'>Upgrade to pro to ask as many questions as you want</p>
                <div className="h-4"></div>
                <StripeButton />
            </div>
            <div className="md:w-[180px] flex-shrink-0">
                <img src='/bot.webp' className='h-[180px] w-auto object-contain' />
            </div>
        </motion.div>
    )
}

export default PremiumBanner