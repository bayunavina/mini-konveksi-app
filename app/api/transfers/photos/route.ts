import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { transferPhotos, transfers } from "@/db/schema"
import { eq } from "drizzle-orm"
import { randomUUID } from "crypto"
import fs from "fs"
import path from "path"

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "transfers")

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transferId = searchParams.get("transferId")

    if (!transferId) {
      const allPhotos = await db.select().from(transferPhotos)
      return NextResponse.json(allPhotos)
    }

    const transfer = await db.select().from(transfers).where(eq(transfers.id, transferId))
    if (transfer.length === 0) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
    }

    const photos = await db.select().from(transferPhotos).where(eq(transferPhotos.transferId, transferId))
    return NextResponse.json(photos)
  } catch (error) {
    console.error("Error fetching photos:", error)
    return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const transferId = formData.get("transferId") as string
    const label = formData.get("label") as string
    const files = formData.getAll("photos") as File[]

    if (!transferId) {
      return NextResponse.json({ error: "Transfer ID is required" }, { status: 400 })
    }

    const transfer = await db.select().from(transfers).where(eq(transfers.id, transferId))
    if (transfer.length === 0) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
    }

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    }

    const savedPhotos = []

    for (const file of files) {
      if (!file || file.size === 0) continue

      const buffer = Buffer.from(await file.arrayBuffer())
      const extension = file.name.split(".").pop() || "jpg"
      const fileName = `${randomUUID()}.${extension}`
      const filePath = path.join(UPLOAD_DIR, fileName)

      fs.writeFileSync(filePath, buffer)

      const photoUrl = `/uploads/transfers/${fileName}`

      const [savedPhoto] = await db.insert(transferPhotos).values({
        transferId,
        photoData: photoUrl,
        label,
        timestamp: new Date(),
      }).returning()

      savedPhotos.push(savedPhoto)
    }

    return NextResponse.json({ photos: savedPhotos }, { status: 201 })
  } catch (error) {
    console.error("Error uploading photos:", error)
    return NextResponse.json({ error: "Failed to upload photos" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get("id")

    if (!photoId) {
      return NextResponse.json({ error: "Photo ID is required" }, { status: 400 })
    }

    const photo = await db.select().from(transferPhotos).where(eq(transferPhotos.id, photoId))
    if (photo.length === 0) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    const filePath = path.join(process.cwd(), "public", photo[0].photoData)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    await db.delete(transferPhotos).where(eq(transferPhotos.id, photoId))

    return NextResponse.json({ message: "Photo deleted successfully" })
  } catch (error) {
    console.error("Error deleting photo:", error)
    return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 })
  }
}