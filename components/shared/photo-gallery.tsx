"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { CameraIcon, TrashIcon, PhotoIcon } from "@heroicons/react/24/outline"
import { formatDateLong } from "@/lib/utils"
import { toast } from "sonner"

interface Photo {
  id: string
  photoData: string
  label: string
  timestamp: string
  createdAt: string
}

interface PhotoGalleryProps {
  transferId: string | null
  readOnly?: boolean
  onPhotosUploaded?: () => void
}

export function PhotoGallery({ transferId, readOnly = true, onPhotosUploaded }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!transferId) return

    setLoading(true)
    fetch(`/api/transfers/${transferId}/photos`)
      .then(res => res.json())
      .then(data => {
        setPhotos(data.photos || [])
      })
      .catch(err => {
        console.error("Error fetching photos:", err)
        setPhotos([])
      })
      .finally(() => setLoading(false))
  }, [transferId])

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await fetch(`/api/transfers/photos?id=${photoId}`, {
        method: "DELETE"
      })
      setPhotos(prev => prev.filter(p => p.id !== photoId))
      toast.success("Foto berhasil dihapus")
    } catch (error) {
      console.error("Error deleting photo:", error)
      toast.error("Gagal menghapus foto")
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !transferId) return

    setUploading(true)
    const files = Array.from(e.target.files)
    const formData = new FormData()
    formData.append("transferId", transferId)
    formData.append("label", `Dokumentasi ${transferId}`)
    files.forEach(file => formData.append("photos", file))

    try {
      const response = await fetch("/api/transfers/photos", {
        method: "POST",
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setPhotos(prev => [...prev, ...(data.photos || [])])
        toast.success(`Berhasil upload ${files.length} foto`)
        onPhotosUploaded?.()
      } else {
        toast.error("Gagal upload foto")
      }
    } catch (error) {
      console.error("Error uploading photos:", error)
      toast.error("Gagal upload foto")
    } finally {
      setUploading(false)
    }

    if (e.target === fileInputRef.current && fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (e.target === cameraInputRef.current && cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }

  if (!transferId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Pilih transfer untuk melihat foto dokumentasi</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div>
      {!readOnly && (
        <div className="flex items-center gap-2 mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
          >
            <CameraIcon className="h-4 w-4 mr-2" />
            Ambil Foto
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <PhotoIcon className="h-4 w-4 mr-2" />
            Upload Foto
          </Button>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
            <CameraIcon className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="font-medium">Belum ada foto dokumentasi</p>
          <p className="text-sm mt-1">Ambil atau upload foto saat menerima/mengirim transfer</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden relative group">
              <CardContent className="p-0">
                <div className="aspect-square">
                  <img
                    src={photo.photoData}
                    alt={photo.label}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2 space-y-1">
                  <p className="text-xs font-mono font-medium truncate">{photo.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDateLong(photo.timestamp || photo.createdAt)}
                  </p>
                </div>
              </CardContent>
              {!readOnly && (
                <Button
                  variant="destructive"
                  size="icon-xs"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDeletePhoto(photo.id)}
                >
                  <TrashIcon className="h-3 w-3" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}