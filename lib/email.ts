import nodemailer from 'nodemailer'
import { db } from '@/db'
import { appSettings } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { formatCurrency } from '@/lib/currency'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST
    const port = parseInt(process.env.SMTP_PORT || '587')
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (!host || !user || !pass) {
      throw new Error('Missing SMTP configuration in .env (SMTP_HOST, SMTP_USER, SMTP_PASS)')
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
  }
  return transporter
}

export async function isEmailEnabled(): Promise<boolean> {
  try {
    const result = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, 'email_smtp_enabled'))
      .limit(1)
    return result[0]?.value === 'true'
  } catch {
    return false
  }
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const enabled = await isEmailEnabled()
    if (!enabled) {
      return { success: false, disabled: true }
    }

    const transport = getTransporter()
    const from = process.env.EMAIL_FROM || 'ERP Konveksi <erpkonveksi@gmail.com>'

    const info = await transport.sendMail({ from, to, subject, html })
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('SMTP email error:', error)
    return { success: false, error }
  }
}

export async function testSmtpConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const transport = getTransporter()
    await transport.verify()
    return { success: true, message: 'Koneksi SMTP berhasil' }
  } catch (error) {
    const err = error as Error
    return { success: false, message: err.message || 'Koneksi SMTP gagal' }
  }
}

export function emailTemplates(currency?: string) {
  const money = (amount: number) => formatCurrency(amount, currency)
  return {
    orderComplete: (joNumber: string, productName: string, qty: number) => ({
      subject: `Order Selesai - JO ${joNumber}`,
      html: `
        <h1>Order Selesai</h1>
        <p>Job Order <strong>${joNumber}</strong> untuk produk <strong>${productName}</strong> sejumlah <strong>${qty}</strong> unit telah selesai.</p>
        <p>Silakan lakukan pengecekan di sistem.</p>
      `,
    }),
    transferIn: (transferNumber: string, from: string, to: string, items: number) => ({
      subject: `Transfer Masuk - ${transferNumber}`,
      html: `
        <h1>Transfer Masuk</h1>
        <p>Nomor Transfer: <strong>${transferNumber}</strong></p>
        <p>Dari: <strong>${from}</strong></p>
        <p>Ke: <strong>${to}</strong></p>
        <p>Jumlah Item: <strong>${items}</strong></p>
      `,
    }),
    transferOut: (transferNumber: string, from: string, to: string, items: number) => ({
      subject: `Transfer Keluar - ${transferNumber}`,
      html: `
        <h1>Transfer Keluar</h1>
        <p>Nomor Transfer: <strong>${transferNumber}</strong></p>
        <p>Dari: <strong>${from}</strong></p>
        <p>Ke: <strong>${to}</strong></p>
        <p>Jumlah Item: <strong>${items}</strong></p>
      `,
    }),
    lowStock: (productName: string, currentStock: number, minStock: number) => ({
      subject: `Stok Rendah - ${productName}`,
      html: `
        <h1>Peringatan Stok Rendah</h1>
        <p>Produk: <strong>${productName}</strong></p>
        <p>Stok Saat Ini: <strong>${currentStock}</strong></p>
        <p>Stok Minimum: <strong>${minStock}</strong></p>
        <p>Silakan lakukan restock segera.</p>
      `,
    }),
    transaction: (type: string, amount: number, description: string) => ({
      subject: `Transaksi ${type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'} - ${money(amount)}`,
      html: `
        <h1>Transaksi ${type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}</h1>
        <p>Jumlah: <strong>${money(amount)}</strong></p>
        <p>Deskripsi: <strong>${description || '-'}</strong></p>
      `,
    }),
    salaryClaim: (employeeName: string, amount: number) => ({
      subject: `Klaim Gaji - ${employeeName}`,
      html: `
        <h1>Klaim Gaji Baru</h1>
        <p>Karyawan: <strong>${employeeName}</strong></p>
        <p>Jumlah: <strong>${money(amount)}</strong></p>
        <p>Silakan proses klaim gaji ini di sistem.</p>
      `,
    }),
    salaryPaid: (employeeName: string, amount: number) => ({
      subject: `Gaji Dibayar - ${employeeName}`,
      html: `
        <h1>Gaji Telah Dibayar</h1>
        <p>Karyawan: <strong>${employeeName}</strong></p>
        <p>Jumlah: <strong>${money(amount)}</strong></p>
      `,
    }),
    advanceRequest: (employeeName: string, amount: number) => ({
      subject: `Kasbon Baru - ${employeeName}`,
      html: `
        <h1>Permintaan Kasbon</h1>
        <p>Karyawan: <strong>${employeeName}</strong></p>
        <p>Jumlah: <strong>${money(amount)}</strong></p>
        <p>Silakan proses kasbon ini di sistem.</p>
      `,
    }),
    advanceApproved: (employeeName: string, amount: number) => ({
      subject: `Kasbon Disetujui - ${employeeName}`,
      html: `
        <h1>Kasbon Disetujui</h1>
        <p>Karyawan: <strong>${employeeName}</strong></p>
        <p>Jumlah: <strong>${money(amount)}</strong></p>
      `,
    }),
    advanceRejected: (employeeName: string, amount: number) => ({
      subject: `Kasbon Ditolak - ${employeeName}`,
      html: `
        <h1>Kasbon Ditolak</h1>
        <p>Karyawan: <strong>${employeeName}</strong></p>
        <p>Jumlah: <strong>${money(amount)}</strong></p>
      `,
    }),
    qcPending: (joNumber: string, productName: string, qty: number) => ({
      subject: `QC Menunggu - JO ${joNumber}`,
      html: `
        <h1>QC Menunggu Pengecekan</h1>
        <p>Job Order: <strong>${joNumber}</strong></p>
        <p>Produk: <strong>${productName}</strong></p>
        <p>Jumlah: <strong>${qty}</strong> unit</p>
      `,
    }),
    qcResult: (joNumber: string, status: string) => ({
      subject: `Hasil QC - JO ${joNumber} - ${status}`,
      html: `
        <h1>Hasil Pengecekan QC</h1>
        <p>Job Order: <strong>${joNumber}</strong></p>
        <p>Status: <strong>${status}</strong></p>
      `,
    }),
  }
}
