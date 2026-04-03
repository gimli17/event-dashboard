import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import path from 'path'
import fs from 'fs'

export async function GET() {
  try {
    const credPath = path.join(process.cwd(), 'google-service-account.json')
    let creds

    if (fs.existsSync(credPath)) {
      creds = JSON.parse(fs.readFileSync(credPath, 'utf8'))
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      creds = {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n'),
      }
    } else {
      return NextResponse.json({ files: [], error: 'No credentials' })
    }

    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })

    const authClient = await auth.getClient()
    const drive = google.drive({ version: 'v3', auth: authClient as any })
    const rootFolderId = '1qQ036wlLVDOJuf-64n8AbyKN2crX-tjR'

    interface DriveFile {
      id: string
      name: string
      mimeType: string
      thumbnailLink: string | null
      webViewLink: string | null
      size: string | null
      folder: string
    }

    const files: DriveFile[] = []

    async function listFolder(folderId: string, folderName: string) {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, thumbnailLink, webViewLink, size)',
        pageSize: 100,
      })

      for (const f of res.data.files || []) {
        if (f.mimeType === 'application/vnd.google-apps.folder') {
          await listFolder(f.id!, f.name!)
        } else {
          files.push({
            id: f.id!,
            name: f.name!,
            mimeType: f.mimeType!,
            thumbnailLink: f.thumbnailLink || null,
            webViewLink: f.webViewLink || null,
            size: f.size || null,
            folder: folderName,
          })
        }
      }
    }

    await listFolder(rootFolderId, 'Root')

    return NextResponse.json({ files })
  } catch (e) {
    return NextResponse.json({ files: [], error: String(e) })
  }
}
