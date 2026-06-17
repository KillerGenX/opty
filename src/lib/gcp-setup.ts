import fs from 'fs'
import path from 'path'
import os from 'os'

// Vercel Serverless Hack for GCP Credentials
// This script runs before GoogleGenAI is initialized.
// If it finds GOOGLE_CREDENTIALS_BASE64 and NO local JSON file is defined,
// it decodes the base64 string into a temp file and points Google SDK to it.

if (process.env.GOOGLE_CREDENTIALS_BASE64 && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    const keyData = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8')
    const tempPath = path.join(os.tmpdir(), 'gcp-key.json')
    
    // Write only if it doesn't exist or if we want to overwrite
    fs.writeFileSync(tempPath, keyData, 'utf8')
    
    // Tell Google Cloud SDK to use this temp file
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath
    console.log('Successfully injected Vercel Base64 GCP Credentials.')
  } catch (e) {
    console.error('Failed to parse GOOGLE_CREDENTIALS_BASE64', e)
  }
}
