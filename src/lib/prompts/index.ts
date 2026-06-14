export const generatePromptContext = (opty: any, lineItems: any[]) => {
  return `
[CONTEXT]
- Company: Enterprise Solutions Team
- Opportunity Name: ${opty.opportunity_name}
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
${lineItems.map(item => `- [${item.pillar}] ${item.product_name} | Spec: ${item.specification || '-'} | Qty: ${item.quantity} ${item.unit}`).join('\n')}

[OUTPUT INSTRUCTIONS]
- You are a senior Enterprise Presales / Solution Architect.
- Output MUST be strictly in HTML format using semantic tags (<h1>, <h2>, <p>, <ul>, <table>, etc.).
- Do NOT wrap the HTML in markdown code blocks (\`\`\`html). Output raw HTML directly.
- Use a professional business tone.
- The content should be Bilingual: Section headers in English, body paragraphs in Indonesian.
- Make the output comprehensive and detailed based on the context above. If context is sparse, use your expert knowledge to make reasonable assumptions that fit the typical enterprise use-case for these products.
`
}

export const getPrompt = (docType: string, opty: any, lineItems: any[]) => {
  const baseContext = generatePromptContext(opty, lineItems)
  
  switch (docType) {
    case 'design':
      return `${baseContext}\n\n[TASK]\nBerperanlah sebagai teman akrab yang juga seorang Senior Solution Engineer / Enterprise Solution yang sangat jago. Kamu sedang membantu temanmu (user) untuk me-review peluang proyek (opportunity) ini.\n\nGunakan gaya bahasa kasual, asyik, suportif, dan solutif (seperti ngobrol dengan rekan kerja yang akrab, pakai kata "Gue", "Lu", "Bro", atau bahasa gaul kantor yang profesional). JANGAN KAKU ATAU BAKU!\n\n[OUTPUT FORMAT - CRITICAL]\nKamu TIDAK BOLEH menghasilkan teks biasa atau HTML. Kamu HARUS HANYA menghasilkan objek JSON murni (tanpa tag markdown \`\`\`json) dengan struktur berikut:\n{\n  "greeting": "String (Kalimat sapaan singkat dan suportif tentang deal ini)",\n  "insights": [\n    "String (Poin kekuatan deal/peluang ini)",\n    "..."\n  ],\n  "risks": [\n    "String (Poin risiko teknis atau informasi yang masih bolong/kurang)",\n    "..."\n  ],\n  "win_strategy": [\n    "String (Ide brilian/strategi tempur untuk mengalahkan kompetitor dan memenangkan deal ini)",\n    "..."\n  ],\n  "objections": [\n    { "objection": "String (Alasan klien mungkin menolak/menawar)", "response": "String (Cara cerdas menjawab/menangkis alasan tersebut)" }\n  ],\n  "next_steps": [\n    { "action": "String (Tindakan konkret)", "priority": "High | Medium | Low" }\n  ],\n  "questions": [\n    "String (Pertanyaan teknis tajam untuk ditanyakan ke klien nanti)"\n  ]\n}\n\nPASTIKAN OUTPUT MURNI JSON AGAR BISA DI-PARSE OLEH SISTEM!`
    
    case 'boq':
      return `${baseContext}\n\n[TASK]\nGenerate a Bill of Quantities (BoQ) document. Structure the HTML into: 1. Project Overview, 2. A detailed <table> containing all Line Items grouped by Pillar, 3. Assumptions and Prerequisites.`
      
    case 'bc':
      return `${baseContext}\n\n[TASK]\nGenerate a Business Case document. Structure the HTML into: 1. Problem Statement & Pain Points, 2. Proposed Solution Benefits, 3. Financial Overview & Estimated ROI, 4. Risk Analysis, 5. Executive Recommendation.`
      
      case 'timeline':
      return `${baseContext}\n\n[TASK]\nGenerate a Project Implementation Timeline document. Structure the HTML into: 1. Project Phases Overview, 2. A detailed <table> showing tasks, estimated duration (in weeks), and dependencies, 3. Key Milestones.`
      
    case 'diagram':
      return `${baseContext}\n\n[TASK]\nGenerate a High-Level Visual Architecture Diagram based on the provided technical requirements and scope of work.\n\nCRITICAL INSTRUCTIONS:\n- You MUST output ONLY valid Mermaid.js code wrapped inside an HTML tag: <pre class="mermaid">your mermaid code here</pre>.\n- Do NOT write any conversational text outside the HTML.\n- Use a "graph TD" or "graph LR" flowchart.\n- For node labels, ALWAYS wrap the label in double quotes. Example: NodeA["My Node Label"]\n- For subgraphs, ALWAYS use the format: subgraph ID ["Title Name"] (Note: The ID must not contain spaces, use underscores instead).\n- DO NOT use any 'class', 'classDef', 'style', or colors. Keep the diagram purely structural and plain to prevent syntax errors.\n- Represent the client sites, ISP/Backbone network, and CPEs (Routers/Firewalls).\n\nEXAMPLE FORMAT:\ngraph TD\n  subgraph core ["Core Network"]\n    R1["Core Router 1"]\n  end\n  subgraph branch ["Branch Site"]\n    FW["Firewall (CPE)"]\n  end\n  R1 -->|"IPSec Tunnel"| FW`
      
    default:
      throw new Error('Invalid document type')
  }
}
