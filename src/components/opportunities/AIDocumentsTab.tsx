"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Loader2, Download, Printer, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { GenerateOptionsDialog } from "./GenerateOptionsDialog"

interface AIDocumentsTabProps {
  opportunityId: string
  completenessScore: number
}

const DOCUMENTS = [
  { id: 'design', title: 'High-Level Design (HLD)', desc: 'Architecture overview and technical components.' },
  { id: 'diagram', title: 'Architecture Diagram (Visual)', desc: 'Visual network/solution topology diagram.' },
  { id: 'boq', title: 'Bill of Quantities (BoQ)', desc: 'Structured table of all line items and specifications.' },
  { id: 'bc', title: 'Business Case', desc: 'Justification, ROI, and financial overview.' },
  { id: 'timeline', title: 'Implementation Timeline', desc: 'Project phases and milestones.' },
]

export function AIDocumentsTab({ opportunityId, completenessScore }: AIDocumentsTabProps) {
  const [docs, setDocs] = useState<Record<string, any>>({})
  const [generating, setGenerating] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewDoc, setPreviewDoc] = useState<{title: string, content: string} | null>(null)
  const [optionsDialogState, setOptionsDialogState] = useState<{open: boolean, docId: string, docTitle: string}>({
    open: false,
    docId: '',
    docTitle: ''
  })
  const supabase = createClient()

  useEffect(() => {
    fetchDocs()
  }, [opportunityId])

  const fetchDocs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('opportunity_documents')
      .select('*')
      .eq('opportunity_id', opportunityId)
    
    if (data) {
      const docsMap: Record<string, any> = {}
      data.forEach(d => docsMap[d.doc_type] = d)
      setDocs(docsMap)
    }
    setLoading(false)
  }

  const openGenerateOptions = (docId: string) => {
    const doc = DOCUMENTS.find(d => d.id === docId)
    if (doc) {
      setOptionsDialogState({
        open: true,
        docId: doc.id,
        docTitle: doc.title
      })
    }
  }

  const generateDocument = async (options: { additionalContext?: string, referenceImage?: any }) => {
    const docId = optionsDialogState.docId
    setGenerating(docId)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          opportunityId, 
          docType: docId,
          additionalContext: options.additionalContext,
          referenceImage: options.referenceImage
        })
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to generate document')
      }
      
      const { document } = await res.json()
      setDocs(prev => ({ ...prev, [docId]: document }))
      setOptionsDialogState(prev => ({ ...prev, open: false }))
    } catch (error: any) {
      alert(error.message)
    } finally {
      setGenerating(null)
    }
  }

  const printDocument = (htmlContent: string, title: string) => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px; }
              h1 { color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
              h2 { color: #2563eb; margin-top: 30px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f8fafc; font-weight: bold; }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }
  }

  const downloadHtml = (htmlContent: string, filename: string) => {
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="text-center py-10">Loading documents...</div>

  const isReadyForAi = completenessScore >= 80

  return (
    <div className="space-y-6">
      {!isReadyForAi && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-md text-sm">
          <strong>Warning:</strong> Data completeness is below 80% ({completenessScore}%). AI generated documents might be inaccurate or missing key context. Please fill in more details in the Overview and Line Items tabs.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {DOCUMENTS.map((doc) => {
          const docData = docs[doc.id]
          const isGenerating = generating === doc.id
          const isGenerated = !!docData

          return (
            <Card key={doc.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-md">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{doc.title}</CardTitle>
                  </div>
                  {isGenerated ? (
                    <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Ready</Badge>
                  ) : (
                    <Badge variant="secondary">Not Generated</Badge>
                  )}
                </div>
                <CardDescription className="pt-2">{doc.desc}</CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1">
                {isGenerated && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Version: {docData.version}</p>
                    <p>Generated: {new Date(docData.generated_at).toLocaleString()}</p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-3 border-t flex flex-col gap-2">
                <div className="flex w-full gap-2">
                  <Button 
                    variant="secondary" 
                    className="flex-1"
                    onClick={() => openGenerateOptions(doc.id)}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                    ) : isGenerated ? (
                      "Regenerate"
                    ) : (
                      "Generate with AI"
                    )}
                  </Button>
                  
                  {isGenerated && (
                    <Button 
                      variant="default" 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setPreviewDoc({ title: doc.title, content: docData.content_html })}
                    >
                      <Eye className="mr-2 h-4 w-4" /> View
                    </Button>
                  )}
                </div>
                
                {isGenerated && (
                  <div className="flex gap-2 w-full mt-2">
                    <Button 
                      variant="secondary" 
                      className="w-full text-xs"
                      onClick={() => printDocument(docData.content_html, doc.title)}
                    >
                      <Printer className="mr-2 h-3 w-3" /> Print PDF
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="w-full text-xs"
                      onClick={() => downloadHtml(docData.content_html, `${doc.id}_document`)}
                    >
                      <Download className="mr-2 h-3 w-3" /> Download HTML
                    </Button>
                  </div>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <GenerateOptionsDialog 
        open={optionsDialogState.open}
        onOpenChange={(open) => setOptionsDialogState(prev => ({ ...prev, open }))}
        onGenerate={generateDocument}
        docTitle={optionsDialogState.docTitle}
      />

      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col bg-white dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-emerald-800 dark:text-emerald-400">
              {previewDoc?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-4 pr-2">
            <div 
              className="prose prose-sm md:prose-base dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: previewDoc?.content || '' }} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
