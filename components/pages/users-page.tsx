"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import type { UserRole } from "@/lib/types"
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Shield,
  Headphones,
  Building2,
  Mail,
  Filter,
} from "lucide-react"

type ModalMode = "create" | "edit" | null

interface UserFormData {
  name: string
  email: string
  role: UserRole
  organizationId: string | null
  password: string
}

const emptyForm: UserFormData = { name: "", email: "", role: "support-staff", organizationId: null, password: "" }

const roleConfig: Record<UserRole, { label: string; color: string; icon: React.ReactNode; category: "internal" | "client" }> = {
  admin: { label: "ADMIN", color: "bg-primary/15 text-primary border-primary/30", icon: <Shield className="h-3.5 w-3.5" />, category: "internal" },
  "support-lead": { label: "SUPPORT LEAD", color: "bg-chart-4/15 text-chart-4 border-chart-4/30", icon: <Users className="h-3.5 w-3.5" />, category: "internal" },
  "support-staff": { label: "SUPPORT STAFF", color: "bg-chart-3/15 text-chart-3 border-chart-3/30", icon: <Headphones className="h-3.5 w-3.5" />, category: "internal" },
  client: { label: "CLIENT", color: "bg-chart-2/15 text-chart-2 border-chart-2/30", icon: <Building2 className="h-3.5 w-3.5" />, category: "client" },
}

export function UsersPage() {
  const { currentUser, users, organizations, tickets, createUser, updateUser, deleteUser } = useStore()
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<UserFormData>(emptyForm)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all")
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  if (!currentUser) return null
  if (currentUser.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        You do not have access to this section.
      </div>
    )
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === "all" || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  const internalUsers = filteredUsers.filter((u) => roleConfig[u.role].category === "internal")
  const clientUsers = filteredUsers.filter((u) => roleConfig[u.role].category === "client")

  const openCreateModal = (role?: UserRole) => {
    const r = role || "support-staff"
    setForm({ ...emptyForm, role: r, organizationId: r === "client" ? (organizations[0]?.id || null) : null })
    setEditId(null)
    setModalMode("create")
  }

  const openEditModal = (user: typeof users[0]) => {
    setForm({ name: user.name, email: user.email, role: user.role, organizationId: user.organizationId, password: "" })
    setEditId(user.id)
    setModalMode("edit")
  }

  const handleSubmit = () => {
    if (!form.name || !form.email) return
    if (modalMode === "create") {
      createUser({ name: form.name, email: form.email, role: form.role, organizationId: form.role === "client" ? form.organizationId : null, password: form.password || undefined })
    } else if (modalMode === "edit" && editId) {
      updateUser(editId, { name: form.name, email: form.email, role: form.role, organizationId: form.role === "client" ? form.organizationId : null })
    }
    setModalMode(null)
    setForm(emptyForm)
    setEditId(null)
  }

  const handleDelete = (id: string) => {
    deleteUser(id)
    setDeleteConfirm(null)
  }

  const getOrgName = (orgId: string | null) => {
    if (!orgId) return "Internal"
    return organizations.find((o) => o.id === orgId)?.name || "Unknown"
  }

  const getUserTicketCount = (userId: string) => tickets.filter((t) => t.assignedTo === userId || t.createdBy === userId).length

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-sm font-bold tracking-wider text-foreground uppercase">
            User Management
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {users.length} total users across {organizations.length} organizations
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openCreateModal("support-staff")}
            className="flex items-center gap-1.5 rounded-md border border-chart-3/30 bg-chart-3/10 px-3 py-1.5 text-[10px] font-bold tracking-wider text-chart-3 uppercase transition-all hover:bg-chart-3/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Staff
          </button>
          <button
            onClick={() => openCreateModal("client")}
            className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-[10px] font-bold tracking-wider text-primary uppercase transition-all hover:bg-primary/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Client User
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
            className="bg-transparent py-2 text-xs text-foreground focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="support-lead">Support Lead</option>
            <option value="support-staff">Support Staff</option>
            <option value="client">Client</option>
          </select>
        </div>
      </div>

      {/* Internal Staff Section */}
      {internalUsers.length > 0 && (
        <div>
          <h2 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-3">
            Internal Staff ({internalUsers.length})
          </h2>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {internalUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                orgName={getOrgName(user.organizationId)}
                ticketCount={getUserTicketCount(user.id)}
                onEdit={() => openEditModal(user)}
                onDelete={() => setDeleteConfirm(user.id)}
                isCurrentUser={user.id === currentUser.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Client Users Section */}
      {clientUsers.length > 0 && (
        <div>
          <h2 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-3">
            Client Users ({clientUsers.length})
          </h2>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {clientUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                orgName={getOrgName(user.organizationId)}
                ticketCount={getUserTicketCount(user.id)}
                onEdit={() => openEditModal(user)}
                onDelete={() => setDeleteConfirm(user.id)}
                isCurrentUser={user.id === currentUser.id}
              />
            ))}
          </div>
        </div>
      )}

      {filteredUsers.length === 0 && (
        <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
          No users found matching your filters.
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setModalMode(null)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-bold tracking-wider text-foreground uppercase">
                {modalMode === "create" ? "Create User" : "Edit User"}
              </h2>
              <button onClick={() => setModalMode(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="John Smith"
                  className="w-full rounded-md border border-border bg-secondary/50 p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full rounded-md border border-border bg-secondary/50 p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                />
              </div>
              {modalMode === "create" && (
                <div>
                  <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Password
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Initial password"
                    className="w-full rounded-md border border-border bg-secondary/50 p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">Leave empty for default password in demo mode.</p>
                </div>
              )}
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(roleConfig) as [UserRole, typeof roleConfig[UserRole]][]).map(([role, cfg]) => (
                    <button
                      key={role}
                      onClick={() => setForm({ ...form, role, organizationId: cfg.category === "client" ? (form.organizationId || organizations[0]?.id || null) : null })}
                      className={`flex items-center gap-1.5 rounded-md border py-2 px-3 text-[10px] font-bold tracking-wider uppercase transition-all ${
                        form.role === role
                          ? `${cfg.color}`
                          : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
              {form.role === "client" && (
                <div>
                  <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Organization
                  </label>
                  <select
                    value={form.organizationId || ""}
                    onChange={(e) => setForm({ ...form, organizationId: e.target.value || null })}
                    className="w-full rounded-md border border-border bg-secondary/50 p-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                  >
                    <option value="">Select organization...</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setModalMode(null)}
                  className="rounded-md border border-border px-4 py-2 text-xs text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!form.name || !form.email || (form.role === "client" && !form.organizationId)}
                  className="rounded-md bg-primary px-4 py-2 text-xs font-bold tracking-wider text-primary-foreground uppercase hover:bg-primary/90 disabled:opacity-50"
                >
                  {modalMode === "create" ? "Create User" : "Save Changes"}
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
            <h3 className="text-sm font-bold text-foreground mb-2">Delete User?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              This will permanently remove this user. Tickets they created or are assigned to will be preserved but unassigned.
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

function UserRow({
  user,
  orgName,
  ticketCount,
  onEdit,
  onDelete,
  isCurrentUser,
}: {
  user: import("@/lib/types").User
  orgName: string
  ticketCount: number
  onEdit: () => void
  onDelete: () => void
  isCurrentUser: boolean
}) {
  const cfg = roleConfig[user.role]
  return (
    <div className="flex items-center gap-3 px-4 py-3 group transition-colors hover:bg-secondary/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-[11px] font-bold tracking-wider text-foreground">
        {user.avatar}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
          {isCurrentUser && (
            <span className="text-[8px] font-bold tracking-wider text-muted-foreground uppercase border border-border rounded px-1 py-0.5">You</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Mail className="h-2.5 w-2.5" />
            {user.email}
          </span>
          <span className="text-[10px] text-muted-foreground">{orgName}</span>
          <span className="text-[10px] text-muted-foreground">{ticketCount} tickets</span>
        </div>
      </div>
      <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${cfg.color}`}>
        {cfg.icon}
        {cfg.label}
      </span>
      <div className="hidden gap-1 group-hover:flex">
        <button onClick={onEdit} className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Edit">
          <Pencil className="h-3 w-3" />
        </button>
        {!isCurrentUser && (
          <button onClick={onDelete} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete">
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}
