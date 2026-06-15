import { GoogleGenAI } from '@google/genai'

// Initialize Google Gen AI with Vertex AI configuration
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT_ID as string,
  location: 'us-central1'
})

const model = 'gemini-2.5-flash'

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

    const responseStream = await ai.models.generateContentStream({
      model: model,
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
Extract the following information and output strictly in JSON format matching this schema:
{
  "opportunity_name": "String (Give a concise title for the project)",
  "opportunity_type": "String (Classify the main solution type into one of these if possible: ${typesStr}, or use a custom one)",
  "request_type": "String (e.g., New Installation, Upgrade, Downgrade, Relocation, Termination)",
  "sfa_id": "String (Salesforce ID or CRM ID if present)",
  "quote_id": "String (Quotation ID or reference if present)",
  "customer_name": "String (Name of the client company)",
  "customer_industry": "String (Classify into one of these if possible: ${industriesStr}, or use custom)",
  "customer_segment": "String (Classify into one of these if possible: ${segmentsStr}, or use custom)",
  "customer_pic": "String (Name of the person in charge or contact person if available)",
  "customer_contact": "String (Email or phone if available)",
  "customer_address": "String (Full physical address of the customer or site)",
  "expected_close_date": "String (Target closing date, RFS date, or timeline. Format as YYYY-MM-DD if possible, otherwise keep original string)",
  "scope_of_work": "String (Detailed activities and deliverables)",
  "technical_requirements": "String (SLA, bandwidth, specs, etc.)",
  "pain_points": "String (What problem are they solving?)",
  "constraints": "String (Budget, timeline, deployment risks)",
  "competitors": "String (Any mentioned competitors)",
  "decision_criteria": "String (Any decision criteria)",
  "line_items": [
    {
      "pillar": "String (Classify into one of these if possible: ${pillarsStr})",
      "product_name": "String (Best guess of the product/service name, e.g. MPLS L2, DIA, etc.)",
      "specification": "String (General technical details, SLA, or term.)",
      "quantity": "Number (Number of UNITS or LINKS/CIRCUITS. For Telco, this is usually 1 per circuit, NOT the bandwidth. For hardware, this is the number of units. Default to 1 if unknown.)",
      "capacity": "String (Descriptive capacity or bandwidth string. e.g., '1000 Mbps', '10 Gbps', '3000 Mbps'. Leave empty if not applicable for hardware/software.)",
      "unit": "String (Unit of the quantity, e.g. link, circuit, unit, node, user, license)",
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
If the document is a hardware/ICT procurement:
1. Set "quantity" to the number of units (e.g. 5 servers).
2. Set "otc" to the unit price of the item.
3. Set "mrc" to 0 unless there is a recurring maintenance/support fee.
4. Leave "capacity", "site_a", "site_b", "lastmile", "cid" empty.
`

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: parts,
      config: {
        maxOutputTokens: 8192,
        temperature: 0.1,
        responseMimeType: "application/json",
        systemInstruction: systemInstruction
      }
    })
    
    const text = response.text || ''
    
    // Clean up potential markdown code blocks
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    return JSON.parse(cleanedText)
  } catch (error) {
    console.error('Error extracting data from Google Gen AI:', error)
    throw error
  }
}
