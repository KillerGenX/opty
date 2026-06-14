"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Sparkles, UploadCloud, X, Loader2 } from "lucide-react"

interface GenerateOptionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (options: { additionalContext?: string, referenceImage?: { inlineData: { data: string, mimeType: string } } }) => Promise<void>
  docTitle: string
}

export function GenerateOptionsDialog({ open, onOpenChange, onGenerate, docTitle }: GenerateOptionsDialogProps) {
  const [context, setContext] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type.startsWith("image/") || selectedFile.type === "application/pdf") {
        setFile(selectedFile)
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string)
        }
        reader.readAsDataURL(selectedFile)
      } else {
        alert("Please upload an image or PDF file.")
      }
    }
  }

  const removeFile = () => {
    setFile(null)
    setPreviewUrl(null)
  }

  const handleGenerate = async () => {
    try {
      setIsGenerating(true)
      let referenceImage
      
      if (previewUrl && file) {
        // Base64 string format: data:image/png;base64,iVBORw0KGgo...
        const base64Data = previewUrl.split(",")[1]
        referenceImage = {
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        }
      }

      await onGenerate({ 
        additionalContext: context.trim() ? context.trim() : undefined, 
        referenceImage 
      })
      onOpenChange(false)
    } catch (error) {
      console.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            Generate {docTitle}
          </DialogTitle>
          <DialogDescription>
            Provide additional instructions or upload a reference image for the AI to mimic.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col gap-2">
            <Label>Reference Image (Optional)</Label>
            <div className="text-xs text-slate-500 mb-1">
              Upload an existing Visio screenshot or topology diagram for the AI to replicate.
            </div>
            
            {previewUrl ? (
              <div className="relative rounded-lg border bg-slate-50 p-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 h-6 w-6 rounded-full bg-white shadow-sm border hover:bg-red-50 hover:text-red-600"
                  onClick={removeFile}
                >
                  <X className="h-4 w-4" />
                </Button>
                {file?.type.startsWith('image/') ? (
                  <img src={previewUrl} alt="Reference" className="max-h-48 rounded object-contain mx-auto" />
                ) : (
                  <div className="h-24 flex items-center justify-center text-sm font-medium">
                    PDF Document Attached
                  </div>
                )}
              </div>
            ) : (
              <Label 
                htmlFor="reference-upload" 
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 border-slate-300 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-8 h-8 mb-2 text-slate-400" />
                  <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-slate-500">PNG, JPG, or PDF (Max 5MB)</p>
                </div>
                <input 
                  id="reference-upload" 
                  type="file" 
                  className="hidden" 
                  accept="image/png, image/jpeg, image/webp, application/pdf"
                  onChange={handleFileChange}
                />
              </Label>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Additional Context (Optional)</Label>
            <Textarea 
              placeholder="E.g. Focus heavily on security aspects, use specific terminology, etc."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>Cancel</Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white" 
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Start Generating
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
