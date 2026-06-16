export const generatePromptContext = (opty: any, lineItems: any[], outputFormat: 'html' | 'json' = 'html') => {
  const currentDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  
  let context = `
[CONTEXT]
- Current Date Today: ${currentDate}
- Company: Enterprise Solutions Team
- Opportunity Name: ${opty.opportunity_name}
- SFA ID / CRM ID: ${opty.sfa_id || 'Not specified'}
- Quote ID: ${opty.quote_id || 'Not specified'}
- Request Type: ${opty.request_type || 'Not specified'}
- Customer Name: ${opty.customer_name}
- Customer Industry: ${opty.customer_industry || '-'}
- Opportunity Stage: ${opty.stage}
- Expected Close Date: ${opty.expected_close_date || '-'}
- Estimated Value / Budget: ${opty.amount ? `Rp ${opty.amount.toLocaleString()}` : 'Not specified'}
- Win Probability: ${opty.probability ? `${opty.probability}%` : 'Not specified'}

[REQUIREMENTS]
- Scope of Work: ${opty.scope_of_work || 'Not specified'}
- Technical Requirements: ${opty.technical_requirements || 'Not specified'}
- Pain Points: ${opty.pain_points || 'Not specified'}
- Constraints: ${opty.constraints || 'Not specified'}
- Competitors: ${opty.competitors || 'Not specified'}
- Decision Criteria: ${opty.decision_criteria || 'Not specified'}

[LINE ITEMS (PRODUCTS/SERVICES)]
${lineItems.map(item => `- [${item.pillar}] ${item.product_name} | Qty: ${item.quantity} ${item.unit} | MRC: Rp${item.mrc || 0} | OTC: Rp${item.otc || 0} | Term: ${item.contract_term || 1} Mos | Site A: ${item.site_a || '-'} | Site B: ${item.site_b || '-'} | Lastmile: ${item.lastmile || '-'} | CID: ${item.cid || '-'} | Spec: ${item.specification || '-'}`).join('\n')}
`

  if (outputFormat === 'html') {
    context += `
[OUTPUT INSTRUCTIONS]
- You are a senior Enterprise Presales / Solution Architect.
- Output MUST be strictly in HTML format using semantic tags (<h1>, <h2>, <p>, <ul>, <table>, etc.).
- Do NOT wrap the HTML in markdown code blocks (\`\`\`html). Output raw HTML directly.
- Use a professional business tone.
- The content should be Bilingual: Section headers in English, body paragraphs in Indonesian.
- Make the output comprehensive and detailed based on the context above. If context is sparse, use your expert knowledge to make reasonable assumptions that fit the typical enterprise use-case for these products.
`
  }
  
  return context;
}

export const getPrompt = (docType: string, opty: any, lineItems: any[]) => {
  let outputFormat: 'html' | 'json' = 'html'
  if (docType === 'design' || docType === 'concept_art') {
    outputFormat = 'json'
  }
  
  const baseContext = generatePromptContext(opty, lineItems, outputFormat)
  
  switch (docType) {
    case 'design':
      return `${baseContext}\n\n[TASK]\nBerperanlah sebagai teman akrab yang juga seorang Senior Solution Engineer / Enterprise Solution yang sangat jago. Kamu sedang membantu temanmu (user) untuk me-review peluang proyek (opportunity) ini.\n\nGunakan gaya bahasa kasual, asyik, suportif, dan solutif (seperti ngobrol dengan rekan kerja yang akrab, pakai kata "Gue", "Lu", "Bro", atau bahasa gaul kantor yang profesional). JANGAN KAKU ATAU BAKU!\n\n[OUTPUT FORMAT - CRITICAL]\nKamu TIDAK BOLEH menghasilkan teks biasa atau HTML. Kamu HARUS HANYA menghasilkan objek JSON murni (tanpa tag markdown \`\`\`json) dengan struktur berikut:\n{\n  "greeting": "String (Kalimat sapaan singkat dan suportif tentang deal ini)",\n  "insights": [\n    "String (Poin kekuatan deal/peluang ini)",\n    "..."\n  ],\n  "risks": [\n    "String (Poin risiko teknis atau informasi yang masih bolong/kurang)",\n    "..."\n  ],\n  "win_strategy": [\n    "String (Ide brilian/strategi tempur untuk mengalahkan kompetitor dan memenangkan deal ini)",\n    "..."\n  ],\n  "objections": [\n    { "objection": "String (Alasan klien mungkin menolak/menawar)", "response": "String (Cara cerdas menjawab/menangkis alasan tersebut)" }\n  ],\n  "next_steps": [\n    { "action": "String (Tindakan konkret)", "priority": "High | Medium | Low" }\n  ],\n  "questions": [\n    "String (Pertanyaan teknis tajam untuk ditanyakan ke klien nanti)"\n  ]\n}\n\nPASTIKAN OUTPUT MURNI JSON AGAR BISA DI-PARSE OLEH SISTEM!`
    case 'opportunity_proposal':
      return `${baseContext}\n\n[TASK]\nGenerate an "Opportunity Proposal" (Internal Deal Memo) for VP/SVP level approval. You are acting as a Senior Deal Desk Analyst & Solution Architect at Indosat Business B2B.\n\n[CRITICAL INDOSAT B2B CONTEXT]\nPay extreme attention to "Native vs Non-Native" products in the Line Items:\n- Native Products: SD-WAN, Internet Dedicated, SIP Trunk, Mobile/IoT Connectivity, etc. (Low delivery risk, high margin).\n- Non-Native Products (3rd Party/ICT): Hardware (Cisco, HPE, Fortinet), Licenses (Microsoft, Google Workspace), CCTV, etc. (High delivery risk due to indent/partner dependency).\n\n[STRUCTURE REQUIREMENTS]\nOutput MUST be highly structured HTML resembling a formal corporate report. Use clean white backgrounds, professional dark slate fonts (e.g., color: #1e293b), and only use Indosat brand accent colors (Red #ed1c24 / Yellow #ffc20e) sparingly for warning boxes or small accent lines. Do NOT make the main headers red.\n\nInclude the following sections:\n1. <h2 style="color: #0f172a; border-bottom: 2px solid #ed1c24; padding-bottom: 4px;">1. Deal Overview</h2>: A brief executive summary of the project and customer profile.\n2. <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">2. Financial & Commercial Assessment</h2>: TCV, margin potential, and billing type (MRC vs OTC).\n3. <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">3. Strategic Alignment</h2>: Why winning this is important for the company.\n4. <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">4. Competitor Threat & Win Probability</h2>: Identify competitors and our win chance.\n5. <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">5. Delivery Timeline & Capability</h2>: Analyze realistic delivery timelines. Add a strong warning if there are potential delays or SLA penalties.\n6. <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">6. Product Sourcing (Native vs Non-Native)</h2>: Explicitly breakdown which line items are native vs non-native. If there are non-native items (e.g. Cisco, HPE), you MUST output a highly visible WARNING box (using background-color: #fee2e2; border: 1px solid #ef4444; padding: 10px; color: #b91c1c;) about 3rd party SLA risks, back-to-back contracts, and import indent timelines.\n7. <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">7. Executive Recommendation</h2>: A clear GO / NO-GO recommendation with a 1-sentence justification.\n\n[OUTPUT FORMAT]\nStrictly output valid HTML. Do not wrap in markdown \`\`\`html. Use professional styling inline.`
      
    case 'boq':
      return `${baseContext}\n\n[TASK]\nGenerate a strictly formatted, formal Bill of Quantities (BoQ) document. You MUST output the document as a highly structured, Excel-like HTML table. \n\n[STRUCTURE REQUIREMENTS]\n1. Top Header: A full-width header with light blue background reading "BILL OF QUANTITY (BoQ)".\n2. Metadata Block: A section detailing Kegiatan (Project), Pekerjaan (Opportunity Name), Lokasi, etc.\n3. Main Table:\n   - It MUST have strict borders (Excel style).\n   - Column Headers: "NO.", "URAIAN" (Product Name & Specs), "SAT" (Unit), "KUANTITAS" (Qty), "HARGA SATUAN (Rupiah)", "JUMLAH TOTAL HARGA (Rupiah)".\n   - Sub-header row with letters indicating calculation: "a", "b", "c", "d", "e", "f = (d x e)".\n   - Group the line items by their "Pillar" (e.g., "DIVISI 1. CONNECTIVITY", "DIVISI 2. ICT").\n   - Under each division, list the items with their exact specs, qty, and price.\n   - At the bottom of each division, add a subtotal row: "Jumlah Harga Pekerjaan DIVISI X".\n   - At the very bottom, add a Grand Total row.\n\nDo not include fluffy paragraphs. The output must look like a professional, formal procurement spreadsheet exported to HTML.`
      
    case 'timeline':
      return `${baseContext}\n\n[TASK]\nGenerate a highly professional, customer-facing Project Implementation Timeline document formatted as a Gantt Chart inside an HTML table.\n\n[STRUCTURE REQUIREMENTS]\n1. Top Header: Full-width header reading "PROJECT IMPLEMENTATION TIMELINE (GANTT CHART)".\n2. Metadata Block: A section detailing Kegiatan (Project), Pekerjaan (Opportunity Name), Customer Name, Target Durasi, dll.\n3. Intro Text: Add a polite, professional 1-2 sentence introduction.\n4. Main Table Header:\n   - It MUST have strict borders (Excel style).\n   - Left Columns: "NO.", "FASE & MILESTONE", "DURASI".\n   - Right Columns (Timeline): "W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8".\n   - This means EVERY task row MUST have exactly 11 columns (3 left + 8 weeks).\n5. Table Body (Rows & Phases):\n   - YOU MUST GENERATE ACTUAL DATA ROWS FOR THE TASKS. Do not leave the table empty.\n   - Deduce the correct project phases based on the line items (e.g. FASE PERSIAPAN, FASE PENGADAAN, FASE INSTALASI, FASE UJI COBA & BAST).\n   - Phase Header Row: Use <td colspan="11" style="background-color: #1e3a8a; color: white; font-weight: bold;">I. FASE PERSIAPAN</td>\n   - Task Rows: Must contain EXACTLY 11 <td> elements. Fill the active week cell with background-color: #3b82f6;\n\n[HTML EXAMPLE FOR TASK ROW]\n<tr>\n  <td>1.1</td>\n  <td>Penyelarasan Kebutuhan</td>\n  <td>1 Minggu</td>\n  <td style="background-color: #3b82f6;"></td>\n  <td></td>\n  <td></td>\n  <td></td>\n  <td></td>\n  <td></td>\n  <td></td>\n  <td></td>\n</tr>\n\nOutput ONLY valid HTML elements.`
      
    case 'concept_art':
      return `${baseContext}\n\n[TASK]\nYou are an expert prompt engineer for an AI Image Generator. Based on the project context and line items, write a highly detailed image generation prompt in ENGLISH. The image MUST NOT BE sci-fi, futuristic, or cyberpunk (no glowing neon lines, no 2050 vibes). It MUST be "Ultra-realistic corporate photography" showing what the actual physical installation of the line items looks like in the real world today.\n\n[CRITICAL INSTRUCTIONS]\n1. Real-World Mapping: Read the line items. If it's a Video Wall, describe a realistic modern control room (NOC) with operators. If it's Servers/Storage, describe a clean, brightly lit, realistic enterprise data center rack. If it's Wi-Fi, describe a modern university campus or office with realistic access points. Do not invent imaginary abstract concepts.\n2. Photography Style: Use keywords like "photorealistic, architectural photography, bright daylight or standard corporate lighting, sharp focus, 8k resolution, shot on DSLR".\n3. Typography Labels: Include exactly one or two realistic signs in the physical world (e.g., a metal plaque on the wall, or text on a monitor). Format exactly: The exact text "YOUR TEXT HERE" is displayed on a wall sign.\n\n[OUTPUT FORMAT]\nYou MUST output ONLY a pure JSON object in this format:\n{\n  "image_prompt": "String (Your highly detailed English image generation prompt, focusing on ultra-realistic corporate photography and the exact physical items)"\n}`
      
    default:
      throw new Error('Invalid document type')
  }
}
