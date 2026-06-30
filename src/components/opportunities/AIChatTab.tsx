"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2, Sparkles, User, Trash2, Paperclip, X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"

interface AIChatTabProps {
  opportunityId: string
  opportunityName?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  user_email?: string
}

export function AIChatTab({ opportunityId, opportunityName }: AIChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchHistory()
  }, [opportunityId])

  useEffect(() => {
    if (!loading) {
      // Only scroll to bottom on initial load completion
      scrollToBottom()
    }
  }, [loading])

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  const fetchHistory = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('opportunity_chats')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data)
    }
    setLoading(false)
  }

  const handleSend = async () => {
    if ((!input.trim() && !attachedImage) || sending) return

    const userMessageContent = input.trim()
    const currentAttachedImage = attachedImage
    
    setInput("")
    setAttachedImage(null)
    setSending(true)

    // Optimistically add user message
    const tempId = Date.now().toString()
    let displayContent = userMessageContent
    if (currentAttachedImage) {
      displayContent = `[IMAGE:${currentAttachedImage}]\n${displayContent}`
    }

    setMessages(prev => [...prev, {
      id: tempId,
      role: 'user',
      content: displayContent,
      created_at: new Date().toISOString()
    }])

    setTimeout(() => scrollToBottom(), 50)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId,
          message: userMessageContent,
          imageBase64: currentAttachedImage,
          chatHistory: messages.map(m => ({ role: m.role, content: m.content })).slice(-20)
        })
      })

      if (!res.ok) throw new Error("Failed to send message")
      
      // Refresh to get actual DB IDs and emails
      await fetchHistory()
      
    } catch (error: any) {
      console.error("Chat error", error)
      // Remove optimistic message if failed
      setMessages(prev => prev.filter(m => m.id !== tempId))
      toast.error('Gagal mengirim pesan', { description: 'Tolong coba lagi beberapa saat.' })
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (event) => {
            setAttachedImage(event.target?.result as string)
          }
          reader.readAsDataURL(file)
        }
        break
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setAttachedImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const clearHistory = async () => {
    if (!confirm("Are you sure you want to clear the entire chat history for this opportunity?")) return;
    
    await supabase.from('opportunity_chats').delete().eq('opportunity_id', opportunityId)
    setMessages([])
  }

  const renderedMessages = useMemo(() => {
    return messages.map((msg) => {
      let textContent = msg.content
      let imageUrl = null

      if (textContent.startsWith('[IMAGE:data:image/')) {
        const endIdx = textContent.indexOf(']\n')
        if (endIdx !== -1) {
          imageUrl = textContent.substring(7, endIdx)
          textContent = textContent.substring(endIdx + 2)
        }
      }

      return (
        <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
          <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-200 dark:bg-zinc-800 text-slate-600' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'}`}>
            {msg.role === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          </div>
          <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
            <span className="text-xs text-slate-400 mb-1 px-1">
              {msg.role === 'user' ? msg.user_email || 'You' : 'Opty AI'}
            </span>
            <div className={`p-2.5 rounded-2xl whitespace-pre-wrap text-[13px] shadow-sm flex flex-col gap-1.5 ${
              msg.role === 'user' 
                ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-tr-sm' 
                : 'bg-white border border-slate-200 text-slate-800 dark:bg-zinc-900 dark:border-zinc-800 dark:text-slate-200 rounded-tl-sm'
            }`}>
              {imageUrl && (
                <img src={imageUrl} alt="Attached" className="max-w-xs md:max-w-sm rounded-lg border border-slate-200/20" />
              )}
              {msg.role === 'user' ? (
                textContent
              ) : (
                <div className="prose dark:prose-invert max-w-none prose-p:text-[13px] prose-li:text-[13px] prose-a:text-[13px] prose-strong:text-[13px] prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-li:my-0">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li className="marker:text-slate-400 dark:marker:text-slate-500" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-slate-900 dark:text-zinc-100" {...props} />,
                      a: ({node, ...props}) => <a className="text-emerald-600 hover:underline" {...props} />,
                    }}
                  >
                    {textContent}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    })
  }, [messages])

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[600px] border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Opty AI Co-Pilot</h3>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearHistory} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 h-8 px-2">
            <Trash2 className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-4 bg-slate-50/30 dark:bg-zinc-900/10"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 space-y-4">
            <Sparkles className="h-12 w-12 opacity-20" />
            <p className="text-center max-w-sm">
              I am Opty AI. I have read the complete details, line items, and generated documents for <strong>{opportunityName || 'this opportunity'}</strong>. <br/><br/> Ask me anything, or paste meeting notes to update my knowledge!
            </p>
          </div>
        ) : (
          renderedMessages
        )}
        {sending && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </div>
            <div className="p-3 bg-white border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 dark:bg-zinc-950 dark:border-zinc-800">
        {attachedImage && (
          <div className="mb-3 relative inline-block">
            <div className="absolute -top-2 -right-2 z-10">
              <Button size="icon" variant="destructive" className="h-5 w-5 rounded-full" onClick={() => setAttachedImage(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <img src={attachedImage} alt="Preview" className="h-20 rounded-md border border-slate-200 dark:border-zinc-800 shadow-sm object-cover" />
          </div>
        )}
        <div className="relative flex items-end gap-2">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
          />
          <Button 
            size="icon" 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            className="h-11 w-11 shrink-0 rounded-xl bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-emerald-600"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Ask a question or paste meeting notes/images here..."
            className="min-h-[44px] max-h-[200px] py-3 resize-y bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl pr-12 focus-visible:ring-emerald-500"
          />
          <Button 
            size="icon" 
            onClick={handleSend}
            disabled={(!input.trim() && !attachedImage) || sending}
            className="absolute right-2 bottom-1.5 h-8 w-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
          </Button>
        </div>
      </div>

    </div>
  )
}
