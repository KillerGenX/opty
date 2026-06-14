"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, Upload, FileText, ImageIcon, Loader2, CheckCircle2 } from "lucide-react"

export function MagicImportDialog({ onDataExtracted }: { onDataExtracted: (data: any) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setError("")
    }
  }

  const handleExtract = async () => {
    if (!text.trim() && !file) {
      setError("Please provide either text or a file.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const formData = new FormData()
      if (text.trim()) formData.append("text", text)
      if (file) formData.append("file", file)

      const response = await fetch('/api/ai/extract-opportunity', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed to extract data")
      }

      const data = await response.json()
      onDataExtracted(data)
      setOpen(false)
      // reset state
      setText("")
      setFile(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={<Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md border-0" />}
      >
        <Sparkles className="mr-2 h-4 w-4" /> Magic Auto-Fill
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col bg-slate-50 dark:bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-emerald-800 dark:text-emerald-400">
            <Sparkles className="h-5 w-5" /> Magic AI Extraction
          </DialogTitle>
          <DialogDescription>
            Let Gemini 3.5 Flash read your emails, ToR PDFs, or screenshots to automatically fill out the opportunity details.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex-1 overflow-y-auto pr-2">
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="text"><FileText className="h-4 w-4 mr-2" /> Paste Text</TabsTrigger>
              <TabsTrigger value="file"><Upload className="h-4 w-4 mr-2" /> Upload File</TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="space-y-4">
              <Textarea 
                placeholder="Paste the email thread, meeting notes, or project requirements here..."
                className="min-h-[200px] h-[350px] bg-white dark:bg-zinc-900 resize-none border-slate-200 dark:border-zinc-800"
                style={{ fieldSizing: 'fixed' }} // override field-sizing-content from textarea component
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </TabsContent>
            
            <TabsContent value="file" className="space-y-4">
              <div 
                className="border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-xl p-10 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                />
                
                {file ? (
                  <>
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                    <p className="font-medium text-slate-700 dark:text-zinc-300">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <Button variant="link" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="mt-2 text-red-500">Remove</Button>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2 text-slate-400 mb-4">
                      <FileText className="h-8 w-8" />
                      <ImageIcon className="h-8 w-8" />
                    </div>
                    <p className="font-medium text-slate-700 dark:text-zinc-300">Click to upload PDF or Image</p>
                    <p className="text-xs text-slate-500 mt-2">Supports .pdf, .png, .jpg (Max 5MB)</p>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-zinc-800">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button 
              onClick={handleExtract} 
              disabled={loading || (!text.trim() && !file)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-32"
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning...</> : "Extract Data"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
