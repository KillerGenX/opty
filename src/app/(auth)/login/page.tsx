"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#faf9f6] flex flex-col overflow-hidden font-[family-name:var(--font-geist-sans,system-ui)] selection:bg-emerald-900 selection:text-white dark:bg-zinc-950 dark:selection:bg-emerald-500">
      
      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-8">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          
          {/* Left Side: Typography (Hidden on Mobile) */}
          <div className="hidden lg:block space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-xs font-semibold tracking-widest text-slate-500 dark:text-zinc-400 uppercase">INTERNAL WORKSPACE v1.0</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight leading-[1.1]">
              Solusi enterprise, <br />
              <span className="font-[family-name:Georgia,serif] italic text-emerald-900 dark:text-emerald-500 font-normal">secanggih</span> <br />
              visimu.
            </h1>
            
            <p className="text-lg text-slate-600 dark:text-zinc-400 max-w-md leading-relaxed">
              Satu platform cerdas untuk merancang Solusi Arsitektur, menghitung Business Case, dan menyusun BoQ tanpa hambatan.
            </p>

            <div className="grid grid-cols-3 gap-6 pt-6 mt-4 border-t border-slate-200/60 dark:border-zinc-800 max-w-md">
              <div>
                <p className="text-2xl font-light text-slate-900 dark:text-zinc-100">4x</p>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 mt-1 uppercase tracking-wider">Lebih Cepat</p>
              </div>
              <div>
                <p className="text-2xl font-light text-slate-900 dark:text-zinc-100">AI</p>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 mt-1 uppercase tracking-wider">Powered Docs</p>
              </div>
              <div>
                <p className="text-2xl font-light text-slate-900 dark:text-zinc-100">100%</p>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 mt-1 uppercase tracking-wider">Akurasi BoQ</p>
              </div>
            </div>
          </div>

          {/* Right Side: Clean Login Card */}
          <div className="relative w-full max-w-[400px] mx-auto lg:ml-auto lg:-translate-y-8">
            {/* Soft background blob for depth */}
            <div className="absolute inset-0 bg-emerald-100/60 dark:bg-emerald-900/20 rounded-3xl blur-2xl transform -rotate-3 scale-105 pointer-events-none" />
            
            <Card className="relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-0 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] rounded-3xl overflow-hidden">
              <CardHeader className="pb-6 pt-8 px-8">
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-zinc-100">Masuk ke Workspace</CardTitle>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Gunakan kredensial akun Anda.</p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm text-center">
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                      Email Address
                    </Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="engineer@company.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                      className="h-11 bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 focus-visible:ring-emerald-900 dark:focus-visible:ring-emerald-500 shadow-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                        Password
                      </Label>
                    </div>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                      className="h-11 bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 focus-visible:ring-emerald-900 dark:focus-visible:ring-emerald-500 shadow-sm"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-11 bg-emerald-900 hover:bg-emerald-950 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 font-semibold rounded-lg shadow-sm"
                  >
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}
