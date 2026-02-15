"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { format } from "date-fns"
import type { InvoiceStatus } from "@/lib/types"
import {
  Receipt,
  DollarSign,
  FileText,
  Plus,
  X,
  CheckCircle2,
  Clock,
  Send,
  Download,
} from "lucide-react"

export function BillingPage() {
  const {
    currentUser,
    organizations,
    tickets,
    invoices,
    ratePerHour,
    getOrgById,
    createInvoice,
    updateInvoiceStatus,
  } = useStore()

  const [showGenerate, setShowGenerate] = useState(false)

  if (!currentUser) return null

  const isAdmin = currentUser.role === "admin"
  const isClient = currentUser.role === "client"

  if (!isAdmin && !isClient) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        You do not have access to this section.
      </div>
    )
  }

  const visibleInvoices = isClient
    ? invoices.filter((inv) => inv.organizationId === currentUser.organizationId)
    : invoices

  const totalRevenue = visibleInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
  const paidRevenue = visibleInvoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.totalAmount, 0)
  const outstanding = visibleInvoices
    .filter((inv) => inv.status === "sent")
    .reduce((sum, inv) => sum + inv.totalAmount, 0)
  const draftAmount = visibleInvoices
    .filter((inv) => inv.status === "draft")
    .reduce((sum, inv) => sum + inv.totalAmount, 0)

  const statusIcon = (status: InvoiceStatus) => {
    if (status === "paid") return <CheckCircle2 className="h-3.5 w-3.5 text-chart-2" />
    if (status === "sent") return <Send className="h-3.5 w-3.5 text-chart-3" />
    return <FileText className="h-3.5 w-3.5 text-muted-foreground" />
  }

  const statusBadge = (status: InvoiceStatus) => {
    const styles: Record<string, string> = {
      draft: "bg-muted text-muted-foreground border-border",
      sent: "bg-chart-3/15 text-chart-3 border-chart-3/30",
      paid: "bg-chart-2/15 text-chart-2 border-chart-2/30",
    }
    return (
      <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${styles[status]}`}>
        {status}
      </span>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold tracking-wider text-foreground uppercase">
            {isAdmin ? "Billing & Invoices" : "My Invoices"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {isAdmin
              ? "Generate and manage invoices for client organizations"
              : "View your organization's invoices"}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowGenerate(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-3 w-3" />
            Generate Invoice
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Total
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-chart-2" />
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Paid
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">${paidRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-chart-4" />
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Outstanding
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">${outstanding.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Drafts
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">${draftAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Invoice List */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-xs font-bold tracking-wider text-foreground uppercase">
            All Invoices ({visibleInvoices.length})
          </h2>
        </div>
        <div className="divide-y divide-border">
          {visibleInvoices.map((inv) => {
            const org = getOrgById(inv.organizationId)
            return (
              <div
                key={inv.id}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/30"
              >
                <div className="shrink-0">{statusIcon(inv.status)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono font-bold text-foreground">
                      {inv.id}
                    </span>
                    {statusBadge(inv.status)}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    {org && <span>{org.name}</span>}
                    <span>{format(new Date(inv.year, inv.month - 1), "MMMM yyyy")}</span>
                    <span>{inv.ticketsClosed} tickets</span>
                    <span>{inv.totalHours}h</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-foreground">
                    ${inv.totalAmount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    @${inv.ratePerHour}/hr
                  </p>
                </div>
                {isAdmin && (
                  <div className="shrink-0 flex items-center gap-1">
                    {inv.status === "draft" && (
                      <button
                        onClick={() => updateInvoiceStatus(inv.id, "sent")}
                        className="flex items-center gap-1 rounded-md border border-chart-3/30 bg-chart-3/10 px-2 py-1 text-[9px] font-bold tracking-wider uppercase text-chart-3 hover:bg-chart-3/20"
                      >
                        <Send className="h-2.5 w-2.5" />
                        Send
                      </button>
                    )}
                    {inv.status === "sent" && (
                      <button
                        onClick={() => updateInvoiceStatus(inv.id, "paid")}
                        className="flex items-center gap-1 rounded-md border border-chart-2/30 bg-chart-2/10 px-2 py-1 text-[9px] font-bold tracking-wider uppercase text-chart-2 hover:bg-chart-2/20"
                      >
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Mark Paid
                      </button>
                    )}
                  </div>
                )}
                {isClient && (
                  <button className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[9px] font-bold tracking-wider uppercase text-muted-foreground hover:text-foreground">
                    <Download className="h-2.5 w-2.5" />
                    PDF
                  </button>
                )}
              </div>
            )
          })}
          {visibleInvoices.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              No invoices found
            </div>
          )}
        </div>
      </div>

      {/* Generate Invoice Modal */}
      {showGenerate && isAdmin && (
        <GenerateInvoiceModal
          onClose={() => setShowGenerate(false)}
          onCreate={(data) => {
            createInvoice(data)
            setShowGenerate(false)
          }}
        />
      )}
    </div>
  )
}

function GenerateInvoiceModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (data: {
    organizationId: string
    month: number
    year: number
    ticketsClosed: number
    totalHours: number
    ratePerHour: number
    totalAmount: number
    status: InvoiceStatus
  }) => void
}) {
  const { organizations, tickets, ratePerHour } = useStore()
  const [selectedOrg, setSelectedOrg] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(2) // February
  const [selectedYear] = useState(2026)

  const orgTickets = selectedOrg
    ? tickets.filter(
        (t) =>
          t.organizationId === selectedOrg &&
          (t.status === "resolved" || t.status === "closed")
      )
    : []

  const totalHours = orgTickets.reduce((sum, t) => sum + t.hoursWorked, 0)
  const totalAmount = totalHours * ratePerHour

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-bold tracking-wider text-foreground uppercase">
            Generate Invoice
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Organization
            </label>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="w-full rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground focus:outline-none"
            >
              <option value="">Select organization</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground focus:outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {format(new Date(2026, i), "MMMM")}
                </option>
              ))}
            </select>
          </div>

          {selectedOrg && (
            <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Resolved Tickets</span>
                <span className="font-bold text-foreground">{orgTickets.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Hours</span>
                <span className="font-bold text-foreground">{totalHours}h</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Rate</span>
                <span className="font-bold text-foreground">${ratePerHour}/hr</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-sm">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-bold text-primary">${totalAmount.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-[10px] font-bold tracking-wider uppercase text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!selectedOrg) return
              onCreate({
                organizationId: selectedOrg,
                month: selectedMonth,
                year: selectedYear,
                ticketsClosed: orgTickets.length,
                totalHours,
                ratePerHour,
                totalAmount,
                status: "draft",
              })
            }}
            disabled={!selectedOrg}
            className="rounded-md bg-primary px-4 py-2 text-[10px] font-bold tracking-wider uppercase text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  )
}
