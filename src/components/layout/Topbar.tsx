"use client"

import { useState, useEffect } from "react"
import { Bell, Search, Plus, Loader2, AlertTriangle, Clock } from "lucide-react"
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
import Link from "next/link"

const STAGNANT_DAYS = 14

interface StagnantDeal {
  id: string
  opportunity_name: string
  customer_name: string
  stage: string
  daysSinceActivity: number
}

export function Topbar() {
  const router = useRouter()
  const supabase = createClient()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [stagnantDeals, setStagnantDeals] = useState<StagnantDeal[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(true)
  const [notifsRead, setNotifsRead] = useState(false)

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

  useEffect(() => {
    const fetchStagnant = async () => {
      setLoadingNotifs(true)
      try {
        // Fetch active opportunities (not Won/Lost)
        const { data: opties } = await supabase
          .from('opportunities')
          .select('id, opportunity_name, customer_name, stage')
          .not('stage', 'in', '("Won","Lost")')

        if (!opties || opties.length === 0) {
          setStagnantDeals([])
          return
        }

        // Fetch the latest activity per opportunity
        const optyIds = opties.map(o => o.id)
        const { data: activities } = await supabase
          .from('opportunity_activities')
          .select('opportunity_id, created_at')
          .in('opportunity_id', optyIds)
          .order('created_at', { ascending: false })

        // Build a map: opty_id -> latest activity date
        const latestActivity: Record<string, string> = {}
        activities?.forEach(a => {
          if (!latestActivity[a.opportunity_id]) {
            latestActivity[a.opportunity_id] = a.created_at
          }
        })

        const now = new Date()
        const stagnant: StagnantDeal[] = []

        opties.forEach(opty => {
          const lastDate = latestActivity[opty.id]
            ? new Date(latestActivity[opty.id])
            : null

          // If no activity at all, or last activity > STAGNANT_DAYS ago
          const daysSince = lastDate
            ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
            : 999 // never had activity

          if (daysSince >= STAGNANT_DAYS) {
            stagnant.push({
              id: opty.id,
              opportunity_name: opty.opportunity_name,
              customer_name: opty.customer_name,
              stage: opty.stage,
              daysSinceActivity: daysSince,
            })
          }
        })

        // Sort by most stagnant first
        stagnant.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity)
        setStagnantDeals(stagnant)
      } catch (e) {
        console.error('Failed to fetch stagnant deals', e)
      } finally {
        setLoadingNotifs(false)
      }
    }

    fetchStagnant()
  }, [])

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

  const notifCount = stagnantDeals.length

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

        {/* Bell Notification — Stagnant Deals */}
        <DropdownMenu onOpenChange={(open) => { if (open) setNotifsRead(true) }}>
          <DropdownMenuTrigger className="relative flex h-9 w-9 items-center justify-center text-slate-500 hover:text-emerald-900 hover:bg-emerald-50 dark:text-zinc-400 dark:hover:text-emerald-500 dark:hover:bg-zinc-900 rounded-xl ml-1 focus:outline-none focus:ring-2 focus:ring-emerald-900">
            <Bell className="h-5 w-5" />
            {notifCount > 0 && !notifsRead && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
            {(notifCount === 0 || notifsRead) && !loadingNotifs && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500" />
            )}
            <span className="sr-only">Notifications</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center justify-between">
                <span>🔔 Stagnant Deals</span>
                {notifCount > 0 && (
                  <span className="text-xs font-normal bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">
                    {notifCount} deal
                  </span>
                )}
              </DropdownMenuLabel>
              <p className="px-2 pb-2 text-xs text-slate-500 dark:text-zinc-500">
                Opty tanpa aktivitas &gt; {STAGNANT_DAYS} hari
              </p>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            {loadingNotifs ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : notifCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-8 w-8 text-slate-300 dark:text-zinc-700 mb-3" />
                <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">Semua Deal Aktif! 🎉</p>
                <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">Tidak ada deal yang stagnan.</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                {stagnantDeals.map(deal => (
                  <Link key={deal.id} href={`/opportunities/${deal.id}`}>
                    <DropdownMenuItem className="flex flex-col items-start gap-1 cursor-pointer py-3 px-3 focus:bg-red-50 dark:focus:bg-red-950/30">
                      <div className="flex items-start gap-2 w-full">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-zinc-200 truncate leading-tight">
                            {deal.opportunity_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-zinc-500 truncate">{deal.customer_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 pl-6">
                        <Clock className="h-3 w-3 text-red-400" />
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                          {deal.daysSinceActivity >= 999
                            ? 'Belum ada aktivitas'
                            : `${deal.daysSinceActivity} hari tanpa aktivitas`}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-zinc-600">• {deal.stage}</span>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Avatar */}
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

