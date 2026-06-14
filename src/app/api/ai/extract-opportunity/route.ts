import { NextRequest, NextResponse } from "next/server"
import { extractOpportunityData } from "@/lib/gemini"

export const maxDuration = 60; // Increase max duration for Vercel if needed

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const text = formData.get("text") as string
    const file = formData.get("file") as File | null

    const parts: any[] = []

    if (text && text.trim().length > 0) {
      parts.push({ text: text })
    }

    if (file) {
      const buffer = await file.arrayBuffer()
      const base64Data = Buffer.from(buffer).toString("base64")
      
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        }
      })
    }

    if (parts.length === 0) {
      return NextResponse.json({ error: "Please provide either text or a file." }, { status: 400 })
    }

    const extractedData = await extractOpportunityData(parts)
    
    return NextResponse.json(extractedData)

  } catch (error: any) {
    console.error("Extraction error:", error)
    return NextResponse.json({ error: error.message || "Failed to extract data" }, { status: 500 })
  }
}
