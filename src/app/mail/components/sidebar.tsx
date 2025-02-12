'use client'
import React from 'react'
import { Nav } from './nav'
import { ModeToggle } from "@/components/theme-toggle"
import { UserButton } from "@clerk/nextjs"
import ComposeButton from './compose-button'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { buttonVariants } from '@/components/ui/button'

import {
    AlertCircle,
    Archive,
    ArchiveX,
    File,
    Inbox,
    MessagesSquare,
    Send,
    ShoppingCart,
    Trash2,
    Users2,
} from "lucide-react"
import { usePathname } from 'next/navigation'
import { useLocalStorage } from 'usehooks-ts'
import { api } from '@/trpc/react'
type Props = { isCollapsed: boolean }

const SideBar = ({ isCollapsed }: Props) => {
    const [tab] = useLocalStorage("normalhuman-tab", "inbox")
    const [accountId] = useLocalStorage("accountId", "")

    const refetchInterval = 5000
    const { data: inboxThreads } = api.mail.getNumThreads.useQuery({
        accountId,
        tab: "inbox"
    }, { enabled: !!accountId && !!tab, refetchInterval })

    const { data: draftsThreads } = api.mail.getNumThreads.useQuery({
        accountId,
        tab: "drafts"
    }, { enabled: !!accountId && !!tab, refetchInterval })

    const { data: sentThreads } = api.mail.getNumThreads.useQuery({
        accountId,
        tab: "sent"
    }, { enabled: !!accountId && !!tab, refetchInterval })

    return (
        <div className="flex flex-col h-full">
            <Nav
                isCollapsed={isCollapsed}
                links={[
                    {
                        title: "Inbox",
                        label: inboxThreads?.toString() || "0",
                        icon: Inbox,
                        variant: tab === "inbox" ? "default" : "ghost",
                    },
                    {
                        title: "Drafts",
                        label: draftsThreads?.toString() || "0",
                        icon: File,
                        variant: tab === "drafts" ? "default" : "ghost",
                    },
                    {
                        title: "Sent",
                        label: sentThreads?.toString() || "0",
                        icon: Send,
                        variant: tab === "sent" ? "default" : "ghost",
                    },
                ]}
            />
            <div className="flex-1" />
            <div
                data-collapsed={isCollapsed}
                className="group flex flex-col gap-4 py-2 data-[collapsed=true]:py-2"
            >
                <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
                    <div className="flex flex-col gap-1">
                        {isCollapsed ? (
                            <>
                                <UserButton />
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <div className={cn(
                                            buttonVariants({ variant: "ghost", size: "icon" }),
                                            "h-9 w-9 cursor-pointer"
                                        )}>
                                            <ModeToggle iconOnly />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        Toggle theme
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <div className={cn(
                                            buttonVariants({ variant: "ghost", size: "icon" }),
                                            "h-9 w-9 cursor-pointer"
                                        )}>
                                            <ComposeButton iconOnly />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        Compose email
                                    </TooltipContent>
                                </Tooltip>
                            </>
                        ) : (
                            <>
                                <UserButton />
                                <ModeToggle />
                                <ComposeButton />
                            </>
                        )}
                    </div>
                </nav>
            </div>
        </div>
    )
}

export default SideBar