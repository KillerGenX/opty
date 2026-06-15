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
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("text")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)])
      setError("")
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const pastedFiles = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf')
      if (pastedFiles.length > 0) {
        setFiles(prev => [...prev, ...pastedFiles])
        setError("")
        setActiveTab("file")
      }
    }
  }

  const handleExtract = async () => {
    if (!text.trim() && files.length === 0) {
      setError("Please provide either text or at least one file.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const formData = new FormData()
      if (text.trim()) formData.append("text", text)
      files.forEach(file => formData.append("files", file))

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
      setFiles([])
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
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col bg-slate-50 dark:bg-zinc-950" onPaste={handlePaste}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-emerald-800 dark:text-emerald-400">
            <Sparkles className="h-5 w-5" /> Magic AI Extraction
          </DialogTitle>
          <DialogDescription>
            Let Gemini 3.5 Flash read your emails, ToR PDFs, or screenshots to automatically fill out the opportunity details.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex-1 overflow-y-auto pr-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                  multiple
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                />
                
                {files.length > 0 ? (
                  <div className="w-full flex flex-col gap-2 text-left">
                    <p className="font-medium text-slate-700 dark:text-zinc-300 text-center mb-2">Selected Files ({files.length})</p>
                    {files.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-100 dark:bg-zinc-800 p-2 rounded-md">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <p className="text-sm font-medium truncate">{f.name}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="text-red-500 h-6 px-2 hover:bg-red-100 dark:hover:bg-red-900/30">Remove</Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="mt-2">
                      Add More Files
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 text-slate-400 mb-4">
                      <FileText className="h-8 w-8" />
                      <ImageIcon className="h-8 w-8" />
                    </div>
                    <p className="font-medium text-slate-700 dark:text-zinc-300">Click to upload or Paste (Ctrl+V) Images</p>
                    <p className="text-xs text-slate-500 mt-2">Supports .pdf, .png, .jpg (Multiple files allowed)</p>
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
              disabled={loading || (!text.trim() && files.length === 0)}
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
