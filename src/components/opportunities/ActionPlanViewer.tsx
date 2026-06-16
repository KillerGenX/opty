"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronLeft, Lightbulb, AlertTriangle, ListTodo, MessageSquare, ShieldCheck, Zap, Target, CheckCircle2, Swords, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActionPlanViewerProps {
  htmlContent: string
  onClose?: () => void
}

interface ActionPlanData {
  greeting?: string
  insights: string[]
  risks: string[]
  win_strategy?: string[]
  objections?: { objection: string, response: string }[]
  next_steps: { action: string, priority: string }[]
  questions: string[]
}

export function ActionPlanViewer({ htmlContent, onClose }: ActionPlanViewerProps) {
  const [data, setData] = useState<ActionPlanData | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to top when step changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentStep])

  useEffect(() => {
    try {
      // Clean up markdown block if Gemini accidentally wraps it
      let cleanJson = htmlContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleanJson)
      setData(parsed)
    } catch (e) {
      console.error("Failed to parse Action Plan JSON:", e)
      setError(true)
    }
  }, [htmlContent])

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 text-red-600 rounded-xl">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-bold">Oops! Format AI Tidak Dikenali</h3>
        <p className="mt-2 text-sm">Dokumen ini sepertinya menggunakan format lama atau AI gagal menghasilkan JSON yang valid. Silakan klik "Regenerate" pada dokumen ini untuk menggunakan format baru.</p>
        <Button className="mt-6" variant="outline" onClick={onClose}>Tutup</Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-400">
        <div className="animate-pulse flex flex-col items-center">
          <ShieldCheck className="w-12 h-12 mb-4 text-emerald-500/50" />
          <p>Membaca pikiran AI...</p>
        </div>
      </div>
    )
  }

  const steps = [
    { id: 'greeting', title: 'Review Singkat', icon: ShieldCheck, colorTheme: { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-100', shadow: 'shadow-emerald-500/25', hover: 'hover:bg-emerald-500' } },
    { id: 'insights', title: 'Peluang & Kekuatan', icon: Lightbulb, colorTheme: { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-100', shadow: 'shadow-blue-500/25', hover: 'hover:bg-blue-500' } },
    { id: 'risks', title: 'Risiko & Lubang Info', icon: AlertTriangle, colorTheme: { bg: 'bg-rose-500', text: 'text-rose-600', light: 'bg-rose-100', shadow: 'shadow-rose-500/25', hover: 'hover:bg-rose-500' } },
    { id: 'win_strategy', title: 'Strategi Tempur', icon: Swords, colorTheme: { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-100', shadow: 'shadow-amber-500/25', hover: 'hover:bg-amber-500' } },
    { id: 'objections', title: 'Anti-Bantahan Klien', icon: ShieldAlert, colorTheme: { bg: 'bg-violet-500', text: 'text-violet-600', light: 'bg-violet-100', shadow: 'shadow-violet-500/25', hover: 'hover:bg-violet-500' } },
    { id: 'next_steps', title: 'Action Plan (To-Do)', icon: ListTodo, colorTheme: { bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-100', shadow: 'shadow-indigo-500/25', hover: 'hover:bg-indigo-500' } },
    { id: 'questions', title: 'Senjata Meeting', icon: MessageSquare, colorTheme: { bg: 'bg-fuchsia-500', text: 'text-fuchsia-600', light: 'bg-fuchsia-100', shadow: 'shadow-fuchsia-500/25', hover: 'hover:bg-fuchsia-500' } },
  ]

  // Filter out empty steps just in case
  const activeSteps = steps.filter(step => {
    if (step.id === 'greeting' && !data.greeting) return false;
    if (step.id === 'insights' && (!data.insights || data.insights.length === 0)) return false;
    if (step.id === 'risks' && (!data.risks || data.risks.length === 0)) return false;
    if (step.id === 'win_strategy' && (!data.win_strategy || data.win_strategy.length === 0)) return false;
    if (step.id === 'objections' && (!data.objections || data.objections.length === 0)) return false;
    if (step.id === 'next_steps' && (!data.next_steps || data.next_steps.length === 0)) return false;
    if (step.id === 'questions' && (!data.questions || data.questions.length === 0)) return false;
    return true;
  })

  const stepInfo = activeSteps[currentStep]

  const renderContent = () => {
    switch (stepInfo.id) {
      case 'greeting':
        return (
          <div className="flex flex-col items-center justify-center text-center h-full max-w-2xl mx-auto space-y-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mb-2">
              <Zap className="w-8 h-8" />
            </div>
            <h3 className="text-lg md:text-xl font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
              "{data.greeting}"
            </h3>
            <p className="text-slate-500 font-medium">Asisten Solution Engineer Anda siap membantu.</p>
          </div>
        )
      
      case 'insights':
        return (
          <div className="grid gap-3 md:gap-4 max-w-3xl mx-auto">
            {data.insights.map((text, i) => (
              <div key={i} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm flex gap-3 items-start group hover:shadow-md hover:-translate-y-1 transition-all">
                <div className="bg-blue-100 text-blue-600 dark:bg-blue-900/50 p-2 rounded-full shrink-0 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-sm pt-0.5">{text}</p>
              </div>
            ))}
          </div>
        )
      
      case 'risks':
        return (
          <div className="grid gap-3 md:gap-4 max-w-3xl mx-auto">
            {data.risks.map((text, i) => (
              <div key={i} className="bg-rose-50/80 dark:bg-rose-950/30 backdrop-blur-md p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-sm flex gap-3 items-start relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                <div className="bg-rose-100 text-rose-600 dark:bg-rose-900/50 p-2 rounded-full shrink-0 group-hover:rotate-12 transition-transform">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <p className="text-rose-900 dark:text-rose-200 text-sm pt-0.5 font-medium">{text}</p>
              </div>
            ))}
          </div>
        )
      
      case 'win_strategy':
        return (
          <div className="grid gap-3 md:gap-4 max-w-3xl mx-auto">
            {data.win_strategy?.map((text, i) => (
              <div key={i} className="bg-amber-50/80 dark:bg-amber-950/30 backdrop-blur-md p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-sm flex gap-3 items-start relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                <div className="bg-amber-100 text-amber-600 dark:bg-amber-900/50 p-2 rounded-full shrink-0 group-hover:scale-110 transition-transform">
                  <Swords className="w-4 h-4" />
                </div>
                <p className="text-amber-900 dark:text-amber-200 text-sm pt-0.5 font-medium">{text}</p>
              </div>
            ))}
          </div>
        )
      
      case 'objections':
        return (
          <div className="max-w-4xl mx-auto space-y-4">
            {data.objections?.map((obj, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:border-violet-300 dark:hover:border-violet-700 transition-colors">
                <div className="bg-slate-50 dark:bg-zinc-950/50 p-4 flex gap-3 items-start border-b border-slate-100 dark:border-zinc-800">
                  <div className="bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 p-1 rounded shrink-0 mt-0.5">
                    <span className="font-bold text-[10px] uppercase tracking-wider">Klien</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-sm font-medium italic">"{obj.objection}"</p>
                </div>
                <div className="p-4 flex gap-3 items-start bg-violet-50/30 dark:bg-violet-900/10">
                  <div className="bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 p-1 rounded shrink-0 mt-0.5">
                    <span className="font-bold text-[10px] uppercase tracking-wider">Kita</span>
                  </div>
                  <p className="text-violet-900 dark:text-violet-200 text-sm font-medium">{obj.response}</p>
                </div>
              </div>
            ))}
          </div>
        )

      case 'next_steps':
        return (
          <div className="max-w-4xl mx-auto space-y-3">
            {data.next_steps.map((item, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors shadow-sm">
                <div className="flex gap-3 items-center">
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">{item.action}</p>
                </div>
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-bold tracking-wide shrink-0",
                  item.priority.toLowerCase().includes('high') ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300" :
                  item.priority.toLowerCase().includes('med') ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" :
                  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                )}>
                  {item.priority.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )
      
      case 'questions':
        return (
          <div className="max-w-3xl mx-auto space-y-4">
            {data.questions.map((text, i) => (
              <div key={i} className="flex gap-3 items-end">
                <div className="bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 p-2 rounded-full shrink-0 mb-1">
                  <Target className="w-4 h-4" />
                </div>
                <div className="bg-slate-100 dark:bg-zinc-800 p-4 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-zinc-700 shadow-sm">
                  <p className="text-slate-800 dark:text-slate-200 text-sm font-medium">{text}</p>
                </div>
              </div>
            ))}
          </div>
        )
      
      default:
        return null
    }
  }

  // Helper component for dynamic icon rendering without breaking rules
  const HeaderIcon = stepInfo?.icon || ShieldCheck;

  return (
    <div className="flex flex-col h-[85vh] bg-slate-50/50 dark:bg-zinc-950/50 backdrop-blur-3xl rounded-xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-zinc-800/50 font-sans antialiased">
      
      {/* Top Header / Progress (Sleek minimalist style) */}
      <div className="p-6 pb-2 shrink-0 z-10 flex items-center justify-between">
        <div className="flex gap-1.5 items-center">
          {activeSteps.map((s, idx) => (
            <div 
              key={s.id} 
              className={cn(
                "h-1.5 rounded-full transition-all duration-500 ease-out",
                idx === currentStep ? `w-8 ${stepInfo.colorTheme.bg}` : 
                idx < currentStep ? `w-2 ${stepInfo.colorTheme.bg} opacity-50` : "w-2 bg-slate-200 dark:bg-zinc-800"
              )} 
            />
          ))}
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {currentStep + 1} / {activeSteps.length}
        </div>
      </div>

      {/* Main Content Card with Scroll Masking for Smooth Fade-out */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4 md:px-12 md:py-8"
        style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)' }}
      >
        <div key={stepInfo.id} className="animate-in fade-in slide-in-from-right-8 duration-500 fill-mode-both h-full flex flex-col">
          
          <div className="flex flex-col items-center mb-6 mt-2">
            <div className={cn(
              "p-3 rounded-xl mb-3 shadow-sm dark:bg-opacity-30",
              stepInfo.colorTheme.light, stepInfo.colorTheme.text
            )}>
              <HeaderIcon className="w-8 h-8" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800 dark:text-white">{stepInfo.title}</h2>
          </div>
          
          <div className="flex-1 pb-24">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Footer Navigation Controls (Frosted Glass Panel) */}
      <div className="px-6 py-3 flex justify-between items-center shrink-0 z-10 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-lg border-t border-slate-200/50 dark:border-zinc-800/50">
        <Button 
          variant="ghost" 
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          className={cn(
            "gap-2 h-10 px-4 rounded-xl font-bold transition-all",
            currentStep === 0 ? "opacity-0 pointer-events-none" : "hover:bg-slate-200 dark:hover:bg-zinc-800"
          )}
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        
        <Button 
          onClick={() => {
            if (currentStep === activeSteps.length - 1 && onClose) {
              onClose()
            } else {
              setCurrentStep(Math.min(activeSteps.length - 1, currentStep + 1))
            }
          }}
          className={cn(
            "gap-2 h-10 px-6 rounded-xl font-bold text-sm md:text-base transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5",
            currentStep === activeSteps.length - 1 
              ? "bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-zinc-900" 
              : `${stepInfo.colorTheme.bg} ${stepInfo.colorTheme.hover} text-white ${stepInfo.colorTheme.shadow}`
          )}
        >
          {currentStep === activeSteps.length - 1 ? "Selesai" : "Lanjut"} <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
