'use client'
import { useChat } from 'ai/react'
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button'
import { AnimatePresence } from 'framer-motion';
import React from 'react'
import { Send } from 'lucide-react';
import { useLocalStorage } from 'usehooks-ts';
import { cn } from '@/lib/utils';
import { SparklesIcon } from '@heroicons/react/24/solid';
import StripeButton from './stripe-button';
import PremiumBanner from './premium-banner';
import { toast } from 'sonner';


const transitionDebug = {
    type: "easeOut",
    duration: 0.2,
};
const AskAI = ({ isCollapsed }: { isCollapsed: boolean }) => {
    const [accountId] = useLocalStorage('accountId', '')
    const { input, handleInputChange, handleSubmit, messages } = useChat({
        api: "/api/chat",
        body: {
            accountId,
        },
        onError: (error) => {
            if (error.message.includes('Limit reached')) {
                toast.error('You have reached the limit for today. Please upgrade to pro to ask as many questions as you want')
            }
        },
        initialMessages: [],
    });
    React.useEffect(() => {
        const messageContainer = document.getElementById("message-container");
        if (messageContainer) {
            messageContainer.scrollTo({
                top: messageContainer.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages]);


    if (isCollapsed) return null;
    return (
        <div className='p-4 mb-14'>
            <PremiumBanner />
            <div className="h-4"></div>
            <motion.div className="flex flex-1 flex-col items-end justify-end pb-4 border p-4 rounded-lg bg-gray-100 shadow-inner dark:bg-gray-900">
                <div className="max-h-[50vh] overflow-y-auto w-full flex flex-col gap-2" id='message-container'>
                    <AnimatePresence mode="wait">
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                layout="position"
                                className={cn("z-10 mt-2 max-w-[80%] break-words rounded-2xl bg-gray-200 dark:bg-gray-800", {
                                    'self-end text-gray-900 dark:text-gray-100': message.role === 'user',
                                    'self-start bg-blue-500 text-white': message.role === 'assistant',
                                })}
                                layoutId={`container-[${messages.length - 1}]`}
                                transition={transitionDebug}
                            >
                                <div className="px-3 py-2 text-[15px] leading-normal">
                                    {message.content}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                {messages.length > 0 && <div className="h-4"></div>}
                <div className="w-full">
                    {messages.length === 0 && <div className="mb-4">
                        <div className='flex items-center gap-4 flex-wrap'>
                            <SparklesIcon className='size-6 text-gray-500 flex-shrink-0' />
                            <div className="min-w-0">
                                <p className='text-gray-900 dark:text-gray-100 truncate'>Ask AI anything about your emails</p>
                                <p className='text-gray-500 text-xs dark:text-gray-400 truncate'>Get answers to your questions about your emails</p>
                            </div>
                        </div>
                        <div className="h-2"></div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span onClick={() => handleInputChange({ 
                                target: { 
                                    value: 'What can I ask?',
                                    addEventListener: () => {},
                                    dispatchEvent: () => false,
                                    removeEventListener: () => {}
                                },
                                nativeEvent: new Event('click'),
                                currentTarget: null,
                                bubbles: true,
                                cancelable: true,
                                defaultPrevented: false,
                                eventPhase: 0,
                                isTrusted: true,
                                preventDefault: () => {},
                                isDefaultPrevented: () => false,
                                stopPropagation: () => {},
                                isPropagationStopped: () => false,
                                persist: () => {},
                                timeStamp: 0,
                                type: 'change'
                            } as unknown as React.ChangeEvent<HTMLInputElement>)} className='px-2 py-1 bg-gray-800 text-gray-200 rounded-md text-xs cursor-pointer hover:bg-gray-700'>What can I ask?</span>
                            <span onClick={() => handleInputChange({ 
                                target: { 
                                    value: 'When is my next flight?',
                                    addEventListener: () => {},
                                    dispatchEvent: () => false,
                                    removeEventListener: () => {}
                                },
                                nativeEvent: new Event('click'),
                                currentTarget: null,
                                bubbles: true,
                                cancelable: true,
                                defaultPrevented: false,
                                eventPhase: 0,
                                isTrusted: true,
                                preventDefault: () => {},
                                isDefaultPrevented: () => false,
                                stopPropagation: () => {},
                                isPropagationStopped: () => false,
                                persist: () => {},
                                timeStamp: 0,
                                type: 'change'
                            } as unknown as React.ChangeEvent<HTMLInputElement>)} className='px-2 py-1 bg-gray-800 text-gray-200 rounded-md text-xs cursor-pointer hover:bg-gray-700'>When is my next flight?</span>
                            <span onClick={() => handleInputChange({ 
                                target: { 
                                    value: 'When is my next meeting?',
                                    addEventListener: () => {},
                                    dispatchEvent: () => false,
                                    removeEventListener: () => {}
                                },
                                nativeEvent: new Event('click'),
                                currentTarget: null,
                                bubbles: true,
                                cancelable: true,
                                defaultPrevented: false,
                                eventPhase: 0,
                                isTrusted: true,
                                preventDefault: () => {},
                                isDefaultPrevented: () => false,
                                stopPropagation: () => {},
                                isPropagationStopped: () => false,
                                persist: () => {},
                                timeStamp: 0,
                                type: 'change'
                            } as unknown as React.ChangeEvent<HTMLInputElement>)} className='px-2 py-1 bg-gray-800 text-gray-200 rounded-md text-xs cursor-pointer hover:bg-gray-700'>When is my next meeting?</span>
                        </div>
                    </div>
                    }
                    <form onSubmit={handleSubmit} className="flex w-full relative">
                        <input
                            type="text"
                            onChange={handleInputChange}
                            value={input}
                            className="py-2 h-9 placeholder:text-[13px] w-full rounded-full border border-gray-200 bg-white px-3 text-[15px] outline-none placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-blue-500/20 focus-visible:ring-offset-1
            dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus-visible:ring-blue-500/20 dark:focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-700"
                            placeholder="Ask AI anything about your emails"
                        />
                        <button
                            type="submit"
                            className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800"
                        >
                            <Send className="size-4 text-gray-500 dark:text-gray-300" />
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}

export default AskAI