import { NextResponse } from 'next/server'
import '@/lib/gcp-setup'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT_ID as string,
  location: 'us-central1'
})

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const { message, history, context } = payload

    const prompt = `Anda adalah Presales Director AI yang cerdas. Tugas Anda adalah menjawab pertanyaan user tentang pipeline perusahaan berdasarkan data konteks berikut.
Jawab dengan ringkas, profesional, langsung ke inti (maksimal 2-3 paragraf), dan gunakan bahasa Indonesia. Tidak perlu salam pembuka. Gunakan angka dan data aktual dari konteks yang diberikan. Jika pertanyaan di luar konteks pipeline, ingatkan dengan sopan bahwa Anda hanya bertugas menganalisis pipeline.

KONTEKS PIPELINE:
Total Deals Aktif: ${context.activeDeals}
Total Booked (${context.period}): ${context.wonThisMonthValue}
Total Pipeline Aktif: ${context.totalPipelineValue}
Win Rate (${context.period}): ${context.winRate}%

Data Mentah Deals Aktif & Won (hanya kolom kunci):
${JSON.stringify(context.rawDealsSummary, null, 2)}

Pertanyaan User: ${message}
`

    const aiHistory = (history || []).map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }))

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [...aiHistory, { role: 'user', parts: [{ text: prompt }]}],
      config: {
        temperature: 0.3,
        maxOutputTokens: 1000,
      }
    })

    const reply = response.text || "Maaf, saya tidak dapat merespons saat ini."

    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error('AI Pipeline Chat Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate chat reply' }, { status: 500 })
  }
}
