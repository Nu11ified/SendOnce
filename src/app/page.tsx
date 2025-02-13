import React from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/theme-toggle"
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'

const LandingPage = async () => {
    const { userId } = auth()
    if (userId) {
        return redirect('/mail')
    }
    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 relative overflow-hidden">
            {/* Grid Background */}
            <div className="absolute z-[1] bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f1a_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f1a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)]">
            </div>

            {/* Gradient Orbs */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob dark:mix-blend-normal dark:opacity-20"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000 dark:mix-blend-normal dark:opacity-20"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000 dark:mix-blend-normal dark:opacity-20"></div>

            <div className="relative z-10">
                <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md dark:bg-gray-950/80 border-b border-gray-200 dark:border-gray-800">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center gap-2">
                                <Image 
                                    src="/sendonce.svg" 
                                    alt="SendOnce Logo" 
                                    width={32} 
                                    height={32} 
                                    className="w-8 h-8"
                                />
                                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">SendOnce</span>
                            </div>
                            <div className="flex items-center space-x-4">
                                <Link href="/sign-in" className="text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition">Sign In</Link>
                                <Link href="/sign-up" className="text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition">Sign Up</Link>
                                <ModeToggle />
                            </div>
                        </div>
                    </div>
                </nav>

                <main className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center">
                            <h1 className="text-4xl sm:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-300 dark:to-white leading-tight">
                                The minimalistic, <br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400">
                                    AI-powered
                                </span> email client.
                            </h1>
                            <p className="mt-6 text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                                SendOnce is a minimalistic, AI-powered email client that empowers you to manage your email with ease.
                            </p>
                            <div className="mt-10 flex justify-center gap-4">
                                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 dark:from-purple-500 dark:to-pink-500">
                                    <Link href="/mail">Get Started</Link>
                                </Button>
                                <Link href='https://sendonce.org/privacy'>
                                    <Button size="lg" variant="outline" className="shadow-lg hover:shadow-xl transition-all duration-200">
                                        Learn More
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className="mt-24">
                            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">Experience the power of</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-8 transform hover:scale-105 transition-all duration-200">
                                    <div className="h-12 w-12 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center mb-6">
                                        <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">AI-driven email RAG</h3>
                                    <p className="text-gray-600 dark:text-gray-300">Automatically prioritize your emails with our advanced AI system.</p>
                                </div>
                                <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-8 transform hover:scale-105 transition-all duration-200">
                                    <div className="h-12 w-12 rounded-lg bg-pink-500/10 dark:bg-pink-500/20 flex items-center justify-center mb-6">
                                        <svg className="h-6 w-6 text-pink-600 dark:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Full-text search</h3>
                                    <p className="text-gray-600 dark:text-gray-300">Quickly find any email with our powerful search functionality.</p>
                                </div>
                                <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-8 transform hover:scale-105 transition-all duration-200">
                                    <div className="h-12 w-12 rounded-lg bg-yellow-500/10 dark:bg-yellow-500/20 flex items-center justify-center mb-6">
                                        <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Shortcut-focused interface</h3>
                                    <p className="text-gray-600 dark:text-gray-300">Navigate your inbox efficiently with our intuitive keyboard shortcuts.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-24 relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl filter blur-3xl"></div>
                            <Image 
                                src='/demo.png' 
                                alt='SendOnce Demo' 
                                width={1000} 
                                height={1000} 
                                className='relative rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl hover:shadow-3xl transition-all duration-500 w-full h-auto'
                            />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}

export default LandingPage