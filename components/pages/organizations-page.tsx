"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { format } from "date-fns"
import {
  Building2,
  Users,
  Ticket,
  X,
  Mail,
  Calendar,
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronRight,
} from "lucide-react"

type ModalMode = "create" | "edit" | null

interface OrgFormData {
  name: string
  plan: "starter" | "professional" | "enterprise"
  contactEmail: string
}

const emptyForm: OrgFormData = { name: "", plan: "starter", contactEmail: "" }

export function OrganizationsPage() {
  const { currentUser, organizations, users, tickets, invoices, createOrganization, updateOrganization, deleteOrganization } = useStore()
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<OrgFormData>(emptyForm)
  const [search, setSearch] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  if (!currentUser) return null
  if (currentUser.role !== "admin" && currentUser.role !== "support-lead") {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        You do not have access to this section.
      </div>
    )
  }

  const filteredOrgs = organizations.filter(
    (o) => o.name.toLowerCase().includes(search.toLowerCase()) || o.contactEmail.toLowerCase().includes(search.toLowerCase())
  )

  const selectedOrg = selectedOrgId ? organizations.find((o) => o.id === selectedOrgId) : null

  const openCreateModal = () => {
    setForm(emptyForm)
    setEditId(null)
    setModalMode("create")
  }

  const openEditModal = (org: typeof organizations[0]) => {
    setForm({ name: org.name, plan: org.plan, contactEmail: org.contactEmail })
    setEditId(org.id)
    setModalMode("edit")
  }

  const handleSubmit = () => {
    if (!form.name || !form.contactEmail) return
    if (modalMode === "create") {
      createOrganization(form)
    } else if (modalMode === "edit" && editId) {
      updateOrganization(editId, form)
    }
    setModalMode(null)
    setForm(emptyForm)
    setEditId(null)
  }

  const handleDelete = (id: string) => {
    deleteOrganization(id)
    setDeleteConfirm(null)
    if (selectedOrgId === id) setSelectedOrgId(null)
  }

  const planColors: Record<string, string> = {
    starter: "bg-muted text-muted-foreground border-border",
    professional: "bg-chart-3/15 text-chart-3 border-chart-3/30",
    enterprise: "bg-primary/15 text-primary border-primary/30",
  }

  return (
    <div className="flex h-full">
      {/* Org List */}
      <div className={`flex-1 overflow-y-auto p-6 ${selectedOrg ? "max-w-md border-r border-border" : ""}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-sm font-bold tracking-wider text-foreground uppercase">
              Organizations
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {organizations.length} client organizations
            </p>
          </div>
          {currentUser.role === "admin" && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-[10px] font-bold tracking-wider text-primary uppercase transition-all hover:bg-primary/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Org
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
          />
        </div>

        <div className="grid gap-3">
          {filteredOrgs.map((org) => {
            const orgUsers = users.filter((u) => u.organizationId === org.id)
            const orgTickets = tickets.filter((t) => t.organizationId === org.id)
            const openTickets = orgTickets.filter(
              (t) => t.status !== "closed" && t.status !== "resolved"
            )
            const isSelected = selectedOrgId === org.id

            return (
              <div key={org.id} className="relative group">
                <button
                  onClick={() => setSelectedOrgId(org.id)}
                  className={`w-full text-left rounded-lg border p-4 transition-all ${
                    isSelected
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-bold text-foreground truncate">
                          {org.name}
                        </h3>
                      </div>
                      <span
                        className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${planColors[org.plan]}`}
                      >
                        {org.plan}
                      </span>
                    </div>
                    <ChevronRight className={`h-4 w-4 shrink-0 transition-colors ${isSelected ? "text-primary" : "text-muted-foreground/50"}`} />
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {orgUsers.length} users
                    </span>
                    <span className="flex items-center gap-1">
                      <Ticket className="h-3 w-3" />
                      {orgTickets.length} total
                    </span>
                    {openTickets.length > 0 && (
                      <span className="flex items-center gap-1 text-primary">
                        {openTickets.length} open
                      </span>
                    )}
                  </div>
                </button>

                {/* Edit / Delete actions */}
                {currentUser.role === "admin" && (
                  <div className="absolute top-3 right-10 hidden gap-1 group-hover:flex">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(org) }}
                      className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="Edit"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(org.id) }}
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
          {filteredOrgs.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-8">No organizations found.</p>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedOrg && (
        <OrgDetailPanel orgId={selectedOrg.id} onClose={() => setSelectedOrgId(null)} onEdit={() => openEditModal(selectedOrg)} />
      )}

      {/* Create/Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setModalMode(null)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-bold tracking-wider text-foreground uppercase">
                {modalMode === "create" ? "Create Organization" : "Edit Organization"}
              </h2>
              <button onClick={() => setModalMode(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Acme Corporation"
                  className="w-full rounded-md border border-border bg-secondary/50 p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  placeholder="contact@acme.com"
                  className="w-full rounded-md border border-border bg-secondary/50 p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Plan
                </label>
                <div className="flex gap-2">
                  {(["starter", "professional", "enterprise"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setForm({ ...form, plan: p })}
                      className={`flex-1 rounded-md border py-2 text-[10px] font-bold tracking-wider uppercase transition-all ${
                        form.plan === p
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setModalMode(null)}
                  className="rounded-md border border-border px-4 py-2 text-xs text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!form.name || !form.contactEmail}
                  className="rounded-md bg-primary px-4 py-2 text-xs font-bold tracking-wider text-primary-foreground uppercase hover:bg-primary/90 disabled:opacity-50"
                >
                  {modalMode === "create" ? "Create" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-sm rounded-lg border border-destructive/30 bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground mb-2">Delete Organization?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              This will also remove all users and tickets associated with this organization. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="rounded-md border border-border px-4 py-2 text-xs text-muted-foreground hover:bg-secondary">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="rounded-md bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OrgDetailPanel({
  orgId,
  onClose,
  onEdit,
}: {
  orgId: string
  onClose: () => void
  onEdit: () => void
}) {
  const { currentUser, organizations, users, tickets, invoices, getUserById } = useStore()

  const org = organizations.find((o) => o.id === orgId)
  if (!org) return null

  const orgUsers = users.filter((u) => u.organizationId === orgId)
  const orgTickets = tickets.filter((t) => t.organizationId === orgId)
  const orgInvoices = invoices.filter((i) => i.organizationId === orgId)

  const openTickets = orgTickets.filter(
    (t) => t.status !== "closed" && t.status !== "resolved"
  )
  const resolvedTickets = orgTickets.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  )
  const totalHours = orgTickets.reduce((sum, t) => sum + t.hoursWorked, 0)
  const totalBilled = orgInvoices.reduce((sum, i) => sum + i.totalAmount, 0)

  const planColors: Record<string, string> = {
    starter: "bg-muted text-muted-foreground border-border",
    professional: "bg-chart-3/15 text-chart-3 border-chart-3/30",
    enterprise: "bg-primary/15 text-primary border-primary/30",
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">{org.name}</h2>
            </div>
            <span
              className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${planColors[org.plan]}`}
            >
              {org.plan}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {currentUser?.role === "admin" && (
              <button
                onClick={onEdit}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-secondary"
                title="Edit organization"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {org.contactEmail}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Since {format(new Date(org.createdAt), "MMM yyyy")}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-5 border-b border-border">
        <StatCard label="Open Tickets" value={openTickets.length} />
        <StatCard label="Resolved" value={resolvedTickets.length} />
        <StatCard label="Total Hours" value={totalHours} />
        <StatCard label="Total Billed" value={`$${totalBilled.toLocaleString()}`} />
      </div>

      {/* Users */}
      <div className="p-5 border-b border-border">
        <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-3">
          Team Members ({orgUsers.length})
        </h3>
        <div className="space-y-2">
          {orgUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 rounded-md border border-border bg-secondary/30 p-2.5"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded bg-secondary text-[9px] font-bold text-foreground">
                {user.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">{user.name}</p>
                <p className="text-[10px] text-muted-foreground">{user.email}</p>
              </div>
              <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">{user.role}</span>
            </div>
          ))}
          {orgUsers.length === 0 && (
            <p className="text-xs text-muted-foreground">No users in this organization.</p>
          )}
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="p-5 border-b border-border">
        <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-3">
          Recent Tickets
        </h3>
        <div className="space-y-2">
          {orgTickets.slice(0, 5).map((ticket) => {
            const assignee = ticket.assignedTo ? getUserById(ticket.assignedTo) : null
            return (
              <div
                key={ticket.id}
                className="flex items-center justify-between rounded-md border border-border p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {ticket.id}
                    </span>
                    <StatusBadgeSmall status={ticket.status} />
                  </div>
                  <p className="text-xs text-foreground truncate mt-0.5">
                    {ticket.title}
                  </p>
                </div>
                {assignee && (
                  <span className="shrink-0 ml-2 flex h-5 w-5 items-center justify-center rounded bg-secondary text-[8px] font-bold text-foreground">
                    {assignee.avatar}
                  </span>
                )}
              </div>
            )
          })}
          {orgTickets.length === 0 && (
            <p className="text-xs text-muted-foreground">No tickets yet.</p>
          )}
        </div>
      </div>

      {/* Invoices */}
      <div className="p-5">
        <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-3">
          Invoices
        </h3>
        <div className="space-y-2">
          {orgInvoices.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between rounded-md border border-border p-2.5"
            >
              <div>
                <p className="text-xs font-mono text-foreground">{inv.id}</p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(inv.year, inv.month - 1), "MMMM yyyy")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-foreground">
                  ${inv.totalAmount.toLocaleString()}
                </p>
                <InvoiceStatusBadge status={inv.status} />
              </div>
            </div>
          ))}
          {orgInvoices.length === 0 && (
            <p className="text-xs text-muted-foreground">No invoices yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-secondary/30 p-3">
      <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
    </div>
  )
}

function StatusBadgeSmall({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-chart-3/15 text-chart-3 border-chart-3/30",
    "in-progress": "bg-primary/15 text-primary border-primary/30",
    "awaiting-client": "bg-chart-4/15 text-chart-4 border-chart-4/30",
    resolved: "bg-chart-2/15 text-chart-2 border-chart-2/30",
    closed: "bg-muted text-muted-foreground border-border",
  }
  return (
    <span className={`inline-flex items-center rounded border px-1 py-0.5 text-[8px] font-bold tracking-wider uppercase ${styles[status] || styles.open}`}>
      {status.replace("-", " ")}
    </span>
  )
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "text-muted-foreground",
    sent: "text-chart-4",
    paid: "text-chart-2",
  }
  return (
    <span className={`text-[9px] font-bold tracking-wider uppercase ${styles[status]}`}>
      {status}
    </span>
  )
}
