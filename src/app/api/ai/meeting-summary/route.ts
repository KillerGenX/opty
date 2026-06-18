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
    const {
      period,
      totalPipelineValue,
      wonThisMonthValue,
      winRate,
      activeDeals,
      avgDealSize,
      stagnantDealsCount,
      topStagnantDeals,
      topDeals,
      stageBreakdown,
    } = payload

    const periodLabel = period || 'Bulan Ini'

    const prompt = `Anda adalah seorang Presales Director AI yang berpengalaman. Tugas Anda adalah menulis "Executive Summary" berisi 2 paragraf singkat namun padat dalam Bahasa Indonesia untuk rapat manajemen.

PERIODE ANALISIS: ${periodLabel}

DATA PIPELINE REAL-TIME:
- Total Pipeline Aktif (semua deals berjalan): ${totalPipelineValue}
- Total ${activeDeals} deals aktif, rata-rata nilai per deal: ${avgDealSize}
- Booked ${periodLabel}: ${wonThisMonthValue}
- Win Rate periode ${periodLabel}: ${winRate}%
- Deals Stagnan (>7 hari tanpa update): ${stagnantDealsCount} deals

TOP 3 DEALS TERBESAR:
${(topDeals || []).map((d: string) => `- ${d}`).join('\n')}

DISTRIBUSI PER STAGE:
${(stageBreakdown || []).map((s: string) => `- ${s}`).join('\n')}
${stagnantDealsCount > 0 ? `\nDEALS YANG PERLU PERHATIAN:\n${(topStagnantDeals || []).map((d: string) => `- ${d}`).join('\n')}` : ''}

ATURAN PENULISAN:
1. Jangan gunakan salam pembuka (tidak perlu "Selamat pagi", "Bapak/Ibu").
2. Langsung mulai dengan analisis objektif tentang kondisi pipeline.
3. Sebutkan periode analisis (${periodLabel}) secara natural di awal narasi.
4. Paragraf pertama: rangkum kondisi pipeline secara keseluruhan (total nilai, distribusi, deals terbesar).
5. Paragraf kedua: soroti risiko (deals stagnan) dengan nada profesional dan rekomendasi aksi konkret. Jika tidak ada yang stagnan, nyatakan bahwa pipeline bergerak sehat.
6. Jangan gunakan format markdown (bold, italic). Tulis seperti laporan eksekutif.
7. KRITIS: Pastikan kalimat terakhir selesai dengan sempurna dan diakhiri tanda baca. Jangan memotong kalimat.`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.4,
        maxOutputTokens: 1200,
      }
    })

    const summary = response.text || "Gagal mendapatkan respons dari AI."

    return NextResponse.json({ summary })
  } catch (error: any) {
    console.error('AI Summary Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate summary' }, { status: 500 })
  }
}
