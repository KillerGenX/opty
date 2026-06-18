"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2, Sparkles,
  AlertTriangle, CheckCircle2, Loader2, ArrowRight, TrendingUp,
  DollarSign, Target, Users, BarChart3, PenSquare, Send
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell
} from "recharts"

const SLIDE_COLORS = ['#10b981', '#0ea5e9', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6']

const formatCurrency = (value: number) => {
  if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(2)} M`
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)} Jt`
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

const fmtShort = (v: number) => {
  if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}M`
  if (v >= 1000000) return `${(v / 1000000).toFixed(0)}Jt`
  return `${v}`
}

const getTCV = (opty: any): number => {
  if (opty.opportunity_line_items?.length > 0) {
    const calc = opty.opportunity_line_items.reduce((s: number, i: any) => s + (i.total_price || 0), 0)
    if (calc > 0) return calc
  }
  return Number(opty.total_value || 0)
}

const getRevenueSplit = (opty: any) => {
  let mrr = 0
  let otc = 0
  let tcv = 0

  if (opty.opportunity_line_items?.length > 0) {
    opty.opportunity_line_items.forEach((item: any) => {
      const qty = Number(item.quantity) || 1
      mrr += (Number(item.mrc) || 0) * qty
      otc += (Number(item.otc) || 0) * qty
      tcv += Number(item.total_price || 0)
    })
  } else {
    tcv = Number(opty.total_value || 0)
  }

  return { mrr, otc, tcv }
}

export function MeetingDeckClient({ opportunities, activities, stages }: {
  opportunities: any[]
  activities: any[]
  stages: string[]
}) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const deckRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // AI State
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [generatingAi, setGeneratingAi] = useState(false)

  // AI Chat State
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatting, setIsChatting] = useState(false)

  // Hot Seat Filter
  const [hotSeatFilter, setHotSeatFilter] = useState<'all' | '7' | '14'>('all')

  // Drill-down State
  const [drillDownData, setDrillDownData] = useState<{ title: string, subtitle?: string, deals: any[] } | null>(null)

  // Hot Seat Log Activity State
  const [logActivityOpty, setLogActivityOpty] = useState<any>(null)
  const [activityNote, setActivityNote] = useState('')
  const [isLogging, setIsLogging] = useState(false)

  // Period Filter
  const [filterPeriod, setFilterPeriod] = useState<'week' | 'month' | 'quarter' | 'all'>('month')

  const PERIOD_OPTIONS: { key: 'week' | 'month' | 'quarter' | 'all'; label: string; short: string }[] = [
    { key: 'week', label: 'Minggu Ini', short: '7H' },
    { key: 'month', label: 'Bulan Ini', short: '1B' },
    { key: 'quarter', label: '3 Bulan Terakhir', short: '3B' },
    { key: 'all', label: 'Semua Waktu', short: 'All' },
  ]

  const periodStart = (() => {
    const now = new Date()
    if (filterPeriod === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 7); return d
    }
    if (filterPeriod === 'month') {
      return new Date(now.getFullYear(), now.getMonth(), 1)
    }
    if (filterPeriod === 'quarter') {
      const d = new Date(now); d.setDate(d.getDate() - 90); return d
    }
    return null // all time
  })()

  const periodLabel = PERIOD_OPTIONS.find(p => p.key === filterPeriod)?.label || 'Bulan Ini'
  const bookedLabel = filterPeriod === 'all' ? 'Total Booked' : `Booked ${periodLabel}`

  // ── Data Calculations ──────────────────────────────────────────────────────

  // Helper: is a date within the selected period?
  const inPeriod = (dateStr: string) => {
    if (!periodStart) return true
    return new Date(dateStr) >= periodStart
  }

  let activeMrr = 0
  let activeOtc = 0
  let activeTcv = 0

  let accruedMrr = 0
  let accruedOtc = 0
  let accruedTcv = 0

  let wonCount = 0
  let lostCount = 0
  let wonCountInPeriod = 0
  let lostCountInPeriod = 0
  let lostValueInPeriod = 0
  let activeCount = 0

  const activePipelineDeals: any[] = []
  const wonInPeriodDeals: any[] = []
  const lostInPeriodDeals: any[] = []

  opportunities.forEach(opty => {
    const { mrr, otc, tcv } = getRevenueSplit(opty)
    const closedDate = opty.updated_at || opty.created_at
    if (opty.stage === 'Won') {
      wonCount++
      if (inPeriod(closedDate)) {
        wonCountInPeriod++
        accruedMrr += mrr
        accruedOtc += otc
        accruedTcv += tcv
        wonInPeriodDeals.push(opty)
      }
    } else if (opty.stage === 'Lost') {
      lostCount++
      if (inPeriod(closedDate)) {
        lostCountInPeriod++
        lostValueInPeriod += tcv
        lostInPeriodDeals.push(opty)
      }
    } else {
      activeMrr += mrr
      activeOtc += otc
      activeTcv += tcv
      activeCount++
      activePipelineDeals.push(opty)
    }
  })

  // Win rate is calculated from deals closed within the period
  const winRate = wonCountInPeriod + lostCountInPeriod > 0
    ? Math.round((wonCountInPeriod / (wonCountInPeriod + lostCountInPeriod)) * 100)
    : (wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0)

  const avgDealMrr = activeCount > 0 ? Math.round(activeMrr / activeCount) : 0
  const accruedRevenueMtd = accruedMrr + accruedOtc
  const recurringRatio = activeTcv > 0 ? Math.round((activeMrr * 12 / activeTcv) * 100) : 0

  const stageChartData = stages
    .map(stage => {
      const optys = opportunities.filter(o => o.stage === stage)
      const stageTotals = optys.reduce((s, o) => {
        const { mrr, otc, tcv } = getRevenueSplit(o)
        return { mrr: s.mrr + mrr, otc: s.otc + otc, tcv: s.tcv + tcv }
      }, { mrr: 0, otc: 0, tcv: 0 })

      return {
        name: stage,
        mrr: stageTotals.mrr,
        otc: stageTotals.otc,
        tcv: stageTotals.tcv,
        count: optys.length,
        rawDeals: optys
      }
    })
    .filter(d => d.count > 0 && d.name !== 'Lost')

  const pillarData = (() => {
    const pillars: Record<string, { value: number, wonValue: number, activeValue: number, rawDeals: any[] }> = {}
    opportunities.forEach(opty => {
      if (opty.stage === 'Lost') return
      const isWon = opty.stage === 'Won'
      if (opty.opportunity_line_items?.length > 0) {
        opty.opportunity_line_items.forEach((item: any) => {
          const p = item.pillar || 'Other'
          if (!pillars[p]) pillars[p] = { value: 0, wonValue: 0, activeValue: 0, rawDeals: [] }
          const val = (item.total_price || 0)
          pillars[p].value += val
          if (isWon) pillars[p].wonValue += val; else pillars[p].activeValue += val
          if (!pillars[p].rawDeals.find(d => d.id === opty.id)) {
            pillars[p].rawDeals.push(opty)
          }
        })
      } else {
        const p = 'Uncategorized'
        if (!pillars[p]) pillars[p] = { value: 0, wonValue: 0, activeValue: 0, rawDeals: [] }
        const val = Number(opty.total_value || 0)
        pillars[p].value += val
        if (isWon) pillars[p].wonValue += val; else pillars[p].activeValue += val
        pillars[p].rawDeals.push(opty)
      }
    })
    return Object.entries(pillars)
      .map(([name, data]) => ({ name, value: data.value, wonValue: data.wonValue, activeValue: data.activeValue, rawDeals: data.rawDeals }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
  })()

  const topCustomers = (() => {
    const map: Record<string, { value: number; count: number; industry: string; rawDeals: any[] }> = {}
    opportunities.forEach(opty => {
      if (opty.stage === 'Lost') return
      const tcv = getTCV(opty)
      if (!map[opty.customer_name]) {
        map[opty.customer_name] = { value: 0, count: 0, industry: opty.customer_industry || 'N/A', rawDeals: [] }
      }
      map[opty.customer_name].value += tcv
      map[opty.customer_name].count++
      map[opty.customer_name].rawDeals.push(opty)
    })
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)
  })()

  const activeStages = stages.filter(s => s !== 'Won' && s !== 'Lost')
  const rawStagnant = opportunities
    .filter(o => activeStages.includes(o.stage))
    .map(opty => {
      const acts = activities.filter(a => a.opportunity_id === opty.id)
      const latest = acts.length > 0 ? new Date(acts[0].created_at) : new Date(opty.created_at)
      const days = Math.floor((Date.now() - latest.getTime()) / 86400000)
      return { ...opty, daysStagnant: days, tcv: getTCV(opty) }
    })
    .sort((a, b) => b.daysStagnant - a.daysStagnant)
    .slice(0, 15)

  const filteredStagnant = rawStagnant.filter(d => {
    if (hotSeatFilter === '7') return d.daysStagnant > 7
    if (hotSeatFilter === '14') return d.daysStagnant > 14
    return true
  })



  // ── Slide Navigation ───────────────────────────────────────────────────────

  const SLIDE_COUNT = 5

  const goTo = useCallback((index: number, dir: 'next' | 'prev') => {
    if (isTransitioning || index < 0 || index >= SLIDE_COUNT) return
    setSlideDirection(dir)
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentSlide(index)
      setIsTransitioning(false)
    }, 250)
  }, [isTransitioning])

  useEffect(() => {
    if (!isFullscreen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(currentSlide + 1, 'next')
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goTo(currentSlide - 1, 'prev')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isFullscreen, currentSlide, goTo])

  // ── Fullscreen ─────────────────────────────────────────────────────────────

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      deckRef.current?.requestFullscreen().catch(err => console.error(err))
      setIsFullscreen(true)
      setCurrentSlide(0)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsFullscreen(false)
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // ── Hot Seat Activity ────────────────────────────────────────────────────────

  const handleLogActivity = async () => {
    if (!activityNote.trim() || !logActivityOpty) return
    setIsLogging(true)
    try {
      const { error } = await supabase.from('opportunity_activities').insert([{
        opportunity_id: logActivityOpty.id,
        activity_type: 'Note',
        notes: activityNote.trim()
      }])
      if (error) throw error

      setLogActivityOpty(null)
      setActivityNote('')
      router.refresh() // Refresh the server data to remove the deal from hot seat
    } catch (err) {
      console.error(err)
      alert("Gagal menyimpan aktivitas.")
    }
    setIsLogging(false)
  }

  // ── AI Generate ────────────────────────────────────────────────────────────

  const handleGenerateSummary = async () => {
    setGeneratingAi(true)
    try {
      const getActivityNotes = (optyId: string) => {
        const acts = activities
          .filter(a => a.opportunity_id === optyId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 2)
          .map(a => `[${new Date(a.created_at).toLocaleDateString()}] ${a.notes}`)
        return acts.length > 0 ? ` Catatan Terakhir: ${acts.join(' | ')}` : ''
      }

      const topDeals = [...opportunities]
        .filter(o => o.stage !== 'Lost')
        .sort((a, b) => getRevenueSplit(b).tcv - getRevenueSplit(a).tcv)
        .slice(0, 3)
        .map(o => {
          const { mrr, otc } = getRevenueSplit(o)
          return `${o.opportunity_name} (${o.customer_name}, ${o.stage}, MRR: ${formatCurrency(mrr)}, OTC: ${formatCurrency(otc)}).${getActivityNotes(o.id)}`
        })

      const payload = {
        period: periodLabel,
        accruedRevenueMtd: formatCurrency(accruedRevenueMtd),
        totalMrrPipeline: formatCurrency(activeMrr),
        totalOtcPipeline: formatCurrency(activeOtc),
        totalPipelineValue: formatCurrency(activeTcv),
        winRate,
        recurringRatio,
        stagnantDealsCount: rawStagnant.filter(d => d.daysStagnant >= 7).length,
        topStagnantDeals: rawStagnant.slice(0, 3).map(d =>
          `${d.opportunity_name} (${d.stage}, ${d.daysStagnant} hari stagnan, MRR: ${formatCurrency(getRevenueSplit(d).mrr)}).${getActivityNotes(d.id)}`
        ),
        topDeals,
        stageBreakdown: stageChartData.map(s => `${s.name}: ${s.count} deals = MRR ${formatCurrency(s.mrr)}`),
        pillarBreakdown: pillarData.map(p => `${p.name}: ${formatCurrency(p.value)}`),
        topCustomers: topCustomers.slice(0, 3).map(c => `${c.name} (${c.count} deals, TCV: ${formatCurrency(c.value)})`),
      }

      const res = await fetch('/api/ai/meeting-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      setAiSummary(data.summary || "Gagal generate summary.")
    } catch {
      setAiSummary("Terjadi error saat memanggil AI.")
    }
    setGeneratingAi(false)
  }

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!chatInput.trim() || isChatting) return

    const userMessage = chatInput.trim()
    setChatInput('')
    const newHistory = [...chatHistory, { role: 'user' as const, content: userMessage }]
    setChatHistory(newHistory)
    setIsChatting(true)

    try {
      const payload = {
        message: userMessage,
        history: chatHistory,
        context: {
          period: periodLabel,
          activeDeals: activeCount,
          accruedRevenueMtd: formatCurrency(accruedRevenueMtd),
          totalMrrPipeline: formatCurrency(activeMrr),
          totalOtcPipeline: formatCurrency(activeOtc),
          totalPipelineValue: formatCurrency(activeTcv),
          winRate,
          rawDealsSummary: opportunities.map(o => {
            const { mrr, otc, tcv } = getRevenueSplit(o)
            return {
              name: o.opportunity_name,
              customer: o.customer_name,
              stage: o.stage,
              mrr: formatCurrency(mrr),
              otc: formatCurrency(otc),
              tcv: formatCurrency(tcv),
              daysStagnant: o.stage !== 'Won' && o.stage !== 'Lost' ? Math.floor((Date.now() - new Date(o.updated_at || o.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0
            }
          })
        }
      }

      const res = await fetch('/api/ai/pipeline-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (res.ok) {
        setChatHistory([...newHistory, { role: 'ai', content: data.reply }])
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      console.error(err)
      setChatHistory([...newHistory, { role: 'ai', content: "Maaf, terjadi kesalahan saat mencoba menjawab." }])
    }
    setIsChatting(false)
  }

  // ── Slide Definitions ──────────────────────────────────────────────────────

  const SLIDES = [
    { title: 'Deals & Revenue Overview', icon: Target },
    { title: 'Deals Analysis', icon: BarChart3 },
    { title: 'Top Accounts', icon: Users },
    { title: 'Hot Seat', icon: AlertTriangle },
    { title: 'Executive Summary', icon: Sparkles },
  ]

  // SLIDE 0 — AI Executive Summary
  const Slide0 = () => (
    <div className={cn(
      "h-full flex flex-col",
      isFullscreen ? "p-12 gap-6" : "p-8 gap-6"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-100">
            <Sparkles className={cn("text-indigo-600", isFullscreen ? "h-7 w-7" : "h-5 w-5")} />
          </div>
          <div>
            <h2 className={cn("font-bold text-slate-900", isFullscreen ? "text-4xl" : "text-2xl")}>
              AI Executive Summary
            </h2>
            <p className={cn("text-slate-500", isFullscreen ? "text-lg" : "text-sm")}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <Button
          onClick={handleGenerateSummary}
          disabled={generatingAi}
          size={isFullscreen ? "lg" : "default"}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 shrink-0"
        >
          {generatingAi
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <Sparkles className="h-4 w-4 mr-2" />}
          {aiSummary ? "Regenerate" : "Generate Narrative"}
        </Button>
      </div>

      {/* Content Card */}
      <Card className="border-2 border-indigo-100 shadow-lg flex-1 overflow-hidden bg-gradient-to-br from-indigo-50/40 to-white flex flex-col">
        <CardContent className={cn("flex-1 overflow-hidden flex flex-col p-0")}>
          {aiSummary ? (
            <div className="flex flex-col h-full min-h-0">
              <ScrollArea className="flex-1 min-h-0">
                <div className={cn(isFullscreen ? "p-10" : "p-6", "space-y-6")}>
                  {/* Initial Summary */}
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className={cn(
                      "flex-1 bg-white p-5 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-slate-700 whitespace-pre-wrap",
                      isFullscreen ? "text-lg leading-relaxed" : "text-base"
                    )}>
                      {aiSummary}
                    </div>
                  </div>

                  {/* Chat History */}
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "")}>
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                        msg.role === 'user' ? "bg-slate-200 text-slate-600" : "bg-indigo-100 text-indigo-600"
                      )}>
                        {msg.role === 'user' ? <Users className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                      </div>
                      <div className={cn(
                        "max-w-[85%] p-4 rounded-2xl shadow-sm whitespace-pre-wrap",
                        msg.role === 'user'
                          ? "bg-indigo-600 text-white rounded-tr-none"
                          : "bg-white border border-slate-100 text-slate-700 rounded-tl-none",
                        isFullscreen ? "text-lg" : "text-sm"
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {isChatting && (
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-1">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 flex gap-1 items-center">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                <form onSubmit={handleSendChatMessage} className="relative flex items-center">
                    <Input
                      placeholder="Tanya AI tentang pipeline ini..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className={cn("pr-12 rounded-full bg-slate-50 border-slate-200 focus-visible:ring-indigo-500", isFullscreen ? "h-14 text-lg px-6" : "h-10")}
                      disabled={isChatting}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className={cn("absolute right-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700", isFullscreen ? "h-11 w-11" : "h-7 w-7 right-1.5")}
                      disabled={isChatting || !chatInput.trim()}
                    >
                      <Send className={cn(isFullscreen ? "h-5 w-5" : "h-3.5 w-3.5", "ml-0.5")} />
                    </Button>
                  </form>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-6">
              <p className={cn("text-slate-400 italic text-center", isFullscreen ? "text-xl" : "text-sm")}>
                Klik tombol &quot;Generate Narrative&quot; untuk membangkitkan narasi AI
                dari data pipeline real-time Anda.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const dealsBreakdown = [
    { name: 'Won', count: wonCount },
    ...stageChartData.filter(s => s.name !== 'Won' && s.name !== 'Lost' && s.count > 0).map(s => ({ name: s.name, count: s.count })),
    { name: 'Lost', count: lostCount }
  ].filter(d => d.count > 0).map(d => `${d.count} ${d.name.toLowerCase()}`).join(' • ')

  const kpis = [
    {
      label: 'MRR Pipeline Aktif',
      value: formatCurrency(activeMrr),
      sub: `TCV: ${fmtShort(activeTcv)} • ${activeCount} deals`,
      icon: DollarSign,
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      valueCls: 'text-blue-900',
      onClick: () => setDrillDownData({ title: 'MRR Pipeline Aktif', subtitle: `${activeCount} deals berjalan`, deals: activePipelineDeals }),
    },
    {
      label: 'Total OTC Pipeline',
      value: formatCurrency(activeOtc),
      sub: 'One-Time Charge potensial',
      icon: Sparkles,
      gradient: 'from-fuchsia-500 to-pink-500',
      bg: 'bg-fuchsia-50',
      text: 'text-fuchsia-600',
      valueCls: 'text-fuchsia-900',
    },
    {
      label: filterPeriod === 'all' ? 'Total Accrued Revenue' : `Accrued Rev. ${periodLabel}`,
      value: formatCurrency(accruedRevenueMtd),
      sub: `Booked TCV: ${fmtShort(accruedTcv)} • ${wonCountInPeriod} won`,
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      valueCls: 'text-emerald-900',
      onClick: () => setDrillDownData({ title: 'Accrued Revenue MTD', subtitle: `${wonCountInPeriod} deal won`, deals: wonInPeriodDeals }),
    },
    {
      label: 'Total Opportunities',
      value: `${opportunities.length}`,
      sub: dealsBreakdown || 'tidak ada data',
      icon: Users,
      gradient: 'from-teal-500 to-teal-600',
      bg: 'bg-teal-50',
      text: 'text-teal-600',
      valueCls: 'text-teal-900',
    },
    {
      label: 'Win Rate',
      value: `${winRate}%`,
      sub: `${wonCountInPeriod} won (${fmtShort(accruedTcv)}) / ${lostCountInPeriod} lost (${fmtShort(lostValueInPeriod)})`,
      icon: Target,
      gradient: 'from-violet-500 to-violet-600',
      bg: 'bg-violet-50',
      text: 'text-violet-600',
      valueCls: 'text-violet-900',
      onClick: () => setDrillDownData({ title: 'Win / Loss Performance', subtitle: `${wonCountInPeriod} Won & ${lostCountInPeriod} Lost deals`, deals: [...wonInPeriodDeals, ...lostInPeriodDeals] }),
    },
    {
      label: 'Deals Stagnan (>7 Hari)',
      value: `${rawStagnant.filter(d => d.daysStagnant >= 7).length}`,
      sub: 'butuh perhatian teknis',
      icon: AlertTriangle,
      gradient: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      valueCls: 'text-amber-900',
      onClick: () => {
        setHotSeatFilter('7');
        goTo(3, 'next'); // Go to Hot Seat slide
      }
    },
  ]

  const KpiCard = ({ kpi, large }: { kpi: typeof kpis[0] & { onClick?: () => void }; large?: boolean }) => {
    const Icon = kpi.icon
    return (
      <div
        onClick={kpi.onClick}
        className={cn(
          "rounded-2xl border border-slate-100 shadow-sm overflow-hidden",
          kpi.onClick ? "cursor-pointer hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 transition-all" : "hover:shadow-md transition-shadow",
          kpi.bg
        )}>
        <div className={cn("h-1.5 w-full bg-gradient-to-r", kpi.gradient)} />
        <div className={cn(isFullscreen ? (large ? "p-8" : "p-7") : "p-5")}>
          <div className="flex items-center justify-between mb-4">
            <span className={cn("font-semibold", kpi.text, isFullscreen ? "text-base" : "text-sm")}>
              {kpi.label}
            </span>
            <div className={cn("rounded-xl bg-white/70 flex items-center justify-center shadow-sm", isFullscreen ? "p-2.5" : "p-2")}>
              <Icon className={cn(kpi.text, isFullscreen ? (large ? "h-6 w-6" : "h-5 w-5") : "h-4 w-4")} />
            </div>
          </div>
          <div className={cn("font-black tracking-tight", kpi.valueCls, isFullscreen ? (large ? "text-5xl" : "text-4xl") : "text-2xl")}>
            {kpi.value}
          </div>
          <div className={cn("mt-2 font-medium", kpi.text, isFullscreen ? "text-sm" : "text-xs", "opacity-70")}>
            {kpi.sub}
          </div>
        </div>
      </div>
    )
  }

  const Slide1 = () => (
    <div className={cn("h-full flex flex-col justify-center", isFullscreen ? "p-12 gap-8" : "p-8 gap-6")}>
      <div>
        <h2 className={cn("font-bold text-slate-900", isFullscreen ? "text-4xl" : "text-xl")}>
          Deals & Revenue Overview
        </h2>
        <p className={cn("text-slate-500 mt-1", isFullscreen ? "text-xl" : "text-sm")}>
          Snapshot performa pipeline dan hasil (revenue) saat ini
        </p>
      </div>
      {/* Row 1 & 2: 3 cards each */}
      <div className="grid grid-cols-3 gap-4">
        {kpis.slice(0, 3).map((kpi, i) => <KpiCard key={i} kpi={kpi} large />)}
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4">
        {kpis.slice(3).map((kpi, i) => <KpiCard key={i} kpi={kpi} />)}
      </div>
    </div>
  )

  // SLIDE 2 — Charts
  const Slide2 = () => (
    <div className={cn("h-full flex flex-col", isFullscreen ? "p-12 gap-6" : "p-8 gap-5")}>
      <div>
        <h2 className={cn("font-bold text-slate-900", isFullscreen ? "text-4xl" : "text-xl")}>
          Deals Analysis
        </h2>
        <p className={cn("text-slate-500 mt-1", isFullscreen ? "text-xl" : "text-sm")}>
          Distribusi total nilai (termasuk Won) dan komposisi produk
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-5 flex-1">
        {/* Bar Chart */}
        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="pb-2">
            <CardTitle className={cn("font-semibold text-slate-700", isFullscreen ? "text-lg" : "text-sm")}>
              Distribusi Total Deal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(isFullscreen ? "h-72" : "h-52")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageChartData} margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: isFullscreen ? 13 : 10, fill: '#64748b' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={fmtShort}
                    tick={{ fontSize: isFullscreen ? 13 : 10, fill: '#64748b' }}
                    width={65}
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white p-3 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-slate-100">
                            <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{data.name} <span className="text-slate-400 font-normal text-xs">({data.count} deals)</span></p>
                            <div className="space-y-1 text-sm">
                              <p className="text-emerald-600 font-semibold flex justify-between gap-4"><span className="text-slate-500 font-medium">MRR</span> {formatCurrency(data.mrr)}</p>
                              <p className="text-indigo-600 font-semibold flex justify-between gap-4"><span className="text-slate-500 font-medium">OTC</span> {formatCurrency(data.otc)}</p>
                              <p className="text-slate-600 font-semibold flex justify-between gap-4"><span className="text-slate-500 font-medium">TCV</span> {formatCurrency(data.tcv)}</p>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  />
                  <Bar
                    dataKey="mrr"
                    fill="#10b981"
                    radius={[5, 5, 0, 0]}
                    barSize={40}
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={900}
                    cursor="pointer"
                    onClick={(data) => {
                      if (data?.payload) {
                        setDrillDownData({ title: `Stage: ${data.payload.name}`, subtitle: `${data.payload.count} deals berjalan`, deals: data.payload.rawDeals })
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Donut Pie */}
        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="pb-2">
            <CardTitle className={cn("font-semibold text-slate-700", isFullscreen ? "text-lg" : "text-sm")}>
              Komposisi Produk (Pillar)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("flex items-center gap-4", isFullscreen ? "h-72" : "h-52")}>
              <div className="flex-1 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pillarData}
                      cx="50%"
                      cy="50%"
                      innerRadius={isFullscreen ? 55 : 40}
                      outerRadius={isFullscreen ? 95 : 70}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={true}
                      animationBegin={0}
                      animationDuration={900}
                      cursor="pointer"
                      onClick={(data) => {
                        if (data?.payload?.payload) {
                          setDrillDownData({ title: `Produk: ${data.name}`, deals: data.payload.payload.rawDeals })
                        }
                      }}
                    >
                      {pillarData.map((_, index) => (
                        <Cell key={index} fill={SLIDE_COLORS[index % SLIDE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload.payload || payload[0].payload;
                          return (
                            <div className="bg-white p-3.5 rounded-xl shadow-lg border border-slate-100 min-w-[200px]">
                              <p className="font-semibold text-slate-800 mb-2">{data.name}</p>
                              <div className="space-y-1.5">
                                <div className="flex justify-between gap-4 text-sm">
                                  <span className="text-slate-500">Aktif (Pipeline):</span>
                                  <span className="font-medium text-slate-700">{formatCurrency(data.activeValue)}</span>
                                </div>
                                <div className="flex justify-between gap-4 text-sm">
                                  <span className="text-emerald-600 font-medium">Won (Booked):</span>
                                  <span className="font-semibold text-emerald-600">{formatCurrency(data.wonValue)}</span>
                                </div>
                                <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between gap-4 text-sm">
                                  <span className="font-semibold text-slate-600">Total Nilai:</span>
                                  <span className="font-bold text-indigo-600">{formatCurrency(data.value)}</span>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null;
                      }}
                      cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-36 space-y-2 shrink-0">
                {pillarData.slice(0, 6).map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: SLIDE_COLORS[i % SLIDE_COLORS.length] }}
                    />
                    <div className="min-w-0">
                      <p className={cn("text-slate-600 truncate", isFullscreen ? "text-sm" : "text-xs")}>{p.name}</p>
                      <p className={cn("text-slate-400 font-medium", isFullscreen ? "text-xs" : "text-[10px]")}>
                        {fmtShort(p.value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  // SLIDE 3 — Top Customers
  const maxVal = topCustomers[0]?.value || 1
  const rankColors = ['bg-amber-400', 'bg-slate-400', 'bg-orange-400']

  const Slide3 = () => (
    <div className={cn("h-full flex flex-col", isFullscreen ? "p-12 gap-6" : "p-8 gap-5")}>
      <div>
        <h2 className={cn("font-bold text-slate-900", isFullscreen ? "text-4xl" : "text-xl")}>
          Top Accounts
        </h2>
        <p className={cn("text-slate-500 mt-1", isFullscreen ? "text-xl" : "text-sm")}>
          Customer dengan nilai pipeline terbesar
        </p>
      </div>
      <Card className="shadow-sm border-slate-200/60 flex-1 overflow-auto">
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {topCustomers.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Belum ada data customer aktif.</div>
            ) : (
              topCustomers.map((c, i) => (
                <div
                  key={i}
                  onClick={() => setDrillDownData({ title: `Account: ${c.name}`, subtitle: `${c.count} active deals`, deals: c.rawDeals })}
                  className={cn("px-6 hover:bg-slate-50 transition-colors cursor-pointer group", isFullscreen ? "py-5" : "py-4")}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn(
                        "rounded-full flex items-center justify-center font-bold text-white shrink-0",
                        isFullscreen ? "w-9 h-9 text-sm" : "w-7 h-7 text-xs",
                        i < 3 ? rankColors[i] : "bg-slate-200 text-slate-500"
                      )}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className={cn("font-semibold text-slate-900 truncate", isFullscreen ? "text-xl" : "text-sm")}>
                          {c.name}
                        </p>
                        <p className={cn("text-slate-400", isFullscreen ? "text-sm" : "text-xs")}>
                          {c.industry && c.industry !== 'N/A' ? `${c.industry} · ` : ''}{c.count} deal{c.count > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <span className={cn("font-bold text-slate-800 shrink-0 ml-4", isFullscreen ? "text-2xl" : "text-sm")}>
                      {formatCurrency(c.value)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                      style={{
                        width: `${(c.value / maxVal) * 100}%`,
                        transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)'
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // SLIDE 4 — Hot Seat
  const Slide4 = () => (
    <div className={cn("h-full flex flex-col", isFullscreen ? "p-12 gap-6" : "p-8 gap-5")}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className={cn("font-bold text-slate-900 flex items-center gap-2", isFullscreen ? "text-4xl" : "text-xl")}>
            <AlertTriangle className={cn("text-amber-500", isFullscreen ? "h-8 w-8" : "h-5 w-5")} />
            Hot Seat Watchlist
          </h2>
          <p className={cn("text-slate-500 mt-1", isFullscreen ? "text-xl" : "text-sm")}>
            Deals yang membutuhkan tindakan segera
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <span className={cn("text-slate-400 mr-1", isFullscreen ? "text-base" : "text-xs")}>Filter:</span>
          {(['all', '7', '14'] as const).map(f => (
            <Button
              key={f}
              variant={hotSeatFilter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setHotSeatFilter(f)}
              className={cn(
                "transition-colors",
                hotSeatFilter === f
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-sm'
                  : 'hover:border-amber-300'
              )}
            >
              {f === 'all' ? 'Semua' : f === '7' ? '> 7 Hari' : '> 14 Hari'}
            </Button>
          ))}
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 ml-2">
            {filteredStagnant.filter(d => d.daysStagnant > 7).length} Perlu Perhatian
          </Badge>
        </div>
      </div>
      <Card className="shadow-sm border-slate-200/60 flex-1 overflow-auto">
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {filteredStagnant.length === 0 ? (
              <div className="p-10 text-center text-slate-400 flex flex-col items-center gap-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                <p className={cn(isFullscreen ? "text-xl" : "text-sm")}>
                  Semua deal bergerak dengan baik! Tidak ada yang stagnan.
                </p>
              </div>
            ) : (
              filteredStagnant.map(opty => (
                <div
                  key={opty.id}
                  className={cn(
                    "hover:bg-slate-50/70 transition-colors flex items-center justify-between group",
                    isFullscreen ? "p-5" : "p-4"
                  )}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={cn(
                      "flex flex-col items-center justify-center rounded-xl font-bold shrink-0",
                      isFullscreen ? "h-16 w-16" : "h-12 w-12",
                      opty.daysStagnant > 14
                        ? "bg-red-100 text-red-700"
                        : opty.daysStagnant > 7
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                    )}>
                      <span className={cn("leading-none", isFullscreen ? "text-2xl" : "text-lg")}>
                        {opty.daysStagnant}
                      </span>
                      <span className={cn("uppercase font-semibold opacity-70", isFullscreen ? "text-xs" : "text-[10px]")}>
                        Hari
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link
                          href={`/opportunities/${opty.id}`}
                          className={cn(
                            "font-semibold text-slate-900 hover:text-emerald-600 hover:underline truncate",
                            isFullscreen ? "text-xl" : "text-sm"
                          )}
                        >
                          {opty.opportunity_name}
                        </Link>
                        <Badge variant="outline" className={cn("font-normal shrink-0", isFullscreen ? "text-sm" : "text-xs")}>
                          {opty.customer_name}
                        </Badge>
                      </div>
                      <div className={cn("flex items-center gap-3 text-slate-500", isFullscreen ? "text-base" : "text-sm")}>
                        <span className="font-medium text-slate-700">Stage: {opty.stage}</span>
                        <span>·</span>
                        <span>Nilai: {formatCurrency(opty.tcv)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 ml-4 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogActivityOpty(opty)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      <PenSquare className="h-4 w-4" /> Log Activity
                    </Button>
                    <Link href={`/opportunities/${opty.id}`} className="hidden md:block">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Review <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSlide = (index: number) => {
    switch (index) {
      case 0: return Slide1()
      case 1: return Slide2()
      case 2: return Slide3()
      case 3: return Slide4()
      case 4: return Slide0()
      default: return null
    }
  }

  // ── Main Render ────────────────────────────────────────────────────────────

  return (
    <div
      ref={deckRef}
      className={cn(
        "transition-all duration-300",
        isFullscreen
          ? "bg-white w-screen h-screen flex flex-col overflow-hidden"
          : "flex flex-col gap-6"
      )}
    >
      {/* ── TOOLBAR ── */}
      <div className={cn(
        "flex items-center justify-between",
        isFullscreen ? "px-8 pt-6 pb-0 shrink-0" : ""
      )}>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-white px-3 py-1 text-emerald-600 border-emerald-200 shadow-sm">
            Live Data Mode
          </Badge>
          <span className="text-sm font-medium text-slate-500">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        {/* Period Filter */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilterPeriod(opt.key)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200",
                filterPeriod === opt.key
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <span className="hidden sm:inline">{opt.label}</span>
              <span className="sm:hidden">{opt.short}</span>
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="gap-2 bg-white shadow-sm hover:border-emerald-500 transition-colors"
        >
          {isFullscreen
            ? <><Minimize2 className="h-4 w-4" /> Exit Presentation</>
            : <><Maximize2 className="h-4 w-4" /> Present Deck</>
          }
        </Button>
      </div>

      {isFullscreen ? (
        /* ── PRESENTATION MODE ── */
        <>
          {/* Slide Navigator Bar */}
          <div className="px-8 pt-4 pb-0 shrink-0">
            <div className="flex items-center gap-2">
              {SLIDES.map((slide, i) => {
                const Icon = slide.icon
                return (
                  <button
                    key={i}
                    onClick={() => goTo(i, i > currentSlide ? 'next' : 'prev')}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                      i === currentSlide
                        ? "bg-indigo-600 text-white shadow-sm scale-105"
                        : i < currentSlide
                          ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                          : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">{slide.title}</span>
                    <span className="md:hidden">{i + 1}</span>
                  </button>
                )
              })}
              <div className="ml-auto text-xs text-slate-400 font-medium">
                {currentSlide + 1} / {SLIDE_COUNT}
              </div>
            </div>
            {/* Progress line */}
            <div className="h-1 bg-slate-100 mt-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentSlide + 1) / SLIDE_COUNT) * 100}%` }}
              />
            </div>
          </div>

          {/* Slide Content Area */}
          <div className="flex-1 overflow-hidden relative">
            <div
              className={cn(
                "h-full transition-all duration-250 ease-in-out",
                isTransitioning
                  ? cn(
                    "opacity-0",
                    slideDirection === 'next' ? "translate-x-6" : "-translate-x-6"
                  )
                  : "opacity-100 translate-x-0"
              )}
            >
              {renderSlide(currentSlide)}
            </div>
          </div>

          {/* Bottom Nav */}
          <div className="px-8 pb-6 shrink-0 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goTo(currentSlide - 1, 'prev')}
              disabled={currentSlide === 0 || isTransitioning}
              className="gap-2 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" /> Sebelumnya
            </Button>

            <div className="flex items-center gap-2">
              {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i, i > currentSlide ? 'next' : 'prev')}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    i === currentSlide
                      ? "w-6 h-2 bg-indigo-600"
                      : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
                  )}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => goTo(currentSlide + 1, 'next')}
              disabled={currentSlide === SLIDE_COUNT - 1 || isTransitioning}
              className="gap-2 disabled:opacity-30"
            >
              Berikutnya <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      ) : (
        /* ── NORMAL MODE — All Slides Stacked ── */
        <div className="flex flex-col gap-5">
          {[0, 1, 2, 3, 4].map(i => (
            <Card key={i} className="shadow-sm border-slate-200/60 overflow-hidden">
              <CardContent className="p-0 min-h-[400px]">
                {renderSlide(i)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Drill-Down Modal ── */}
      <Dialog open={!!drillDownData} onOpenChange={(v) => !v && setDrillDownData(null)}>
        <DialogContent container={deckRef.current} className="sm:max-w-[800px] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white border-slate-200/60 shadow-xl rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b border-indigo-100/50 bg-gradient-to-r from-slate-50 to-indigo-50/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100/50 text-indigo-600 rounded-lg shadow-sm">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800">{drillDownData?.title}</DialogTitle>
                {drillDownData?.subtitle && (
                  <DialogDescription className="text-slate-500 font-medium mt-0.5">
                    {drillDownData.subtitle}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-0 bg-white">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="bg-slate-50/50 sticky top-0 z-10 shadow-sm border-b border-slate-100">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[30%] py-4 pl-6 font-semibold text-slate-600">Opportunity</TableHead>
                    <TableHead className="font-semibold text-slate-600">Customer</TableHead>
                    <TableHead className="font-semibold text-slate-600">Stage</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">MRR</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">OTC</TableHead>
                    <TableHead className="text-right pr-6 font-semibold text-slate-600">TCV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!drillDownData?.deals?.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                        Tidak ada data yang relevan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    drillDownData.deals.map((deal) => (
                      <TableRow key={deal.id} className="hover:bg-indigo-50/30 transition-colors border-slate-100/50 group">
                        <TableCell className="font-medium text-slate-800 pl-6 py-4 max-w-[250px] break-words whitespace-normal leading-relaxed">
                          <Link href={`/opportunities/${deal.id}`} target="_blank" className="hover:text-indigo-600 hover:underline">
                            {deal.opportunity_name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-slate-600 max-w-[150px] break-words whitespace-normal">{deal.customer_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "font-semibold tracking-tight rounded-full px-3 py-0.5 shadow-sm",
                            deal.stage === 'Won' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              deal.stage === 'Lost' ? "bg-rose-50 text-rose-700 border-rose-200" :
                                "bg-indigo-50 text-indigo-700 border-indigo-200"
                          )}>
                            {deal.stage}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-600 whitespace-nowrap">
                          {formatCurrency(getRevenueSplit(deal).mrr)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-600 whitespace-nowrap">
                          {formatCurrency(getRevenueSplit(deal).otc)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-700 pr-6 whitespace-nowrap group-hover:text-indigo-700 transition-colors">
                          {formatCurrency(getRevenueSplit(deal).tcv)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
      {/* ── Log Activity Modal ── */}
      <Dialog open={!!logActivityOpty} onOpenChange={(v) => !v && setLogActivityOpty(null)}>
        <DialogContent container={deckRef.current} className="sm:max-w-[500px] rounded-2xl shadow-xl border-slate-200/60 p-0 overflow-hidden bg-white">
          <DialogHeader className="px-6 py-5 border-b border-indigo-100/50 bg-gradient-to-r from-slate-50 to-indigo-50/40">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100/50 text-indigo-600 rounded-lg shadow-sm">
                <PenSquare className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800">Log Activity</DialogTitle>
                <DialogDescription className="mt-0.5 text-slate-500 font-medium">
                  {logActivityOpty?.opportunity_name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 pb-2">
            <p className="text-sm text-slate-600 mb-3 font-medium">Catat instruksi atau tindak lanjut:</p>
            <Textarea
              placeholder="Misal: Follow up via telp besok pagi..."
              value={activityNote}
              onChange={(e) => setActivityNote(e.target.value)}
              className="min-h-[120px] resize-none focus-visible:ring-indigo-500 rounded-xl bg-slate-50 focus:bg-white transition-colors shadow-sm"
            />
          </div>
          <DialogFooter className="px-6 py-4 bg-slate-50/50 border-t border-slate-100">
            <Button variant="outline" onClick={() => setLogActivityOpty(null)} className="rounded-full hover:bg-slate-100">Batal</Button>
            <Button onClick={handleLogActivity} disabled={isLogging || !activityNote.trim()} className="rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 shadow-md shadow-indigo-200/50 text-white font-medium">
              {isLogging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan & Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
