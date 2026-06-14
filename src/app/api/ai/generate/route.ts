import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateContent } from '@/lib/gemini'
import { getPrompt } from '@/lib/prompts'

// Force recompile to ensure updated prompt is used by Next.js cache
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { opportunityId, docType, referenceImage, additionalContext } = body

    if (!opportunityId || !docType) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Fetch opportunity and line items
    const { data: opty, error: optyError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .single()

    if (optyError || !opty) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    }

    const { data: lineItems, error: itemsError } = await supabase
      .from('opportunity_line_items')
      .select('*')
      .eq('opportunity_id', opportunityId)

    if (itemsError) {
      return NextResponse.json({ error: 'Error fetching line items' }, { status: 500 })
    }

    // Generate prompt
    const prompt = getPrompt(docType, opty, lineItems || [])

    // Call Gemini
    let htmlContent = await generateContent(prompt, referenceImage, additionalContext)

    if (docType === 'diagram') {
      // Clean up markdown blocks if the AI added them
      let rawMermaid = htmlContent.replace(/```mermaid\n?/g, '').replace(/```html\n?/g, '').replace(/```\n?/g, '').trim()
      // Strip any existing pre tags
      rawMermaid = rawMermaid.replace(/<pre class="mermaid">/g, '').replace(/<\/pre>/g, '').trim()
      
      try {
        // Render server-side using Kroki.io
        const krokiRes = await fetch('https://kroki.io/mermaid/svg', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: rawMermaid
        })

        if (!krokiRes.ok) {
          const errText = await krokiRes.text()
          throw new Error(`Kroki failed: ${errText}`)
        }

        // The SVG is fully rendered and ready to display
        const svgContent = await krokiRes.text()
        
        // Wrap the SVG in a responsive container
        htmlContent = `<div class="my-8 flex justify-center w-full overflow-x-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm diagram-container">\n${svgContent}\n</div>`
      } catch (err: any) {
        console.error("Kroki rendering error:", err)
        // Fallback to text if API fails
        htmlContent = `<div class="bg-red-50 text-red-600 p-4 rounded-md"><strong>Error generating SVG:</strong> ${err.message}</div><pre class="whitespace-pre-wrap text-sm">${rawMermaid}</pre>`
      }
    }

    // Save to database
    const { data: existingDoc } = await supabase
      .from('opportunity_documents')
      .select('id, version')
      .eq('opportunity_id', opportunityId)
      .eq('doc_type', docType)
      .single()

    let result;
    
    if (existingDoc) {
      const { data, error } = await supabase
        .from('opportunity_documents')
        .update({
          content_html: htmlContent,
          prompt_used: prompt,
          generated_by: user.id,
          generated_at: new Date().toISOString(),
          version: existingDoc.version + 1,
          status: 'ready'
        })
        .eq('id', existingDoc.id)
        .select()
      
      if (error) throw error
      result = data[0]
    } else {
      const { data, error } = await supabase
        .from('opportunity_documents')
        .insert([{
          opportunity_id: opportunityId,
          doc_type: docType,
          content_html: htmlContent,
          prompt_used: prompt,
          generated_by: user.id,
          status: 'ready'
        }])
        .select()
        
      if (error) throw error
      result = data[0]
    }

    return NextResponse.json({ success: true, document: result })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
