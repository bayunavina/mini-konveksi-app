import { redirect } from "next/navigation"

export default function OldTransactionsPage() {
  redirect("/overview/finance/transactions")
}
