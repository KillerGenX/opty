"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Briefcase, FileText, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Opportunities", href: "/opportunities", icon: Briefcase },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="w-64 bg-white dark:bg-zinc-950 border-r border-slate-200/60 dark:border-zinc-800 flex flex-col h-full">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-zinc-800 shrink-0">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-emerald-950 dark:bg-emerald-600 rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-transform">
            <span className="text-white font-bold text-sm">OT</span>
          </div>
          <span className="font-semibold text-emerald-950 dark:text-zinc-100 text-xl tracking-tight">Opty Tracker</span>
        </Link>
      </div>
      
      <div className="flex-1 py-6 space-y-1 overflow-y-auto">
        <p className="px-6 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-4">Workspace</p>
        <nav className="flex flex-col gap-1 px-4">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-900/30 dark:text-emerald-500"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-emerald-700 dark:text-emerald-500" : "text-slate-400 dark:text-zinc-500")} />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-zinc-800">
        <button 
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 dark:text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-500"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
