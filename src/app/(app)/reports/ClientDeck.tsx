"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2, Sparkles,
  AlertTriangle, CheckCircle2, Loader2, ArrowRight, TrendingUp,
  DollarSign, Target, Users, BarChart3
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
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

  // AI State
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  // Hot Seat Filter
  const [hotSeatFilter, setHotSeatFilter] = useState<'all' | '7' | '14'>('all')

  // ── Data Calculations ──────────────────────────────────────────────────────

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  let totalPipelineValue = 0
  let wonThisMonthValue = 0
  let wonCount = 0
  let lostCount = 0
  let activeCount = 0

  opportunities.forEach(opty => {
    const tcv = getTCV(opty)
    if (opty.stage === 'Won') {
      wonCount++
      const d = new Date(opty.updated_at || opty.created_at)
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) wonThisMonthValue += tcv
    } else if (opty.stage === 'Lost') {
      lostCount++
    } else {
      totalPipelineValue += tcv
      activeCount++
    }
  })

  const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0
  const avgDealSize = activeCount > 0 ? Math.round(totalPipelineValue / activeCount) : 0

  const stageChartData = stages
    .map(stage => {
      const optys = opportunities.filter(o => o.stage === stage)
      const value = optys.reduce((s, o) => s + getTCV(o), 0)
      return { name: stage, value, count: optys.length }
    })
    .filter(d => d.value > 0)

  const pillarData = (() => {
    const pillars: Record<string, number> = {}
    opportunities.forEach(opty => {
      if (opty.stage === 'Won' || opty.stage === 'Lost') return
      if (opty.opportunity_line_items?.length > 0) {
        opty.opportunity_line_items.forEach((item: any) => {
          const p = item.pillar || 'Other'
          pillars[p] = (pillars[p] || 0) + (item.total_price || 0)
        })
      } else {
        pillars['Uncategorized'] = (pillars['Uncategorized'] || 0) + Number(opty.total_value || 0)
      }
    })
    return Object.entries(pillars)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
  })()

  const topCustomers = (() => {
    const map: Record<string, { value: number; count: number; industry: string }> = {}
    opportunities.forEach(opty => {
      if (opty.stage === 'Won' || opty.stage === 'Lost') return
      const tcv = getTCV(opty)
      if (!map[opty.customer_name]) {
        map[opty.customer_name] = { value: 0, count: 0, industry: opty.customer_industry || 'N/A' }
      }
      map[opty.customer_name].value += tcv
      map[opty.customer_name].count++
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

  // ── Typing Effect ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!aiSummary) return
    setDisplayedText('')
    setIsTyping(true)
    let i = 0
    const iv = setInterval(() => {
      if (i < aiSummary.length) {
        setDisplayedText(prev => prev + aiSummary[i])
        i++
      } else {
        clearInterval(iv)
        setIsTyping(false)
      }
    }, 16)
    return () => clearInterval(iv)
  }, [aiSummary])

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

  // ── AI Generate ────────────────────────────────────────────────────────────

  const handleGenerateSummary = async () => {
    setGeneratingAi(true)
    try {
      const topDeals = [...opportunities]
        .filter(o => o.stage !== 'Lost')
        .sort((a, b) => getTCV(b) - getTCV(a))
        .slice(0, 3)
        .map(o => `${o.opportunity_name} (${o.customer_name}, ${o.stage}, ${formatCurrency(getTCV(o))})`)

      const payload = {
        totalPipelineValue: formatCurrency(totalPipelineValue),
        wonThisMonthValue: formatCurrency(wonThisMonthValue),
        winRate,
        activeDeals: activeCount,
        avgDealSize: formatCurrency(avgDealSize),
        stagnantDealsCount: rawStagnant.filter(d => d.daysStagnant >= 7).length,
        topStagnantDeals: rawStagnant.slice(0, 3).map(d =>
          `${d.opportunity_name} (${d.stage}, ${d.daysStagnant} hari, ${formatCurrency(d.tcv)})`
        ),
        topDeals,
        stageBreakdown: stageChartData.map(s => `${s.name}: ${s.count} deals = ${formatCurrency(s.value)}`),
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

  // ── Slide Definitions ──────────────────────────────────────────────────────

  const SLIDES = [
    { title: 'Executive Summary', icon: Sparkles },
    { title: 'Pipeline KPIs', icon: Target },
    { title: 'Pipeline Analysis', icon: BarChart3 },
    { title: 'Top Accounts', icon: Users },
    { title: 'Hot Seat', icon: AlertTriangle },
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

      {/* Scrollable Content Card */}
      <Card className="border-2 border-indigo-100 shadow-lg flex-1 overflow-hidden bg-gradient-to-br from-indigo-50/40 to-white">
        <CardContent className={cn("h-full overflow-y-auto", isFullscreen ? "p-10" : "p-6")}>
          {aiSummary ? (
            <p className={cn(
              "leading-relaxed text-slate-700 whitespace-pre-wrap",
              isFullscreen ? "text-xl leading-loose" : "text-base"
            )}>
              {displayedText}
              {isTyping && (
                <span className="inline-block w-0.5 h-6 bg-indigo-500 ml-1 animate-pulse align-middle" />
              )}
            </p>
          ) : (
            <div className="h-full flex items-center justify-center">
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

  // SLIDE 1 — KPIs
  const kpis = [
    {
      label: 'Total Pipeline Aktif',
      value: formatCurrency(totalPipelineValue),
      sub: `${activeCount} deals berjalan`,
      icon: DollarSign,
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      valueCls: 'text-blue-900',
    },
    {
      label: 'Booked Bulan Ini',
      value: formatCurrency(wonThisMonthValue),
      sub: `${wonCount} deal won`,
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      valueCls: 'text-emerald-900',
    },
    {
      label: 'Win Rate',
      value: `${winRate}%`,
      sub: `${wonCount} won / ${lostCount} lost`,
      icon: Target,
      gradient: 'from-violet-500 to-violet-600',
      bg: 'bg-violet-50',
      text: 'text-violet-600',
      valueCls: 'text-violet-900',
    },
    {
      label: 'Avg Deal Size',
      value: formatCurrency(avgDealSize),
      sub: 'rata-rata per deal aktif',
      icon: TrendingUp,
      gradient: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      valueCls: 'text-amber-900',
    },
    {
      label: 'Total Opportunities',
      value: `${activeCount}`,
      sub: 'dalam pipeline aktif',
      icon: Users,
      gradient: 'from-teal-500 to-teal-600',
      bg: 'bg-teal-50',
      text: 'text-teal-600',
      valueCls: 'text-teal-900',
    },
  ]

  const KpiCard = ({ kpi, large }: { kpi: typeof kpis[0]; large?: boolean }) => {
    const Icon = kpi.icon
    return (
      <div className={cn(
        "rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden",
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
          Pipeline KPIs
        </h2>
        <p className={cn("text-slate-500 mt-1", isFullscreen ? "text-xl" : "text-sm")}>
          Snapshot performa pipeline saat ini
        </p>
      </div>
      {/* Row 1: 3 cards */}
      <div className="grid grid-cols-3 gap-4">
        {kpis.slice(0, 3).map((kpi, i) => <KpiCard key={i} kpi={kpi} large />)}
      </div>
      {/* Row 2: 2 cards centered */}
      <div className="grid grid-cols-2 gap-4 max-w-2xl w-full mx-auto">
        {kpis.slice(3).map((kpi, i) => <KpiCard key={i} kpi={kpi} />)}
      </div>
    </div>
  )

  // SLIDE 2 — Charts
  const Slide2 = () => (
    <div className={cn("h-full flex flex-col", isFullscreen ? "p-12 gap-6" : "p-8 gap-5")}>
      <div>
        <h2 className={cn("font-bold text-slate-900", isFullscreen ? "text-4xl" : "text-xl")}>
          Pipeline Analysis
        </h2>
        <p className={cn("text-slate-500 mt-1", isFullscreen ? "text-xl" : "text-sm")}>
          Distribusi nilai pipeline per stage dan komposisi produk
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-5 flex-1">
        {/* Bar Chart */}
        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="pb-2">
            <CardTitle className={cn("font-semibold text-slate-700", isFullscreen ? "text-lg" : "text-sm")}>
              Nilai Pipeline per Stage
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
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Nilai']}
                    contentStyle={{
                      borderRadius: '10px',
                      border: 'none',
                      boxShadow: '0 8px 24px rgb(0 0 0 / 0.12)',
                      fontSize: '13px'
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#10b981"
                    radius={[5, 5, 0, 0]}
                    barSize={40}
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={900}
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
                    >
                      {pillarData.map((_, index) => (
                        <Cell key={index} fill={SLIDE_COLORS[index % SLIDE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => [formatCurrency(Number(v)), 'Nilai']}
                      contentStyle={{
                        borderRadius: '10px',
                        border: 'none',
                        boxShadow: '0 8px 24px rgb(0 0 0 / 0.12)',
                        fontSize: '13px'
                      }}
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
                <div key={i} className={cn("px-6 hover:bg-slate-50/70 transition-colors", isFullscreen ? "py-5" : "py-4")}>
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
                  <Link href={`/opportunities/${opty.id}`} className="shrink-0 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Review <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </Link>
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
      case 0: return <Slide0 />
      case 1: return <Slide1 />
      case 2: return <Slide2 />
      case 3: return <Slide3 />
      case 4: return <Slide4 />
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
    </div>
  )
}
