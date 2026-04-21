import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasToken: !!process.env.NOTION_TOKEN,
    hasDatabaseId: !!process.env.NOTION_DAN_DATABASE_ID,
    tokenPrefix: process.env.NOTION_TOKEN ? process.env.NOTION_TOKEN.slice(0, 4) + '…' : null,
    databaseIdLength: process.env.NOTION_DAN_DATABASE_ID?.length ?? 0,
  })
}
