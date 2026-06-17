"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Trash2, AlertTriangle } from "lucide-react"

export function OpportunityHeaderActions({ optyId, currentStage, stages }: { optyId: string, currentStage: string, stages: string[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [open, setOpen] = useState(false)



  const handleStageChange = async (newStage: string | null) => {
    if (!newStage || newStage === currentStage) return;
    
    setUpdating(true)
    const { error } = await supabase
      .from('opportunities')
      .update({ stage: newStage })
      .eq('id', optyId)
    
    if (!error) {
      // Record activity log
      const { data: { session } } = await supabase.auth.getSession()
      const email = session?.user?.email || 'System'
      
      await supabase.from('opportunity_activities').insert([{
        opportunity_id: optyId,
        activity_type: 'STAGE_CHANGE',
        description: `Stage changed from "${currentStage}" to "${newStage}"`,
        created_by: email
      }])

      router.refresh()
    } else {
      alert("Failed to update stage: " + error.message)
    }
    setUpdating(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', optyId)
    
    if (!error) {
      router.push('/opportunities')
      router.refresh()
    } else {
      setDeleting(false)
      alert("Failed to delete opportunity: " + error.message)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={currentStage} onValueChange={handleStageChange} disabled={updating}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Stage" />
        </SelectTrigger>
        <SelectContent>
          {stages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      
      <Button 
        variant="outline" 
        size="icon" 
        className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 border-red-200 dark:border-red-900/30"
        disabled={deleting}
        title="Delete Opportunity"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <DialogTitle>Delete Opportunity</DialogTitle>
                <DialogDescription className="mt-1.5">
                  Are you absolutely sure? This will permanently delete this opportunity and all of its associated data (line items, documents).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Yes, delete it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
