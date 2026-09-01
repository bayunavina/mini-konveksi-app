import { Resend } from 'resend'

let resend: Resend | null = null

function getResend() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('Missing RESEND_API_KEY')
    }
    resend = new Resend(apiKey)
  }
  return resend
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const data = await getResend().emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to,
      subject,
      html,
    })

    return { success: true, data }
  } catch (error) {
    console.error('Resend error:', error)
    return { success: false, error }
  }
}

export function emailTemplates() {
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
  }
}
