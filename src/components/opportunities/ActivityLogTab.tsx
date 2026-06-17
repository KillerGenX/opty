"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, Clock, GitCommit, MessageSquare, FileText, CheckCircle2 } from "lucide-react"

interface ActivityLog {
  id: string
  opportunity_id: string
  activity_type: string
  description: string
  created_at: string
  created_by: string | null
}

export function ActivityLogTab({ opportunityId }: { opportunityId: string }) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [dbError, setDbError] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchLogs()
  }, [opportunityId])

  const fetchLogs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('opportunity_activities')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01') {
        // Relation does not exist
        setDbError(true)
      }
      console.error(error)
    } else {
      setLogs(data || [])
    }
    setLoading(false)
  }

  const handleAddNote = async () => {
    if (!note.trim()) return
    setSubmitting(true)
    
    // Get current user email if available
    const { data: { session } } = await supabase.auth.getSession()
    const email = session?.user?.email || 'User'

    const { error } = await supabase
      .from('opportunity_activities')
      .insert([{
        opportunity_id: opportunityId,
        activity_type: 'NOTE',
        description: note.trim(),
        created_by: email
      }])

    if (!error) {
      setNote("")
      fetchLogs()
    }
    setSubmitting(false)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'STAGE_CHANGE': return <GitCommit className="h-4 w-4 text-emerald-500" />
      case 'DOC_GENERATED': return <FileText className="h-4 w-4 text-blue-500" />
      case 'SYSTEM': return <CheckCircle2 className="h-4 w-4 text-slate-400" />
      case 'NOTE':
      default: return <MessageSquare className="h-4 w-4 text-amber-500" />
    }
  }

  if (dbError) {
    return (
      <div className="p-8 text-center border rounded-xl border-dashed border-red-200 bg-red-50/50">
        <h3 className="text-lg font-semibold text-red-800">Database Table Missing</h3>
        <p className="text-red-600 mt-2">
          The <code>opportunity_activities</code> table has not been created yet in Supabase.
          Please run the SQL script provided by the AI to enable the Activity Log feature.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Add Note Input */}
      <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
        <Textarea 
          placeholder="Add a manual note or update about this opportunity..." 
          className="min-h-[80px] bg-white dark:bg-zinc-950 resize-none border-slate-200 dark:border-zinc-800 focus-visible:ring-emerald-500"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex justify-end mt-3">
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            size="sm"
            disabled={!note.trim() || submitting}
            onClick={handleAddNote}
          >
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Post Note
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-4 md:pl-8">
        {/* Vertical Line */}
        <div className="absolute left-[27px] md:left-[43px] top-4 bottom-0 w-px bg-slate-200 dark:bg-zinc-800"></div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Clock className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p>No activity recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {logs.map((log) => (
              <div key={log.id} className="relative flex gap-4 md:gap-6 items-start">
                {/* Icon Marker */}
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white dark:bg-zinc-950 border shadow-sm border-slate-200 dark:border-zinc-800 ring-4 ring-white dark:ring-zinc-950">
                  {getIcon(log.activity_type)}
                </div>

                {/* Content Card */}
                <div className="flex-1 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-zinc-100">
                      {log.created_by || 'System'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">
                    {log.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
