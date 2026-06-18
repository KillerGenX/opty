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
      accruedRevenueMtd,
      totalMrrPipeline,
      totalOtcPipeline,
      totalPipelineValue,
      winRate,
      recurringRatio,
      stagnantDealsCount,
      topStagnantDeals,
      topDeals,
      stageBreakdown,
      pillarBreakdown,
      topCustomers,
    } = payload

    const periodLabel = period || 'Bulan Ini'

    const prompt = `Anda adalah seorang Presales / Enterprise Solution Director yang sedang memberikan laporan "Executive Brief" kepada jajaran Manajemen.
Fokus Anda adalah mengawal kesiapan teknis dari setiap peluang bisnis (seperti kelancaran PoC, kelengkapan spesifikasi/sizing, dan deteksi hambatan teknis). Anda harus menyampaikannya dalam bahasa bisnis/eksekutif yang natural, mengalir, dan mudah dicerna oleh manajemen non-teknis. Hindari penggunaan jargon teknis yang kaku, bersayap, atau berlebihan (buzzwords).

PERIODE ANALISIS: ${periodLabel}

KESEHATAN FINANSIAL PIPELINE:
- MRR Pipeline Aktif (Recurring): ${totalMrrPipeline} per bulan
- OTC Pipeline Aktif (One-Time): ${totalOtcPipeline}
- Total TCV Pipeline: ${totalPipelineValue}
- Accrued Revenue (MTD): ${accruedRevenueMtd}
- Recurring Ratio (MRR vs TCV): ${recurringRatio}%
- Win Rate (${periodLabel}): ${winRate}%
- Deals Membutuhkan Perhatian (>7 hari stagnan): ${stagnantDealsCount} deals

TOP 3 DEALS TERBESAR (Peluang Utama):
${(topDeals || []).map((d: string) => `- ${d}`).join('\n')}

DEALS YANG STAGNAN (Risiko Teknis/Implementasi):
${(topStagnantDeals || []).map((d: string) => `- ${d}`).join('\n')}

DISTRIBUSI PRODUK / SOLUSI:
${(pillarBreakdown || []).map((p: string) => `- ${p}`).join('\n')}

TOP CUSTOMERS:
${(topCustomers || []).map((c: string) => `- ${c}`).join('\n')}

ATURAN PENULISAN:
1. DILARANG KERAS menggunakan salam pembuka (seperti "Selamat pagi", "Bapak/Ibu sekalian"). Langsung mulai ke baris pertama tanpa basa-basi.
2. Format laporan HANYA dalam bentuk 3 poin utama yang sangat singkat, padat, dan langsung ke inti. JANGAN membuat narasi panjang. Gunakan angka (1, 2, 3) untuk poin Anda:
   - Poin 1 (Executive Overview): Tinjauan kesehatan pipeline dari kacamata operasional dan dampaknya pada potensi pendapatan.
   - Poin 2 (Deal Intelligence): Soroti Top Deals dan Deals Stagnan berdasarkan "Catatan Terakhir". Beritahu secara gamblang apa yang menahan deal tersebut.
   - Poin 3 (Strategic Action Plan): Berikan 2 instruksi operasional singkat untuk tim Anda minggu ini agar deal tidak mandek.
3. Gunakan sudut pandang orang pertama jamak ("Kami"). Anda mewakili tim Anda sendiri.
4. Gunakan nada profesional namun luwes. JANGAN gunakan istilah teknis atau singkatan bahasa Inggris (seperti "PoC", "Proof of Concept", "deep-dive", "sizing"). Gunakan bahasa Indonesia yang umum seperti "uji coba", "penilaian kebutuhan", atau "persiapan teknis".
5. Masukkan angka-angka penting (seperti MRR dan Win Rate) ke dalam poin-poin tersebut.
6. DILARANG KERAS menggunakan format markdown (seperti bintang ganda ** atau tunggal * untuk tebal/miring). Tulis jawaban sebagai plain text murni. Gunakan spasi enter untuk memisahkan poin.

Tulis Executive Brief Anda:`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    })

    const summary = response.text || "Gagal mendapatkan respons dari AI."

    return NextResponse.json({ summary })
  } catch (error: any) {
    console.error('AI Summary Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate summary' }, { status: 500 })
  }
}
