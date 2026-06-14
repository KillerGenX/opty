"use client"

import { Bell, Search, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function Topbar() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <Input
            type="search"
            placeholder="Search opportunities..."
            className="w-full bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 pl-9 md:w-[300px] lg:w-[400px] rounded-xl focus-visible:ring-emerald-900 dark:focus-visible:ring-emerald-500"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-emerald-900 hover:bg-emerald-50 dark:text-zinc-400 dark:hover:text-emerald-500 dark:hover:bg-zinc-900 rounded-xl">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-600" />
          <span className="sr-only">Notifications</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-500 font-bold text-xs">
            U
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>Log out</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
