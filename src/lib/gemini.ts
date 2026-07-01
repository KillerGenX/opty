import '@/lib/gcp-setup'
import { GoogleGenAI } from '@google/genai'

// Initialize Google Gen AI with Vertex AI configuration
let aiInstance: GoogleGenAI | null = null
export function getAi() {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT_ID as string,
      location: 'global'
    })
  }
  return aiInstance
}

export const MODEL_FAST = 'gemini-3.5-flash' // Fast, cheap, for data extraction
export const MODEL_SMART = 'gemini-3.1-pro-preview' // Deep reasoning, complex generation

export async function generateContent(
  prompt: string,
  referenceImage?: { inlineData: { data: string, mimeType: string } },
  additionalContext?: string,
  previousDraft?: string
) {
  try {
    const contents: any[] = [{ text: prompt }]

    if (previousDraft) {
      contents.push({ text: `\n\n[IMPORTANT - PREVIOUS DRAFT ITERATION]\nHere is the previous draft of this document that you generated. DO NOT write from scratch. Please intelligently iterate, expand, or correct this previous draft based ONLY on the new context and instructions provided by the user below. Maintain all the good insights from the previous draft that are not contradicted by the new instructions.\n\n=== PREVIOUS DRAFT ===\n${previousDraft}\n======================` })
    }

    if (additionalContext) {
      contents.push({ text: `\n\n[ADDITIONAL INSTRUCTIONS FROM USER]\n${additionalContext}` })
    }

    if (referenceImage) {
      contents.push({ text: `\n\n[REFERENCE IMAGE ATTACHED]\nPlease carefully analyze the attached reference image. Your generated output MUST strictly follow the structural pattern, layout, terminology, and visual logic of this reference, while filling in the data accurately from the current opportunity details.` })
      contents.push(referenceImage)
    }

    const responseStream = await getAi().models.generateContentStream({
      model: MODEL_SMART,
      contents: contents,
      config: {
        maxOutputTokens: 8192,
        temperature: 0.2,
        topP: 0.95,
      }
    })

    let fullText = ''
    for await (const chunk of responseStream) {
      if (chunk.text) {
        fullText += chunk.text
      }
    }

    return fullText
  } catch (error) {
    console.error('Error generating content from Google Gen AI:', error)
    throw error
  }
}

export async function extractOpportunityData(parts: any[], masterData?: { types: string[], industries: string[], segments: string[], pillars: string[] }) {
  const typesStr = masterData?.types?.length ? masterData.types.join(", ") : "Connectivity, Cloud Solutions, Cyber Security, Managed Services, IoT / Smart City";
  const industriesStr = masterData?.industries?.length ? masterData.industries.join(", ") : "Telco, Banking & Finance, Manufacturing, Healthcare, Mining & Energy, Retail";
  const segmentsStr = masterData?.segments?.length ? masterData.segments.join(", ") : "Enterprise, SME, Government, Wholesale";
  const pillarsStr = masterData?.pillars?.length ? masterData.pillars.join(", ") : "Connectivity, ICT & Cloud, Managed Service & Security, IoT & Digital";
  const currentDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const systemInstruction = `
You are an expert Enterprise B2B Presales assistant.
Today's date is: ${currentDate}. Keep this in mind when analyzing timelines or dates.

Your task is to extract opportunity details from the provided email text, screenshot, or PDF document.
CRITICAL INSTRUCTION 1: You MUST synthesize and summarize the information. DO NOT verbatim copy the entire email thread into the string fields. Keep all string values concise, professional, and under 300 words per field to prevent truncation.
CRITICAL INSTRUCTION 2: Ensure the output is strictly valid JSON. You MUST escape all double quotes (\\") and newlines (\\n) inside string values. DO NOT output literal newline characters inside strings.
CRITICAL INSTRUCTION 3 (TOKEN SAVER): To prevent JSON output from being truncated, you MUST OMIT any keys inside the "line_items" objects if their value is empty, null, or 0. For example, if "site_a" is empty, do not print "site_a": "" at all. Only print keys that have actual data.

Extract the following information and output strictly in JSON format matching this schema:
{
  "opportunity_name": "String (A short, professional project name. If missing, generate one based on the products, e.g. 'Pengadaan Internet Dedicated 100 Mbps')",
  "customer_name": "String (The name of the company/client)",
  "customer_industry": "String (Classify into one of these if possible: ${industriesStr})",
  "customer_segment": "String (Classify into one of these if possible: ${segmentsStr}, or use custom)",
  "customer_pic": "String (Name of the person in charge or contact person if available)",
  "customer_contact": "String (Email or phone if available)",
  "customer_address": "String (Full physical address of the customer or site)",
  "opportunity_type": "String (Classify the main solution type into one of these if possible: ${typesStr}, or use a custom one)",
  "request_type": "String (e.g., New Installation, Upgrade, Downgrade, Relocation, Termination)",
  "sfa_id": "String (Salesforce ID or CRM ID if present)",
  "quote_id": "String (Quotation ID or reference if present)",
  "expected_close_date": "String (Target closing date or timeline. MUST be formatted strictly as YYYY-MM-DD. If only a month/year is known like 'June 2026', use the last day of that month, e.g., '2026-06-30'. If no date is found, leave as empty string '')",
  "probability": "Number (Estimate win probability as an integer 5-95. Use this scoring logic — start at a base score then apply modifiers: BASE: New Installation=20, Upgrade/Expansion=50, Renewal/Retention=75, Relocation=55, Downgrade=30, Unknown=30. MODIFIERS: +20 if products are native Indosat/IOH owned (e.g. MPLS, DIA, Metro-E, IP Transit, IndiHome Business, ION); +15 if document clearly shows existing customer relationship (e.g. 'existing circuit', 'renewal', 'upgrade from current'); +15 if budget is explicitly stated or a PO/approval is mentioned; +10 if no competitors are mentioned at all; -15 if strong competitors like Telkom, XL Axiata, Lintasarta, CBN, Biznet are explicitly mentioned as shortlisted; -20 if this is a competitive open tender (multiple bidders mentioned); +10 if C-level or Director is directly involved in the email. Cap final score between 5 and 95. Output as a plain integer with NO percent sign.)",
  "total_value": "Number (Extract the total budget/TCV if mentioned)",
  "stage": "String (Default to 'Prospect' unless context implies it's in Negotiation or Closed)",
  "scope_of_work": "String (Summarize what needs to be done. Keep it high-level and concise.)",
  "technical_requirements": "String (Summarize SLA, bandwidth, performance, compatibility specs.)",
  "pain_points": "String (Summarize using As-Is -> Business Impact -> To-Be structure if possible.)",
  "constraints": "String (Summarize Commercial, Timeline, Technical, or Operational constraints.)",
  "competitors": "String (Any mentioned competitors and their strategy)",
  "decision_criteria": "String (Any decision criteria)",
  "line_items": [
    {
      "pillar": "String (Classify into one of these if possible: ${pillarsStr}. HINT: For Telco links like MPLS, Internet, or DIA, ALWAYS prefer 'Connectivity'.)",
      "product_name": "String (Best guess of the product/service name, e.g. MPLS L2, DIA, etc.)",
      "specification": "String (General technical details, SLA, or term.)",
      "quantity": "Number (Number of UNITS or LINKS/CIRCUITS. For Telco, this is usually 1 per circuit, NOT the bandwidth. For hardware, this is the number of units. Default to 1 if unknown.)",
      "capacity": "String (Descriptive bandwidth. IMPORTANT NORMALIZATION: Remove thousand separators (e.g. '2.800 Mbps' -> '2800 Mbps') but PRESERVE true decimals (e.g. '2.5 Gbps' stays '2.5 Gbps'). Convert comma decimals to dot decimals ('2,5 Gbps' -> '2.5 Gbps').)",
      "unit": "String (Unit of the quantity, e.g. circuit, link, unit, node, user, license. For Telco, prefer 'circuit' or 'link')",
      "mrc": "Number (Monthly Recurring Charge. Do not format with commas/periods, just raw number)",
      "otc": "Number (One Time Charge or unit price for hardware. Do not format with commas/periods, just raw number)",
      "contract_term": "Number (Duration in months, e.g. 24 for 2 years. For hardware, this can be warranty period.)",
      "site_a": "String (Origin site name or address/coordinates)",
      "site_b": "String (Destination site name or address/coordinates)",
      "lastmile": "String (Last mile media details, e.g., FO, VSAT, Radio)",
      "cid": "String (Circuit ID if mentioned)"
    }
  ]
}
If a field is not mentioned or cannot be inferred, leave it as an empty string "". For line_items, if no products/services are found, return an empty array []. Do NOT invent information.

SPECIAL RULE FOR TELCO ORDERS (MPLS, DIA, Internet, etc.):
If the document is a Telco link request:
1. Extract the SFA ID, Quote ID, and Request Type.
2. For line items, set "quantity" to the NUMBER OF CIRCUITS/LINKS (usually 1). NEVER put bandwidth in quantity.
3. Set "capacity" to the bandwidth string (e.g. "1000 Mbps", "10 Gbps").
4. Set "mrc" directly to the MRC price and "otc" directly to the OTC price. Do NOT divide or calculate anything.
5. Set "contract_term" to the numeric month value (e.g., if "2 Tahun", set to 24).
6. Extract Site A, Site B, Lastmile, and CID explicitly into their own fields.

SPECIAL RULE FOR ICT/HARDWARE/SOFTWARE ORDERS:
If the document is a hardware/ICT procurement (e.g. CCTV, Servers, Software):
1. Set "quantity" to the number of units (e.g. 5 servers).
2. Set "otc" to the unit price of the item.
3. Set "mrc" to 0 unless there is a recurring maintenance/support fee.
4. Leave "capacity", "site_a", "site_b", "lastmile", "cid" empty (which means you should OMIT those keys per CRITICAL INSTRUCTION 3).
5. SMART GROUPING: If there is a massive BOQ with dozens of small accessories (e.g., pipes, brackets, connectors, cables, installation services), DO NOT extract them individually. Group them into a single line item named "Installation Materials, Accessories & Services" and sum up their total price. Extract main devices (Cameras, Switches, Servers) individually.
`

  try {
    const response = await getAi().models.generateContent({
      model: MODEL_FAST,
      contents: parts,
      config: {
        maxOutputTokens: 8192,
        temperature: 0.1,
        responseMimeType: "application/json",
        systemInstruction: systemInstruction
      }
    })

    const text = response.text || ''

    let cleanedText = ""
    try {
      cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

      if (!cleanedText) {
        throw new Error("AI returned an empty response.")
      }

      return JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('Error parsing JSON from Google Gen AI:', parseError)
      throw parseError
    }
  } catch (error) {
    console.error('Error extracting data from Google Gen AI:', error)
    throw error
  }
}

export async function generateConceptImage(prompt: string, referenceImage?: { inlineData: { data: string, mimeType: string } }) {
  try {
    // Gemini 3 Pro Image (Nano Banana Pro) uses the global endpoint via standard models API
    // Through Vertex AI, the correct method for this reasoning image model is generateContent

    const contents: any[] = [{ text: prompt }];
    if (referenceImage) {
      contents.push(referenceImage);
    }

    const response = await getAi().models.generateContent({
      model: 'gemini-3-pro-image',
      contents: contents
    });

    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find((p: any) => p.inlineData);

    if (imagePart?.inlineData?.data) {
      return imagePart.inlineData.data;
    }
    throw new Error("Failed to extract inlineData image from Gemini 3 Pro Image response.");
  } catch (error) {
    console.error('Error generating image from Gemini 3 Pro Image:', error)
    throw error
  }
}
