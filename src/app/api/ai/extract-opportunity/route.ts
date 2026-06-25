import { NextRequest, NextResponse } from "next/server"
import { extractOpportunityData } from "@/lib/gemini"
import { createClient } from "@/lib/supabase/server"



export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const text = formData.get("text") as string
    const files = formData.getAll("files") as File[]

    const parts: any[] = []

    if (text && text.trim().length > 0) {
      parts.push({ text: text })
    }

    for (const file of files) {
      if (file && file.size > 0) {
        const buffer = await file.arrayBuffer()
        const base64Data = Buffer.from(buffer).toString("base64")
        
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        })
      }
    }

    if (parts.length === 0) {
      return NextResponse.json({ error: "Please provide either text or a file." }, { status: 400 })
    }

    // Fetch dynamic master data for AI prompt
    const supabase = await createClient()
    const [settingsRes, catalogRes] = await Promise.all([
      supabase.from('master_settings').select('*').eq('is_active', true),
      supabase.from('product_catalog').select('*').eq('is_active', true)
    ])
    
    const masterData = {
      types: settingsRes.data?.filter(s => s.category === 'OPPORTUNITY_TYPE').map(s => s.label) || [],
      industries: settingsRes.data?.filter(s => s.category === 'INDUSTRY').map(s => s.label) || [],
      segments: settingsRes.data?.filter(s => s.category === 'SEGMENT').map(s => s.label) || [],
      pillars: Array.from(new Set(catalogRes.data?.map(p => p.pillar_name) || []))
    }

    const extractedData = await extractOpportunityData(parts, masterData)
    
    return NextResponse.json(extractedData)

  } catch (error: any) {
    console.error("Extraction error:", error)
    return NextResponse.json({ error: error.message || "Failed to extract data" }, { status: 500 })
  }
}
