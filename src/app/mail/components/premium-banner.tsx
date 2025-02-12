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
        <motion.div layout className="bg-gray-900 relative p-2 sm:p-4 rounded-lg border overflow-hidden flex flex-col md:flex-row gap-2 min-w-0">
            <img src='/bot.webp' className='md:absolute md:-bottom-6 md:-right-10 h-[120px] md:h-[180px] w-auto pointer-events-none object-contain' />
            <div className='relative z-10 min-w-0'>
                <h1 className='text-white text-lg sm:text-xl font-semibold truncate'>Premium Plan</h1>
                <div className="h-2"></div>
                <p className='text-gray-400 text-sm md:max-w-[calc(100%-70px)] truncate'>Ask as many questions as you want</p>
                <div className="h-4"></div>
                <StripeButton />
            </div>
        </motion.div>
    )

    return (
        <motion.div layout className="bg-gray-900 relative p-2 sm:p-4 rounded-lg border overflow-hidden flex flex-col md:flex-row gap-2 min-w-0">
            <img src='/bot.webp' className='md:absolute md:-bottom-6 md:-right-10 h-[120px] md:h-[180px] w-auto pointer-events-none object-contain' />
            <div className='relative z-10 min-w-0'>
                <div className="flex items-center gap-2 flex-wrap">
                    <h1 className='text-white text-lg sm:text-xl font-semibold truncate'>Basic Plan</h1>
                    <p className='text-gray-400 text-sm truncate'>{remainingCredits} / {FREE_CREDITS_PER_DAY} messages</p>
                </div>
                <div className="h-4"></div>
                <p className='text-gray-400 text-sm truncate'>Upgrade to pro to ask as many questions as you want</p>
                <div className="h-4"></div>
                <StripeButton />
            </div>
        </motion.div>
    )
}

export default PremiumBanner