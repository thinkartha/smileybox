"use client"

import { useState, useMemo } from "react"
import { useStore } from "@/lib/store"
import type { Ticket, TicketStatus, TicketPriority, TicketCategory } from "@/lib/types"
import { format } from "date-fns"
import {
  Search,
  Plus,
  X,
  Send,
  Clock,
  Eye,
  EyeOff,
  GitPullRequestArrow,
  ChevronDown,
  MessageSquare,
  Filter,
} from "lucide-react"

// --- Status / Priority Badges ---

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-chart-3/15 text-chart-3 border-chart-3/30",
    "in-progress": "bg-primary/15 text-primary border-primary/30",
    "awaiting-client": "bg-chart-4/15 text-chart-4 border-chart-4/30",
    resolved: "bg-chart-2/15 text-chart-2 border-chart-2/30",
    closed: "bg-muted text-muted-foreground border-border",
  }
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${styles[status] || styles.open}`}>
      {status.replace("-", " ")}
    </span>
  )
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: "bg-muted-foreground",
    medium: "bg-chart-4",
    high: "bg-primary",
    critical: "bg-destructive",
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${colors[priority]}`} />
      <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">{priority}</span>
    </span>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const styles: Record<string, string> = {
    bug: "text-destructive",
    support: "text-primary",
    question: "text-chart-3",
    feature: "text-chart-2",
    enhancement: "text-chart-4",
  }
  return (
    <span className={`text-[9px] font-bold tracking-wider uppercase ${styles[category] || "text-muted-foreground"}`}>
      {category}
    </span>
  )
}

// --- Main Tickets Page ---

export function TicketsPage() {
  const {
    currentUser,
    tickets,
    users,
    getUserById,
    getOrgById,
    createTicket,
    updateTicketStatus,
    updateTicketPriority,
    assignTicket,
    addMessage,
    addTimeEntry,
    requestConversion,
  } = useStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all")
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all")
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all")
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  if (!currentUser) return null

  const isInternal =
    currentUser.role === "admin" ||
    currentUser.role === "support-lead" ||
    currentUser.role === "support-staff"

  const baseTickets = isInternal
    ? tickets
    : tickets.filter((t) => t.organizationId === currentUser.organizationId)

  const filteredTickets = useMemo(() => {
    return baseTickets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false
      if (
        searchQuery &&
        !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false
      return true
    })
  }, [baseTickets, statusFilter, priorityFilter, categoryFilter, searchQuery])

  const sortedTickets = [...filteredTickets].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  // Refresh selectedTicket from store
  const activeTicket = selectedTicket
    ? tickets.find((t) => t.id === selectedTicket.id) || null
    : null

  return (
    <div className="flex h-full">
      {/* Ticket List */}
      <div className={`flex flex-col border-r border-border ${activeTicket ? "w-[420px] shrink-0" : "flex-1"}`}>
        {/* Toolbar */}
        <div className="border-b border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-bold tracking-wider text-foreground uppercase">
              Tickets
              <span className="ml-2 text-muted-foreground font-normal">
                ({sortedTickets.length})
              </span>
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-colors ${
                  showFilters
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Filter className="h-3 w-3" />
                Filters
              </button>
              {currentUser.role === "client" && (
                <button
                  onClick={() => setShowNewTicket(true)}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Plus className="h-3 w-3" />
                  New Ticket
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-secondary/50 py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                label="Status"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as TicketStatus | "all")}
                options={[
                  { value: "all", label: "All" },
                  { value: "open", label: "Open" },
                  { value: "in-progress", label: "In Progress" },
                  { value: "awaiting-client", label: "Awaiting Client" },
                  { value: "resolved", label: "Resolved" },
                  { value: "closed", label: "Closed" },
                ]}
              />
              <FilterSelect
                label="Priority"
                value={priorityFilter}
                onChange={(v) => setPriorityFilter(v as TicketPriority | "all")}
                options={[
                  { value: "all", label: "All" },
                  { value: "critical", label: "Critical" },
                  { value: "high", label: "High" },
                  { value: "medium", label: "Medium" },
                  { value: "low", label: "Low" },
                ]}
              />
              <FilterSelect
                label="Category"
                value={categoryFilter}
                onChange={(v) => setCategoryFilter(v as TicketCategory | "all")}
                options={[
                  { value: "all", label: "All" },
                  { value: "bug", label: "Bug" },
                  { value: "support", label: "Support" },
                  { value: "question", label: "Question" },
                  { value: "feature", label: "Feature" },
                  { value: "enhancement", label: "Enhancement" },
                ]}
              />
            </div>
          )}
        </div>

        {/* Ticket List */}
        <div className="flex-1 overflow-y-auto">
          {sortedTickets.map((ticket) => {
            const org = getOrgById(ticket.organizationId)
            const assignee = ticket.assignedTo ? getUserById(ticket.assignedTo) : null
            const isSelected = activeTicket?.id === ticket.id
            return (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`w-full text-left border-b border-border px-4 py-3 transition-colors ${
                  isSelected
                    ? "bg-primary/5 border-l-2 border-l-primary"
                    : "hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">{ticket.id}</span>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <p className="text-sm text-foreground truncate">{ticket.title}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <PriorityDot priority={ticket.priority} />
                      <CategoryBadge category={ticket.category} />
                      {isInternal && org && (
                        <span className="text-[10px] text-muted-foreground truncate">{org.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(ticket.updatedAt), "MMM d")}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 justify-end">
                      {ticket.messages.length > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <MessageSquare className="h-2.5 w-2.5" />
                          {ticket.messages.length}
                        </span>
                      )}
                      {assignee && (
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-secondary text-[8px] font-bold text-foreground">
                          {assignee.avatar}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
          {sortedTickets.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No tickets match your filters
            </div>
          )}
        </div>
      </div>

      {/* Ticket Detail Panel */}
      {activeTicket && (
        <TicketDetail
          ticket={activeTicket}
          onClose={() => setSelectedTicket(null)}
          isInternal={isInternal}
        />
      )}

      {/* New Ticket Modal */}
      {showNewTicket && (
        <NewTicketModal
          onClose={() => setShowNewTicket(false)}
          onCreate={(data) => {
            createTicket({
              ...data,
              organizationId: currentUser.organizationId || "",
              createdBy: currentUser.id,
              assignedTo: null,
            })
            setShowNewTicket(false)
          }}
        />
      )}
    </div>
  )
}

// --- Filter Select ---

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-md border border-border bg-secondary/50 py-1.5 pl-2.5 pr-7 text-[10px] font-bold tracking-wider uppercase text-foreground focus:border-primary/50 focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {label}: {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

// --- Ticket Detail ---

function TicketDetail({
  ticket,
  onClose,
  isInternal,
}: {
  ticket: Ticket
  onClose: () => void
  isInternal: boolean
}) {
  const {
    currentUser,
    users,
    getUserById,
    getOrgById,
    updateTicketStatus,
    updateTicketPriority,
    assignTicket,
    addMessage,
    addTimeEntry,
    requestConversion,
  } = useStore()

  const [newMessage, setNewMessage] = useState("")
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [showTimeLog, setShowTimeLog] = useState(false)
  const [timeHours, setTimeHours] = useState("")
  const [timeDesc, setTimeDesc] = useState("")
  const [showConversion, setShowConversion] = useState(false)
  const [convType, setConvType] = useState<"feature" | "enhancement">("feature")
  const [convReason, setConvReason] = useState("")

  if (!currentUser) return null

  const org = getOrgById(ticket.organizationId)
  const creator = getUserById(ticket.createdBy)
  const assignee = ticket.assignedTo ? getUserById(ticket.assignedTo) : null
  const internalUsers = users.filter(
    (u) => u.role === "support-staff" || u.role === "support-lead"
  )

  const visibleMessages = ticket.messages.filter(
    (m) => !m.isInternal || isInternal
  )

  const handleSendMessage = () => {
    if (!newMessage.trim()) return
    addMessage(ticket.id, {
      ticketId: ticket.id,
      userId: currentUser.id,
      content: newMessage.trim(),
      isInternal: isInternal && isInternalNote,
    })
    setNewMessage("")
  }

  const handleLogTime = () => {
    const hours = parseFloat(timeHours)
    if (isNaN(hours) || hours <= 0 || !timeDesc.trim()) return
    addTimeEntry(ticket.id, {
      ticketId: ticket.id,
      userId: currentUser.id,
      hours,
      description: timeDesc.trim(),
      date: new Date().toISOString().split("T")[0],
    })
    setTimeHours("")
    setTimeDesc("")
    setShowTimeLog(false)
  }

  const handleRequestConversion = () => {
    if (!convReason.trim()) return
    requestConversion(ticket.id, {
      ticketId: ticket.id,
      proposedType: convType,
      reason: convReason.trim(),
      proposedBy: currentUser.id,
    })
    setConvReason("")
    setShowConversion(false)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-muted-foreground">{ticket.id}</span>
              <StatusBadge status={ticket.status} />
              <PriorityDot priority={ticket.priority} />
              <CategoryBadge category={ticket.category} />
            </div>
            <h2 className="text-base font-bold text-foreground">{ticket.title}</h2>
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
              {org && <span>{org.name}</span>}
              {creator && <span>by {creator.name}</span>}
              <span>{format(new Date(ticket.createdAt), "MMM d, yyyy")}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Actions row */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {isInternal && (
            <>
              <select
                value={ticket.status}
                onChange={(e) => updateTicketStatus(ticket.id, e.target.value as TicketStatus)}
                className="rounded-md border border-border bg-secondary/50 px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-foreground focus:outline-none"
              >
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="awaiting-client">Awaiting Client</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={ticket.priority}
                onChange={(e) => updateTicketPriority(ticket.id, e.target.value as TicketPriority)}
                className="rounded-md border border-border bg-secondary/50 px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-foreground focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <select
                value={ticket.assignedTo || ""}
                onChange={(e) => assignTicket(ticket.id, e.target.value || null)}
                className="rounded-md border border-border bg-secondary/50 px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-foreground focus:outline-none"
              >
                <option value="">Unassigned</option>
                {internalUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowTimeLog(!showTimeLog)}
                className="flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-muted-foreground hover:text-foreground"
              >
                <Clock className="h-3 w-3" />
                {ticket.hoursWorked}h
              </button>
              {!ticket.conversionRequest && (
                <button
                  onClick={() => setShowConversion(!showConversion)}
                  className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-primary hover:bg-primary/20"
                >
                  <GitPullRequestArrow className="h-3 w-3" />
                  Convert
                </button>
              )}
            </>
          )}
        </div>

        {/* Conversion request status */}
        {ticket.conversionRequest && (
          <div className="mt-3 rounded-md border border-chart-4/30 bg-chart-4/10 px-3 py-2">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase text-chart-4">
              <GitPullRequestArrow className="h-3 w-3" />
              Conversion to {ticket.conversionRequest.proposedType}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {ticket.conversionRequest.reason}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-[10px] text-muted-foreground">
                Internal:{" "}
                <span className={ticket.conversionRequest.internalApproval === "approved" ? "text-chart-2" : ticket.conversionRequest.internalApproval === "rejected" ? "text-destructive" : "text-chart-4"}>
                  {ticket.conversionRequest.internalApproval.toUpperCase()}
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground">
                Client:{" "}
                <span className={ticket.conversionRequest.clientApproval === "approved" ? "text-chart-2" : ticket.conversionRequest.clientApproval === "rejected" ? "text-destructive" : "text-chart-4"}>
                  {ticket.conversionRequest.clientApproval.toUpperCase()}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Time Log Form */}
      {showTimeLog && isInternal && (
        <div className="border-b border-border bg-secondary/30 px-5 py-3">
          <h3 className="text-[10px] font-bold tracking-wider text-foreground uppercase mb-2">
            Log Time
          </h3>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <input
                type="number"
                step="0.5"
                min="0.5"
                placeholder="Hours"
                value={timeHours}
                onChange={(e) => setTimeHours(e.target.value)}
                className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
              />
            </div>
            <div className="flex-[3]">
              <input
                type="text"
                placeholder="Description"
                value={timeDesc}
                onChange={(e) => setTimeDesc(e.target.value)}
                className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
              />
            </div>
            <button
              onClick={handleLogTime}
              className="rounded-md bg-primary px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-primary-foreground hover:bg-primary/90"
            >
              Log
            </button>
          </div>
          {ticket.timeEntries.length > 0 && (
            <div className="mt-2 space-y-1">
              {ticket.timeEntries.map((te) => {
                const entryUser = getUserById(te.userId)
                return (
                  <div key={te.id} className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="font-mono">{te.hours}h</span>
                    <span>{te.description}</span>
                    <span>{entryUser?.name}</span>
                    <span>{te.date}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Conversion Request Form */}
      {showConversion && isInternal && !ticket.conversionRequest && (
        <div className="border-b border-border bg-secondary/30 px-5 py-3">
          <h3 className="text-[10px] font-bold tracking-wider text-foreground uppercase mb-2">
            Request Conversion to Development
          </h3>
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => setConvType("feature")}
                className={`rounded-md border px-3 py-1 text-[10px] font-bold tracking-wider uppercase ${
                  convType === "feature"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Feature
              </button>
              <button
                onClick={() => setConvType("enhancement")}
                className={`rounded-md border px-3 py-1 text-[10px] font-bold tracking-wider uppercase ${
                  convType === "enhancement"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Enhancement
              </button>
            </div>
            <textarea
              placeholder="Explain why this should be converted..."
              value={convReason}
              onChange={(e) => setConvReason(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConversion(false)}
                className="rounded-md border border-border px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestConversion}
                className="rounded-md bg-primary px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-primary-foreground hover:bg-primary/90"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      <div className="border-b border-border px-5 py-3">
        <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-1">
          Description
        </h3>
        <p className="text-xs text-foreground leading-relaxed">{ticket.description}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
        {visibleMessages.map((msg) => {
          const msgUser = getUserById(msg.userId)
          const isMine = msg.userId === currentUser?.id
          return (
            <div key={msg.id} className={`flex gap-3 ${msg.isInternal ? "opacity-75" : ""}`}>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-secondary text-[9px] font-bold text-foreground">
                {msgUser?.avatar || "??"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{msgUser?.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(msg.createdAt), "MMM d, HH:mm")}
                  </span>
                  {msg.isInternal && (
                    <span className="flex items-center gap-0.5 rounded border border-chart-4/30 bg-chart-4/10 px-1.5 py-0.5 text-[8px] font-bold tracking-wider uppercase text-chart-4">
                      <EyeOff className="h-2 w-2" />
                      Internal
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">
                  {msg.content}
                </p>
              </div>
            </div>
          )
        })}
        {visibleMessages.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-4">
            No messages yet
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-border px-5 py-3">
        {isInternal && (
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setIsInternalNote(false)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold tracking-wider uppercase ${
                !isInternalNote
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              <Eye className="h-2.5 w-2.5" />
              Reply
            </button>
            <button
              onClick={() => setIsInternalNote(true)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold tracking-wider uppercase ${
                isInternalNote
                  ? "bg-chart-4/10 text-chart-4 border border-chart-4/30"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              <EyeOff className="h-2.5 w-2.5" />
              Internal Note
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isInternalNote ? "Add an internal note..." : "Type your reply..."}
            rows={2}
            className="flex-1 rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSendMessage()
              }
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// --- New Ticket Modal ---

function NewTicketModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (data: {
    title: string
    description: string
    priority: TicketPriority
    category: TicketCategory
    status: TicketStatus
  }) => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TicketPriority>("medium")
  const [category, setCategory] = useState<TicketCategory>("bug")

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) return
    onCreate({
      title: title.trim(),
      description: description.trim(),
      priority,
      category,
      status: "open",
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-bold tracking-wider text-foreground uppercase">
            New Support Ticket
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              className="w-full rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about the issue..."
              rows={4}
              className="w-full rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className="w-full rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground focus:outline-none"
              >
                <option value="bug">Bug</option>
                <option value="support">Support</option>
                <option value="question">Question</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-[10px] font-bold tracking-wider uppercase text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim()}
            className="rounded-md bg-primary px-4 py-2 text-[10px] font-bold tracking-wider uppercase text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Create Ticket
          </button>
        </div>
      </div>
    </div>
  )
}
