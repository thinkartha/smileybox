"use client"

import { useStore } from "@/lib/store"
import { format } from "date-fns"
import {
  GitPullRequestArrow,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
} from "lucide-react"
import type { ApprovalStatus } from "@/lib/types"

export function ApprovalsPage() {
  const {
    currentUser,
    tickets,
    getUserById,
    getOrgById,
    updateConversionApproval,
  } = useStore()

  if (!currentUser) return null

  const isInternal =
    currentUser.role === "admin" || currentUser.role === "support-lead"
  const isClient = currentUser.role === "client"

  if (!isInternal && !isClient) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        You do not have access to this section.
      </div>
    )
  }

  const ticketsWithConversions = tickets.filter((t) => {
    if (!t.conversionRequest) return false
    if (isClient) return t.organizationId === currentUser.organizationId
    return true
  })

  const pending = ticketsWithConversions.filter((t) => {
    const cr = t.conversionRequest!
    if (isInternal) return cr.internalApproval === "pending"
    return cr.clientApproval === "pending"
  })

  const completed = ticketsWithConversions.filter((t) => {
    const cr = t.conversionRequest!
    if (isInternal) return cr.internalApproval !== "pending"
    return cr.clientApproval !== "pending"
  })

  const approvalStatusIcon = (status: ApprovalStatus) => {
    if (status === "approved") return <CheckCircle2 className="h-3.5 w-3.5 text-chart-2" />
    if (status === "rejected") return <XCircle className="h-3.5 w-3.5 text-destructive" />
    return <Clock className="h-3.5 w-3.5 text-chart-4" />
  }

  const approvalStatusColor = (status: ApprovalStatus) => {
    if (status === "approved") return "text-chart-2"
    if (status === "rejected") return "text-destructive"
    return "text-chart-4"
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-sm font-bold tracking-wider text-foreground uppercase">
          Conversion Approvals
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Review and approve ticket-to-development conversion requests
        </p>
      </div>

      {/* Pending Section */}
      <div>
        <h2 className="text-[10px] font-bold tracking-wider text-primary uppercase mb-3 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          Pending Your Approval ({pending.length})
        </h2>

        {pending.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center text-xs text-muted-foreground">
            No pending approvals
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((ticket) => {
              const cr = ticket.conversionRequest!
              const proposer = getUserById(cr.proposedBy)
              const org = getOrgById(ticket.organizationId)

              return (
                <div
                  key={ticket.id}
                  className="rounded-lg border border-border bg-card overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {ticket.id}
                          </span>
                          <span className="flex items-center gap-1 rounded border border-chart-4/30 bg-chart-4/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase text-chart-4">
                            <ArrowRight className="h-2.5 w-2.5" />
                            {cr.proposedType}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-foreground">
                          {ticket.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          {org && <span>{org.name}</span>}
                          {proposer && <span>Proposed by {proposer.name}</span>}
                          <span>{format(new Date(cr.createdAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-md border border-border bg-secondary/30 p-3">
                      <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-1">
                        Reason
                      </p>
                      <p className="text-xs text-foreground leading-relaxed">
                        {cr.reason}
                      </p>
                    </div>

                    {/* Approval Status */}
                    <div className="flex items-center gap-6 mt-3">
                      <div className="flex items-center gap-2">
                        {approvalStatusIcon(cr.internalApproval)}
                        <span className="text-[10px] text-muted-foreground">
                          Internal:{" "}
                          <span className={approvalStatusColor(cr.internalApproval)}>
                            {cr.internalApproval.toUpperCase()}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {approvalStatusIcon(cr.clientApproval)}
                        <span className="text-[10px] text-muted-foreground">
                          Client:{" "}
                          <span className={approvalStatusColor(cr.clientApproval)}>
                            {cr.clientApproval.toUpperCase()}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 border-t border-border bg-secondary/20 px-4 py-3">
                    <button
                      onClick={() =>
                        updateConversionApproval(
                          ticket.id,
                          isInternal ? "internal" : "client",
                          "approved"
                        )
                      }
                      className="flex items-center gap-1.5 rounded-md bg-chart-2/15 border border-chart-2/30 px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-chart-2 transition-colors hover:bg-chart-2/25"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Approve
                    </button>
                    <button
                      onClick={() =>
                        updateConversionApproval(
                          ticket.id,
                          isInternal ? "internal" : "client",
                          "rejected"
                        )
                      }
                      className="flex items-center gap-1.5 rounded-md bg-destructive/15 border border-destructive/30 px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-destructive transition-colors hover:bg-destructive/25"
                    >
                      <XCircle className="h-3 w-3" />
                      Reject
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Completed Section */}
      <div>
        <h2 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Previously Reviewed ({completed.length})
        </h2>

        {completed.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center text-xs text-muted-foreground">
            No reviewed conversions
          </div>
        ) : (
          <div className="space-y-2">
            {completed.map((ticket) => {
              const cr = ticket.conversionRequest!
              const org = getOrgById(ticket.organizationId)
              const bothApproved =
                cr.internalApproval === "approved" && cr.clientApproval === "approved"

              return (
                <div
                  key={ticket.id}
                  className={`flex items-center justify-between rounded-lg border p-4 ${
                    bothApproved
                      ? "border-chart-2/20 bg-chart-2/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {ticket.id}
                      </span>
                      <span className="text-[9px] font-bold tracking-wider uppercase text-chart-4">
                        {cr.proposedType}
                      </span>
                      {bothApproved && (
                        <span className="text-[9px] font-bold tracking-wider uppercase text-chart-2">
                          CONVERTED
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground truncate">{ticket.title}</p>
                    {org && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {org.name}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-4 ml-4">
                    <div className="flex items-center gap-1.5">
                      {approvalStatusIcon(cr.internalApproval)}
                      <span className={`text-[10px] font-bold tracking-wider uppercase ${approvalStatusColor(cr.internalApproval)}`}>
                        INT
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {approvalStatusIcon(cr.clientApproval)}
                      <span className={`text-[10px] font-bold tracking-wider uppercase ${approvalStatusColor(cr.clientApproval)}`}>
                        CLI
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
