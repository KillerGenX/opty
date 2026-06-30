import { NextResponse } from 'next/server'



import { getAi, MODEL_SMART } from '@/lib/gemini'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const payload = await req.json()
    const { message, history, context } = payload

    const systemInstruction = `Anda adalah Presales / Enterprise Solution Director AI yang bertindak sebagai partner strategis untuk menjawab pertanyaan user.
Tugas Anda adalah membahas pipeline perusahaan dan kesiapan teknis/solusinya. Jawablah menggunakan bahasa bisnis yang natural, luwes, dan mudah dipahami, layaknya berdiskusi santai dengan eksekutif non-teknis. JANGAN gunakan istilah teknis atau singkatan bahasa Inggris (seperti "PoC", "Proof of Concept", "deep-dive", "sizing"). Gunakan bahasa Indonesia yang umum.
Gunakan sudut pandang orang pertama jamak ("Kami"). Anda mewakili tim Presales Anda sendiri.
Jawab dengan poin-poin singkat (bullet points) dan langsung ke inti. JANGAN membuat narasi panjang. DILARANG KERAS menggunakan salam pembuka (seperti "Halo", "Selamat pagi"). Gunakan angka aktual dari konteks. Jika di luar konteks, ingatkan dengan sopan.
DILARANG KERAS menggunakan format markdown (seperti bintang ganda ** atau tunggal * untuk tebal/miring). Tulis jawaban sebagai teks biasa (plain text murni). Gunakan angka (1, 2, 3) atau strip (-) untuk memisahkan poin.`

    const prompt = `KONTEKS PIPELINE:
Total Deals Aktif: ${context.activeDeals}
Accrued Revenue MTD (${context.period}): ${context.accruedRevenueMtd}
MRR Pipeline Aktif: ${context.totalMrrPipeline} per bulan
OTC Pipeline Aktif: ${context.totalOtcPipeline}
Total TCV Pipeline: ${context.totalPipelineValue}
Win Rate (${context.period}): ${context.winRate}%

Data Mentah Deals Aktif & Won (lengkap dengan MRR, OTC, TCV):
${JSON.stringify(context.rawDealsSummary, null, 2)}

Pertanyaan User: ${message}`

    const aiHistory = (history || []).map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }))

    const response = await getAi().models.generateContent({
      model: MODEL_SMART,
      contents: [...aiHistory, { role: 'user', parts: [{ text: prompt }]}],
      config: {
        temperature: 0.7,
        systemInstruction: systemInstruction
      }
    })

    const reply = response.text || "Maaf, saya tidak dapat merespons saat ini."

    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error('AI Pipeline Chat Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate chat reply' }, { status: 500 })
  }
}
