"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Loader2, Download, Printer, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { GenerateOptionsDialog } from "./GenerateOptionsDialog"
import { ActionPlanViewer } from "./ActionPlanViewer"
import { cn } from "@/lib/utils"

interface AIDocumentsTabProps {
  opportunityId: string
  completenessScore: number
}

const DOCUMENTS = [
  { id: 'design', title: 'ES Action Plan & Insights', desc: 'AI analysis, risk assessment, and recommended next steps.' },
  { id: 'diagram', title: 'Architecture Diagram (Visual)', desc: 'Visual network/solution topology diagram.' },
  { id: 'boq', title: 'Bill of Quantities (BoQ)', desc: 'Structured table of all line items and specifications.' },
  { id: 'bc', title: 'Business Case', desc: 'Justification, ROI, and financial overview.' },
  { id: 'timeline', title: 'Implementation Timeline', desc: 'Project phases and milestones.' },
]

export function AIDocumentsTab({ opportunityId, completenessScore }: AIDocumentsTabProps) {
  const [docs, setDocs] = useState<Record<string, any>>({})
  const [generating, setGenerating] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewDoc, setPreviewDoc] = useState<{id: string, title: string, content: string} | null>(null)
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
          referenceImage: options.referenceImage,
          previousDraft: docs[docId] ? docs[docId].content_html : undefined
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

  const generateActionPlanPrintHtml = (data: any, title: string) => {
    return `
      <div class="header">
        <h1>${title}</h1>
        <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
      </div>
      
      ${data.greeting ? `<div class="greeting"><em>"${data.greeting}"</em></div>` : ''}
      
      <div class="section avoid-break">
        <h2>💡 Peluang & Kekuatan (Insights)</h2>
        <ul>
          ${data.insights?.map((text: string) => `<li>${text}</li>`).join('') || '<li>Tidak ada data.</li>'}
        </ul>
      </div>

      <div class="section alert-box avoid-break">
        <h2 style="color: #b91c1c;">⚠️ Risiko & Informasi Kurang (Risks)</h2>
        <ul>
          ${data.risks?.map((text: string) => `<li>${text}</li>`).join('') || '<li>Tidak ada data.</li>'}
        </ul>
      </div>

      ${data.win_strategy && data.win_strategy.length > 0 ? `
      <div class="section win-box avoid-break">
        <h2 style="color: #b45309;">⚔️ Strategi Tempur (Win Strategy)</h2>
        <ul>
          ${data.win_strategy.map((text: string) => `<li>${text}</li>`).join('')}
        </ul>
      </div>
      ` : '<div class="section win-box avoid-break" style="background:#fee2e2; border-color:#ef4444;"><h2 style="color: #b91c1c;">⚠️ DATA "STRATEGI TEMPUR" KOSONG DARI AI</h2><p>Mohon klik tombol "Regenerate" lagi. AI sebelumnya belum memproduksi data ini.</p></div>'}

      ${data.objections && data.objections.length > 0 ? `
      <div class="section avoid-break">
        <h2 style="color: #6d28d9;">🛡️ Anti-Bantahan Klien (Objection Handling)</h2>
        <div class="objection-list">
          ${data.objections.map((obj: any) => `
            <div class="objection-item">
              <p class="obj-client"><strong>Klien:</strong> "${obj.objection}"</p>
              <p class="obj-kita"><strong>Kita:</strong> ${obj.response}</p>
            </div>
          `).join('')}
        </div>
      </div>
      ` : '<div class="section avoid-break" style="background:#fee2e2; border:1px solid #ef4444; padding:16px; border-radius:8px;"><h2 style="color: #b91c1c;">⚠️ DATA "ANTI-BANTAHAN" KOSONG DARI AI</h2><p>Mohon klik tombol "Regenerate" lagi. AI sebelumnya belum memproduksi data ini.</p></div>'}

      <div class="section avoid-break">
        <h2>📋 Rencana Tindakan (Next Steps)</h2>
        <table>
          <thead>
            <tr>
              <th width="10%">No</th>
              <th width="70%">Tindakan</th>
              <th width="20%">Prioritas</th>
            </tr>
          </thead>
          <tbody>
            ${data.next_steps?.map((item: any, i: number) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td>${item.action}</td>
                <td style="text-align: center; font-weight: bold; ${item.priority.toLowerCase().includes('high') ? 'color: #b91c1c;' : item.priority.toLowerCase().includes('med') ? 'color: #b45309;' : 'color: #15803d;'}">${item.priority.toUpperCase()}</td>
              </tr>
            `).join('') || '<tr><td colspan="3">Tidak ada data.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="section question-box avoid-break">
        <h2>🎯 Pertanyaan Kritis untuk Klien</h2>
        <ol>
          ${data.questions?.map((text: string) => `<li>${text}</li>`).join('') || '<li>Tidak ada data.</li>'}
        </ol>
      </div>
    `
  }

  const getPrintableHtml = (docId: string, htmlContent: string, title: string) => {
    if (docId === 'design') {
      try {
        let cleanJson = htmlContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const data = JSON.parse(cleanJson);
        return generateActionPlanPrintHtml(data, title);
      } catch (e) {
        return htmlContent; // Fallback
      }
    }
    return htmlContent;
  }

  const printDocument = (docId: string, htmlContent: string, title: string) => {
    const finalHtml = getPrintableHtml(docId, htmlContent, title);
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              @page { margin: 2cm; }
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.5; color: #1e293b; max-width: 21cm; margin: 0 auto; }
              h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 8px; font-size: 24px; }
              h2 { color: #334155; margin-top: 24px; margin-bottom: 12px; font-size: 18px; display: flex; align-items: center; }
              .header p { color: #64748b; font-size: 14px; margin-top: 0; }
              .greeting { background: #f8fafc; padding: 16px; border-left: 4px solid #3b82f6; font-size: 16px; color: #475569; margin-bottom: 24px; border-radius: 4px; }
              .section { margin-bottom: 24px; }
              ul, ol { padding-left: 24px; margin: 0; }
              li { margin-bottom: 8px; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
              th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
              th { background-color: #f1f5f9; font-weight: bold; color: #334155; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .alert-box { background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; }
              .win-box { background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 8px; }
              .question-box { background: #fdf4ff; border: 1px solid #fbcfe8; padding: 16px; border-radius: 8px; }
              .objection-list { display: flex; flex-direction: column; gap: 12px; }
              .objection-item { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
              .obj-client { background: #f8fafc; padding: 10px 12px; margin: 0; color: #475569; border-bottom: 1px solid #e2e8f0; font-style: italic; }
              .obj-kita { background: #f5f3ff; padding: 10px 12px; margin: 0; color: #5b21b6; }
              .avoid-break { page-break-inside: avoid; }
            </style>
          </head>
          <body>
            ${finalHtml}
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

  const downloadHtml = (docId: string, htmlContent: string, filename: string) => {
    const finalHtml = getPrintableHtml(docId, htmlContent, filename);
    const blob = new Blob([`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${filename}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 0 20px; }
          /* Same basic styles for offline viewing */
          h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
          .alert-box { background: #fef2f2; padding: 15px; border-radius: 5px; }
          .win-box { background: #fffbeb; padding: 15px; border-radius: 5px; }
          .question-box { background: #fdf4ff; padding: 15px; border-radius: 5px; }
          .objection-item { border: 1px solid #ddd; margin-bottom: 10px; border-radius: 4px; }
          .obj-client { background: #f9f9f9; padding: 8px; margin: 0; border-bottom: 1px solid #ddd; }
          .obj-kita { background: #f3e8ff; padding: 8px; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 10px; }
          th { background: #f5f5f5; }
        </style>
      </head>
      <body>${finalHtml}</body>
      </html>
    `], { type: 'text/html' })
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
                      onClick={() => setPreviewDoc({ id: doc.id, title: doc.title, content: docData.content_html })}
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
                      onClick={() => printDocument(doc.id, docData.content_html, doc.title)}
                    >
                      <Printer className="mr-2 h-3 w-3" /> Print PDF
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="w-full text-xs"
                      onClick={() => downloadHtml(doc.id, docData.content_html, `${doc.id}_document`)}
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
        <DialogContent className={cn(
          "flex flex-col bg-white dark:bg-zinc-950 overflow-hidden",
          previewDoc?.id === 'design' ? "sm:max-w-[1000px] p-0 border-none bg-transparent shadow-none" : "sm:max-w-[800px] max-h-[85vh] p-6"
        )}>
          {previewDoc?.id === 'design' ? (
             <ActionPlanViewer htmlContent={previewDoc.content} onClose={() => setPreviewDoc(null)} />
          ) : (
            <>
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
