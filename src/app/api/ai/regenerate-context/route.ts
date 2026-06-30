import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'



import { getAi } from '@/lib/gemini'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { opportunityId, currentData } = await req.json()

    if (!opportunityId || !currentData) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Fetch chat history
    const { data: chatHistory } = await supabase
      .from('opportunity_chats')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: true })

    // Fetch AI Documents history
    const { data: documents } = await supabase
      .from('opportunity_documents')
      .select('doc_type, content_html, version')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: true })

    // Fetch Line Items
    const { data: lineItems } = await supabase
      .from('opportunity_line_items')
      .select('*')
      .eq('opportunity_id', opportunityId)

    let contextData = ""

    if (lineItems && lineItems.length > 0) {
      contextData += "### PROJECT LINE ITEMS (BILL OF MATERIALS)\n"
      lineItems.forEach(item => {
        contextData += `- ${item.quantity} ${item.unit} of [${item.pillar}] ${item.product_name} (Spec: ${item.specification || 'N/A'})\n`
      })
      contextData += "\n"
    }

    if (chatHistory && chatHistory.length > 0) {
      contextData += "### RECENT AI CHAT HISTORY (USER DISCUSSIONS)\n"
      chatHistory.forEach(chat => {
        const sender = chat.role === 'user' ? chat.user_email || 'User' : 'Opty AI'
        contextData += `[${new Date(chat.created_at).toLocaleString()}] ${sender}:\n${chat.content}\n\n`
      })
    }

    if (documents && documents.length > 0) {
      contextData += "### EXISTING AI GENERATED DOCUMENTS\n"
      documents.forEach(doc => {
        if (doc.content_html) {
          contextData += `[Doc: ${doc.doc_type} - v${doc.version}]\n${doc.content_html.substring(0, 500)}...\n\n` // Snippet
        }
      })
    }

    const prompt = `You are an expert Enterprise Presales Consultant AI. Your task is to update the 5 main Context fields of an Opportunity. 
You must perform an "Intelligent Merge" using the CURRENT CONTEXT DATA as your baseline foundation, and apply any NEW DEVELOPMENTS (including Line Items) as updates.

CRITICAL RULE 1: DO NOT hallucinate or create a completely new scope if the NEW DEVELOPMENTS only mention minor updates (e.g. budget cut, new competitor). You MUST preserve the core facts from the CURRENT CONTEXT DATA.
CRITICAL RULE 2: You MUST write the output in INDONESIAN LANGUAGE (Bahasa Indonesia) using formal, professional business tone.

CURRENT CONTEXT DATA (The Foundation - DO NOT DISCARD):
- Pain Points: ${currentData.pain_points}
- Scope of Work: ${currentData.scope_of_work}
- Technical Requirements: ${currentData.technical_requirements}
- Constraints: ${currentData.constraints}
- Competitors: ${currentData.competitors}

NEW DEVELOPMENTS (Chat History, Documents, & Line Items - Use this to PATCH the foundation):
${contextData ? contextData : "No new developments. Just format the CURRENT CONTEXT DATA."}

ENTERPRISE FORMATTING INSTRUCTIONS (IN INDONESIAN):
You must rewrite the merged data using strict Enterprise B2B standards:
1. "pain_points": Write using "As-Is -> Business Impact -> To-Be (Objective)" logical flow. Focus on business outcomes, not just IT problems.
2. "scope_of_work": Focus on "Phases & Deliverables" (e.g., Procurement, Implementation, Testing, Support). DO NOT list raw quantities or SKUs (e.g. do not say "24 Units of RAM"). Keep it high-level.
3. "technical_requirements": Focus on Performance Metrics, Capacity, Compatibility, Availability, and Security standards.
4. "constraints": Categorize risks clearly (e.g., Commercial/Budget Constraints, Timeline Risks, Technical/Integration Risks, Operational Constraints). Mention hard limits.
5. "competitors": Keep it concise, listing competitors and their pricing/strategy if known.

OUTPUT FORMAT:
Return ONLY a raw JSON object with exactly these 5 keys (all strings):
"pain_points", "scope_of_work", "technical_requirements", "constraints", "competitors".
Do not wrap in \`\`\`json blocks.
`

    const response = await getAi().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    })

    const responseText = response.text
    if (!responseText) {
      throw new Error("Empty response from AI")
    }

    const updatedFields = JSON.parse(responseText)

    return NextResponse.json(updatedFields)

  } catch (error: any) {
    console.error('Error generating AI context:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
