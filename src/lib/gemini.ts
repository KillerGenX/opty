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
  additionalContext?: string
) {
  try {
    const contents: any[] = [{ text: prompt }]

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

export async function extractOpportunityData(parts: any[]) {
  const systemInstruction = `
You are an expert Enterprise B2B Presales assistant.
Your task is to extract opportunity details from the provided email text, screenshot, or PDF document.
Extract the following information and output strictly in JSON format matching this schema:
{
  "opportunity_name": "String (Give a concise title for the project)",
  "customer_name": "String (Name of the client company)",
  "customer_industry": "String (E.g. Banking, Telco, Manufacturing, Government, Retail, etc.)",
  "customer_pic": "String (Name of the person in charge or contact person if available)",
  "customer_contact": "String (Email or phone if available)",
  "scope_of_work": "String (Detailed activities and deliverables)",
  "technical_requirements": "String (SLA, bandwidth, specs, etc.)",
  "pain_points": "String (What problem are they solving?)",
  "constraints": "String (Budget, timeline, deployment risks)",
  "competitors": "String (Any mentioned competitors)",
  "line_items": [
    {
      "pillar": "String (Classify into: Connectivity, Cloud, Security, Managed Services, or IoT)",
      "product_name": "String (Best guess of the product/service name)",
      "specification": "String (Technical details, capacity, SLA, or term)",
      "quantity": "Number (Default to 1 if not specified)"
    }
  ]
}
If a field is not mentioned or cannot be inferred, leave it as an empty string "". For line_items, if no products/services are found, return an empty array []. Do NOT invent information.
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
