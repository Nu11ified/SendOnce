'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { createCheckoutSession } from "@/lib/stripe-actions";
import { useState } from "react";
import { motion } from "framer-motion";
import { TOKEN_PACK_PRICES, FREE_CREDITS_PER_DAY, FREE_ACCOUNTS_PER_USER, PRO_ACCOUNTS_PER_USER, MONTHLY_PRO_TOKENS } from "@/app/constants";

export default function PricingPage() {
    const [isLoading, setIsLoading] = useState(false);

    const handleSubscribe = async () => {
        setIsLoading(true);
        try {
            await createCheckoutSession('subscription');
        } catch (error) {
            console.error('Error creating checkout session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePurchaseTokens = async (amount: number) => {
        setIsLoading(true);
        try {
            await createCheckoutSession('token_purchase', amount);
        } catch (error) {
            console.error('Error purchasing tokens:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 py-20">
            <div className="container px-4 mx-auto">
                {/* Header */}
                <div className="text-center mb-20">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Simple, transparent pricing
                    </h1>
                    <p className="text-xl text-gray-400">
                        Choose the plan that's right for you
                    </p>
                </div>

                {/* Main Plans */}
                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
                    {/* Free Plan */}
                    <Card className="p-8 bg-gray-800 border-gray-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-gray-700 text-white px-3 py-1 text-sm rounded-bl">
                            FREE
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-4">Basic Plan</h3>
                        <div className="mb-6">
                            <span className="text-4xl font-bold text-white">$0</span>
                            <span className="text-gray-400 ml-2">/ month</span>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center text-gray-300">
                                <Check className="h-5 w-5 text-green-500 mr-2" />
                                <span>{FREE_CREDITS_PER_DAY} AI messages per day</span>
                            </li>
                            <li className="flex items-center text-gray-300">
                                <Check className="h-5 w-5 text-green-500 mr-2" />
                                <span>{FREE_ACCOUNTS_PER_USER} email account</span>
                            </li>
                            <li className="flex items-center text-gray-300">
                                <Check className="h-5 w-5 text-green-500 mr-2" />
                                <span>Basic email features</span>
                            </li>
                        </ul>
                        <Button className="w-full" variant="outline">
                            Get Started
                        </Button>
                    </Card>

                    {/* Pro Plan */}
                    <Card className="p-8 bg-gray-800 border-gray-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 text-sm rounded-bl">
                            PRO
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-4">Pro Plan</h3>
                        <div className="mb-6">
                            <span className="text-4xl font-bold text-white">$10</span>
                            <span className="text-gray-400 ml-2">/ month</span>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center text-gray-300">
                                <Check className="h-5 w-5 text-green-500 mr-2" />
                                <span>{(MONTHLY_PRO_TOKENS / 1000).toLocaleString()}k tokens per month</span>
                            </li>
                            <li className="flex items-center text-gray-300">
                                <Check className="h-5 w-5 text-green-500 mr-2" />
                                <span>Up to {PRO_ACCOUNTS_PER_USER} email accounts</span>
                            </li>
                            <li className="flex items-center text-gray-300">
                                <Check className="h-5 w-5 text-green-500 mr-2" />
                                <span>Priority support</span>
                            </li>
                            <li className="flex items-center text-gray-300">
                                <Check className="h-5 w-5 text-green-500 mr-2" />
                                <span>Advanced AI features</span>
                            </li>
                            <li className="flex items-center text-gray-300">
                                <Check className="h-5 w-5 text-green-500 mr-2" />
                                <span>Add more accounts ($5/each)</span>
                            </li>
                        </ul>
                        <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700" 
                            onClick={handleSubscribe}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Processing...' : 'Subscribe Now'}
                        </Button>
                    </Card>
                </div>

                {/* Token Packs */}
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">
                        Need more tokens?
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Small Pack */}
                        <motion.div 
                            whileHover={{ scale: 1.02 }}
                            className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                        >
                            <h3 className="text-xl font-bold text-white mb-4">Small Pack</h3>
                            <div className="mb-4">
                                <span className="text-3xl font-bold text-white">${TOKEN_PACK_PRICES.SMALL.price}</span>
                            </div>
                            <p className="text-gray-400 mb-6">
                                {(TOKEN_PACK_PRICES.SMALL.tokens / 1000).toLocaleString()}k tokens
                            </p>
                            <Button 
                                className="w-full" 
                                variant="outline"
                                onClick={() => handlePurchaseTokens(TOKEN_PACK_PRICES.SMALL.tokens)}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Processing...' : 'Purchase'}
                            </Button>
                        </motion.div>

                        {/* Medium Pack */}
                        <motion.div 
                            whileHover={{ scale: 1.02 }}
                            className="bg-gray-800 rounded-lg p-6 border border-gray-700 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 bg-green-600 text-white px-3 py-1 text-sm rounded-bl">
                                SAVE 20%
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4">Medium Pack</h3>
                            <div className="mb-4">
                                <span className="text-3xl font-bold text-white">${TOKEN_PACK_PRICES.MEDIUM.price}</span>
                            </div>
                            <p className="text-gray-400 mb-6">
                                {(TOKEN_PACK_PRICES.MEDIUM.tokens / 1000).toLocaleString()}k tokens
                            </p>
                            <Button 
                                className="w-full" 
                                variant="outline"
                                onClick={() => handlePurchaseTokens(TOKEN_PACK_PRICES.MEDIUM.tokens)}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Processing...' : 'Purchase'}
                            </Button>
                        </motion.div>

                        {/* Large Pack */}
                        <motion.div 
                            whileHover={{ scale: 1.02 }}
                            className="bg-gray-800 rounded-lg p-6 border border-gray-700 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 bg-green-600 text-white px-3 py-1 text-sm rounded-bl">
                                SAVE 30%
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4">Large Pack</h3>
                            <div className="mb-4">
                                <span className="text-3xl font-bold text-white">${TOKEN_PACK_PRICES.LARGE.price}</span>
                            </div>
                            <p className="text-gray-400 mb-6">
                                {(TOKEN_PACK_PRICES.LARGE.tokens / 1000).toLocaleString()}k tokens
                            </p>
                            <Button 
                                className="w-full" 
                                variant="outline"
                                onClick={() => handlePurchaseTokens(TOKEN_PACK_PRICES.LARGE.tokens)}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Processing...' : 'Purchase'}
                            </Button>
                        </motion.div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="max-w-3xl mx-auto mt-20">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">
                        Frequently Asked Questions
                    </h2>
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-semibold text-white mb-2">What are tokens?</h3>
                            <p className="text-gray-400">
                                Tokens are used for AI-powered features like email analysis, suggestions, and chat. Each interaction uses a certain number of tokens based on the length and complexity of the text.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white mb-2">Can I upgrade or downgrade anytime?</h3>
                            <p className="text-gray-400">
                                Yes, you can upgrade to Pro or cancel your subscription at any time. Unused tokens from token packs never expire.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white mb-2">What happens if I run out of tokens?</h3>
                            <p className="text-gray-400">
                                You can purchase additional token packs at any time. Pro subscribers also get their tokens refreshed monthly.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 