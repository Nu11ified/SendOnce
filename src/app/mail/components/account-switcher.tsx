"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/trpc/react"
import { useLocalStorage } from "usehooks-ts"
import { Plus, Unlink } from "lucide-react"
import { getAurinkoAuthorizationUrl } from "@/lib/aurinko"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface AccountSwitcherProps {
  isCollapsed: boolean
}

export function AccountSwitcher({
  isCollapsed
}: AccountSwitcherProps) {
  const { data: accounts } = api.mail.getAccounts.useQuery()
  const [accountId, setAccountId] = useLocalStorage('accountId', '')
  const [unlinkDialogOpen, setUnlinkDialogOpen] = React.useState(false)
  const [accountToUnlink, setAccountToUnlink] = React.useState<string | null>(null)
  
  const unlinkAccount = api.mail.unlinkAccount.useMutation({
    onSuccess: () => {
      toast.success("Account unlinked successfully")
      setUnlinkDialogOpen(false)
      setAccountToUnlink(null)
      // If the unlinked account was the current account, switch to another one
      if (accountId === accountToUnlink && accounts && accounts.length > 1) {
        const newAccount = accounts.find(acc => acc.id !== accountToUnlink)
        if (newAccount) {
          setAccountId(newAccount.id)
        }
      }
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const handleUnlink = (accountId: string) => {
    setAccountToUnlink(accountId)
    setUnlinkDialogOpen(true)
  }

  const confirmUnlink = () => {
    if (accountToUnlink) {
      unlinkAccount.mutate({ accountId: accountToUnlink })
    }
  }

  React.useEffect(() => {
    if (accounts && accounts.length > 0) {
      if (accountId) return
      setAccountId(accounts[0]!.id)
    } else if (accounts && accounts.length === 0) {
      toast('Link an account to continue', {
        action: {
          label: 'Add account',
          onClick: async () => {
            try {
              const url = await getAurinkoAuthorizationUrl('Google')
              window.location.href = url
            } catch (error) {
              toast.error((error as Error).message)
            }
          }
        },
      })
    }
  }, [accounts])

  if (!accounts) return <></>
  return (
    <>
      <div className="items-center gap-2 flex w-full">
        <Select defaultValue={accountId} onValueChange={setAccountId}>
          <SelectTrigger
            className={cn(
              "flex w-full flex-1 items-center gap-2 [&>span]:line-clamp-1 [&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-1 [&>span]:truncate [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
              isCollapsed &&
              "flex h-9 w-9 shrink-0 items-center justify-center p-0 [&>span]:w-auto [&>svg]:hidden"
            )}
            aria-label="Select account"
          >
            <SelectValue placeholder="Select an account">
              <span className={cn({ "hidden": !isCollapsed })}>
                {
                  accounts.find((account) => account.id === accountId)?.emailAddress[0]
                }
              </span>
              <span className={cn("ml-2", isCollapsed && "hidden")}>
                {
                  accounts.find((account) => account.id === accountId)
                    ?.emailAddress
                }
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between group">
                <SelectItem value={account.id}>
                  <div className="flex items-center gap-3 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 [&_svg]:text-foreground">
                    {account.emailAddress}
                  </div>
                </SelectItem>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleUnlink(account.id)
                  }}
                >
                  <Unlink className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div onClick={async (e) => {
              try {
                const url = await getAurinkoAuthorizationUrl('Google')
                window.location.href = url
              } catch (error) {
                toast.error((error as Error).message)
              }
            }} className="relative flex hover:bg-gray-50 dark:hover:bg-gray-800 w-full cursor-pointer items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
              <Plus className="size-4 mr-1" />
              Add account
            </div>
          </SelectContent>
        </Select>
      </div>

      <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink this account? This will remove all emails and data associated with this account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnlink} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
