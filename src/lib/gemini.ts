import { VertexAI } from '@google-cloud/vertexai'

// Initialize Vertex AI with your Cloud project and location
const vertex_ai = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID as string,
  location: 'us-central1' // or your preferred location, ensure it matches
})

const model = 'gemini-2.5-flash'

export const generativeModel = vertex_ai.preview.getGenerativeModel({
  model: model,
  generationConfig: {
    maxOutputTokens: 8192,
    temperature: 0.2,
    topP: 0.95,
  },
})

export async function generateContent(
  prompt: string, 
  referenceImage?: { inlineData: { data: string, mimeType: string } }, 
  additionalContext?: string
) {
  try {
    const parts: any[] = [{ text: prompt }]

    if (additionalContext) {
      parts.push({ text: `\n\n[ADDITIONAL INSTRUCTIONS FROM USER]\n${additionalContext}` })
    }

    if (referenceImage) {
      parts.push({ text: `\n\n[REFERENCE IMAGE ATTACHED]\nPlease carefully analyze the attached reference image. Your generated output MUST strictly follow the structural pattern, layout, terminology, and visual logic of this reference, while filling in the data accurately from the current opportunity details.` })
      parts.push(referenceImage)
    }

    const request = {
      contents: [{ role: 'user', parts }],
    }
    const streamingResp = await generativeModel.generateContentStream(request)
    
    let text = ''
    for await (const item of streamingResp.stream) {
      if (item.candidates && item.candidates.length > 0) {
        text += item.candidates[0].content.parts[0].text
      }
    }
    const response = await streamingResp.response
    return text || response.candidates?.[0]?.content?.parts?.[0]?.text || ''
  } catch (error) {
    console.error('Error generating content from Vertex AI:', error)
    throw error
  }
}

export async function extractOpportunityData(parts: any[]) {
  const schemaModel = vertex_ai.preview.getGenerativeModel({
    model: model,
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  })

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
  "competitors": "String (Any mentioned competitors)"
}
If a field is not mentioned or cannot be inferred, leave it as an empty string "". Do NOT invent information.
`

  try {
    const request = {
      contents: [{ role: 'user', parts: [{ text: systemInstruction }, ...parts] }],
    }
    const response = await schemaModel.generateContent(request)
    const text = response.response.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // Clean up potential markdown code blocks
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    return JSON.parse(cleanedText)
  } catch (error) {
    console.error('Error extracting data from Vertex AI:', error)
    throw error
  }
}
