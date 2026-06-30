import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'



import { getAi, MODEL_SMART } from '@/lib/gemini'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { opportunityId, message, chatHistory, imageBase64 } = await req.json()

    if (!opportunityId || (!message && !imageBase64)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 1. Fetch Opportunity
    const { data: opty } = await supabase.from('opportunities').select('*').eq('id', opportunityId).single()
    
    // 2. Fetch Line Items
    const { data: lineItems } = await supabase.from('opportunity_line_items').select('*').eq('opportunity_id', opportunityId)

    // 3. Fetch Generated Documents
    const { data: documents } = await supabase.from('opportunity_documents').select('doc_type, content_html').eq('opportunity_id', opportunityId)

    // 4. Construct CAG System Context
    let systemPrompt = `[SYSTEM] You are an expert Enterprise Presales AI Co-Pilot named "Opty AI".
You are assisting ${user.email} with the following Opportunity.

=== OPPORTUNITY DETAILS ===
Name: ${opty?.opportunity_name}
Customer: ${opty?.customer_name}
Industry: ${opty?.customer_industry}
Budget/Value: Rp ${opty?.total_value?.toLocaleString() || 0}
Stage: ${opty?.stage}
Scope: ${opty?.scope_of_work}
Technical Reqs: ${opty?.technical_requirements}
Pain Points: ${opty?.pain_points}
Competitors: ${opty?.competitors}

=== LINE ITEMS ===
${lineItems?.map((item: any) => `- [${item.pillar}] ${item.product_name} | Qty: ${item.quantity} | MRC: Rp${item.mrc} | OTC: Rp${item.otc}`).join('\n')}

=== GENERATED DOCUMENTS ===
`
    if (documents && documents.length > 0) {
      documents.forEach(doc => {
        // Strip HTML tags for token efficiency using simple regex, and truncate if still too long
        const cleanText = (doc.content_html || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()
        systemPrompt += `\n--- Document Type: ${doc.doc_type} ---\n${cleanText.substring(0, 3000)}\n`
      })
    } else {
      systemPrompt += "No documents have been generated yet.\n"
    }

    systemPrompt += `
[YOUR ROLE & PERSONA]
You are an elite Enterprise B2B Presales & Solutions Architect Co-Pilot named "Opty AI".
Your tone is professional, highly strategic, proactive, and deeply analytical. You communicate clearly like a seasoned consultant advising a sales executive.

[CRITICAL INSTRUCTIONS]
1. Base your answers strictly on the context provided above (Opportunity Details, Line Items, and Generated Documents).
2. If the user asks for advice, provide strategic, actionable next steps to win the deal (e.g., stakeholder mapping, competitive positioning, mitigating technical risks).
3. Always structure your responses beautifully using Markdown (bolding, bullet points) for readability.
4. Answer in the same language the user uses (default to Indonesian for local context).
5. DO NOT hallucinate features or specs not found in the context.`

    // Combine imageBase64 and message for database storage
    let finalDbMessage = message || ""
    if (imageBase64) {
      finalDbMessage = `[IMAGE:${imageBase64}]\n${finalDbMessage}`
    }

    // Save USER message to database
    await supabase.from('opportunity_chats').insert([
      { opportunity_id: opportunityId, user_email: user.email, role: 'user', content: finalDbMessage }
    ])

    // Format history for Google Gen AI
    const formattedHistory = (chatHistory || []).map((msg: any) => {
      let textContent = msg.content
      const parts: any[] = []
      
      if (textContent.startsWith('[IMAGE:data:image/')) {
        const endIdx = textContent.indexOf(']\n')
        if (endIdx !== -1) {
          const imgData = textContent.substring(7, endIdx) // extract data:image/...
          textContent = textContent.substring(endIdx + 2) // the rest of the text
          const [mimeInfo, base64Data] = imgData.split(',')
          const mimeType = mimeInfo.split(':')[1].split(';')[0]
          parts.push({ inlineData: { mimeType, data: base64Data } })
        }
      }
      
      parts.push({ text: textContent })
      
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: parts
      }
    })

    // Also format the CURRENT message for Gemini
    const currentParts: any[] = []
    if (imageBase64) {
      const [mimeInfo, base64Data] = imageBase64.split(',')
      const mimeType = mimeInfo.split(':')[1].split(';')[0]
      currentParts.push({ inlineData: { mimeType, data: base64Data } })
    }
    if (message) {
      currentParts.push({ text: message })
    }

    const chatSession = getAi().chats.create({
      model: MODEL_SMART,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.5,
      },
      history: formattedHistory
    })

    const response = await chatSession.sendMessage({ message: currentParts })
    const assistantMessage = response.text || "I'm sorry, I couldn't generate a response."

    // Save ASSISTANT message to database
    await supabase.from('opportunity_chats').insert([
      { opportunity_id: opportunityId, user_email: 'Opty AI', role: 'assistant', content: assistantMessage }
    ])

    return NextResponse.json({ message: assistantMessage })

  } catch (error: any) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
