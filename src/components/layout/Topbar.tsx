"use client"

import { useState, useEffect } from "react"
import { Bell, Search, Plus, Loader2 } from "lucide-react"
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
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { GlobalSearch } from "./GlobalSearch"

export function Topbar() {
  const router = useRouter()
  const supabase = createClient()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUserEmail(data.user.email || null)
      }
    }
    fetchUser()
  }, [supabase])

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsSigningOut(true)
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : "U"

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-sm" onClick={() => setSearchOpen(true)}>
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <Input
            type="search"
            placeholder="Search opportunities (Ctrl+K)..."
            className="w-full bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 pl-9 md:w-[300px] lg:w-[400px] rounded-xl focus-visible:ring-emerald-900 dark:focus-visible:ring-emerald-500 cursor-text"
            readOnly
          />
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button 
          variant="default" 
          size="sm" 
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 hidden md:flex items-center gap-1.5"
          onClick={() => router.push('/opportunities/new')}
        >
          <Plus className="h-4 w-4" />
          <span>Quick Add</span>
        </Button>
        
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-emerald-900 hover:bg-emerald-50 dark:text-zinc-400 dark:hover:text-emerald-500 dark:hover:bg-zinc-900 rounded-xl ml-1">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-600" />
          <span className="sr-only">Notifications</span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-500 font-bold text-xs uppercase ml-1">
            {initial}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">My Account</p>
                  {userEmail && <p className="text-xs leading-none text-muted-foreground mt-1 break-all">{userEmail}</p>}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950" 
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                "Sign out"
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <GlobalSearch open={searchOpen} setOpen={setSearchOpen} />
    </header>
  )
}
