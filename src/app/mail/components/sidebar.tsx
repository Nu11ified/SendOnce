'use client'
import React from 'react'
import { Nav } from './nav'
import { useTheme } from 'next-themes'
import {
    AlertCircle,
    Archive,
    ArchiveX,
    File,
    Inbox,
    MessagesSquare,
    Moon,
    Pencil,
    Send,
    ShoppingCart,
    Sun,
    Trash2,
    Users2,
} from "lucide-react"
import { usePathname } from 'next/navigation'
import { useLocalStorage } from 'usehooks-ts'
import { api } from '@/trpc/react'
import ComposeButton from './compose-button'
type Props = { isCollapsed: boolean }

const SideBar = ({ isCollapsed }: Props) => {
    const [tab] = useLocalStorage("normalhuman-tab", "inbox")
    const [accountId] = useLocalStorage("accountId", "")
    const { theme, setTheme } = useTheme()

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
            <Nav
                isCollapsed={isCollapsed}
                links={[
                    {
                        title: "Compose",
                        icon: Pencil,
                        variant: "ghost",
                        onClick: () => document.querySelector<HTMLButtonElement>('[data-compose-trigger]')?.click(),
                    },
                    {
                        title: theme === 'dark' ? 'Light Mode' : 'Dark Mode',
                        icon: theme === 'dark' ? Sun : Moon,
                        variant: "ghost",
                        onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
                    },
                ]}
            />
            <div className="hidden">
                <ComposeButton />
            </div>
        </div>
    )
}

export default SideBar