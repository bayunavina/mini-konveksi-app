"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"


import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared"
import {
  ArrowRightIcon,
} from "@heroicons/react/24/outline"
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants"

interface Employee {
  id: string
  name: string
  email?: string
  role: string
  pin?: string
  isActive: boolean
  lastLogin?: string | null
  hasPassword?: boolean
}

export default function SettingsPage() {
  const [users, setUsers] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/employees")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Password & User"
        description="Pengaturan password dan data user"
      />

      <Card>
        <CardHeader>
          <CardTitle>Menu Settings</CardTitle>
          <CardDescription>Kelola pengaturan aplikasi</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Link href="/dashboard/settings/users">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Password & User
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Kelola password dan data user</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/settings/master">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Data Master
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>SKU, Supplier, Kategori Biaya</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/settings/general">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Pengaturan Umum
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Konfigurasi sistem</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar User</CardTitle>
          <CardDescription>Kelola password dan last login user</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden md:table-cell">Nama</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead>Last Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Skeleton className="h-8 w-full mx-auto max-w-md" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Belum ada user
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium hidden md:table-cell">{user.name}</TableCell>
                    <TableCell className="hidden lg:table-cell">{user.email || "-"}</TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[user.role as keyof typeof ROLE_COLORS]}>
                        {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.lastLogin ? (
                        <span className="text-sm text-muted-foreground">
                          {new Date(user.lastLogin).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                          Belum pernah
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
