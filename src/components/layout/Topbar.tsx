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
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { GlobalSearch } from "./GlobalSearch"

export function Topbar() {
  const router = useRouter()
  const supabase = createClient()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile({
          email: user.email,
          ...profileData
        })
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

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || "User"
  const initial = displayName.charAt(0).toUpperCase()
  const avatarUrl = profile?.avatar_url

  const [isNavigatingQuickAdd, setIsNavigatingQuickAdd] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsNavigatingQuickAdd(false)
  }, [pathname])

  const handleQuickAdd = () => {
    setIsNavigatingQuickAdd(true)
    router.push('/opportunities/new')
  }

  return (
    <div className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/80 sm:px-6">
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
          disabled={isNavigatingQuickAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 hidden md:flex items-center gap-1.5"
          onClick={handleQuickAdd}
        >
          {isNavigatingQuickAdd ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span>{isNavigatingQuickAdd ? 'Loading...' : 'Quick Add'}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="relative flex h-9 w-9 items-center justify-center text-slate-500 hover:text-emerald-900 hover:bg-emerald-50 dark:text-zinc-400 dark:hover:text-emerald-500 dark:hover:bg-zinc-900 rounded-xl ml-1 focus:outline-none focus:ring-2 focus:ring-emerald-900">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-600" />
            <span className="sr-only">Notifications</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-semibold text-slate-800 dark:text-zinc-200">Notifications</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-slate-300 dark:text-zinc-700 mb-3" />
              <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">All caught up!</p>
              <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">You have no new notifications.</p>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-500 font-bold text-xs uppercase ml-1 overflow-hidden border border-emerald-200 dark:border-emerald-800">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground mt-1 truncate">{profile?.email}</p>
                  {profile?.role && (
                    <div className="mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-500 uppercase w-fit">
                      {profile.role}
                    </div>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer">Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">Settings</DropdownMenuItem>
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
    </div>
  )
}
