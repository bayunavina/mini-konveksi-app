import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { transferPhotos, transfers } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const transfer = await db.select().from(transfers).where(eq(transfers.id, id))
    if (transfer.length === 0) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
    }

    const photos = await db
      .select({
        id: transferPhotos.id,
        transferId: transferPhotos.transferId,
        photoData: transferPhotos.photoData,
        label: transferPhotos.label,
        timestamp: transferPhotos.timestamp,
        createdAt: transferPhotos.createdAt,
      })
      .from(transferPhotos)
      .where(eq(transferPhotos.transferId, id))
      .orderBy(desc(transferPhotos.createdAt))

    return NextResponse.json({ transferNumber: transfer[0].transferNumber, photos })
  } catch (error) {
    console.error("Error fetching transfer photos:", error)
    return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const formData = await request.formData()
    const label = formData.get("label") as string
    const photoFiles = formData.getAll("photos") as File[]

    if (!photoFiles || photoFiles.length === 0) {
      return NextResponse.json({ error: "Photos are required" }, { status: 400 })
    }

    const transfer = await db.select().from(transfers).where(eq(transfers.id, id))
    if (transfer.length === 0) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
    }

    const fs = await import("fs")
    const path = await import("path")
    const crypto = await import("crypto")

    const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "transfers")
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    }

    const savedPhotos = []

    for (const file of photoFiles) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const extension = file.name.split(".").pop() || "jpg"
      const fileName = `${crypto.randomUUID()}.${extension}`
      const filePath = path.join(UPLOAD_DIR, fileName)

      fs.writeFileSync(filePath, buffer)

      const photoUrl = `/uploads/transfers/${fileName}`

      const [savedPhoto] = await db.insert(transferPhotos).values({
        transferId: id,
        photoData: photoUrl,
        label: label || transfer[0].transferNumber,
        timestamp: new Date(),
      }).returning()

      savedPhotos.push(savedPhoto)
    }

    return NextResponse.json({ photos: savedPhotos }, { status: 201 })
  } catch (error) {
    console.error("Error uploading photo:", error)
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: transferId } = await params
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get("photoId")

    if (!photoId) {
      return NextResponse.json({ error: "photoId is required" }, { status: 400 })
    }

    const transfer = await db.select().from(transfers).where(eq(transfers.id, transferId))
    if (transfer.length === 0) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
    }

    const photo = await db.select().from(transferPhotos).where(eq(transferPhotos.id, photoId))
    if (photo.length === 0) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    const fs = await import("fs")
    const path = await import("path")
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