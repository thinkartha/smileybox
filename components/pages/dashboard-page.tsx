"use client"

import { useStore } from "@/lib/store"
import { format } from "date-fns"
import {
  Ticket,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  GitPullRequestArrow,
  DollarSign,
  ArrowUpRight,
  CircleDot,
} from "lucide-react"

export function DashboardPage() {
  const {
    currentUser,
    tickets,
    organizations,
    invoices,
    activities,
    getUserById,
    getOrgById,
  } = useStore()

  if (!currentUser) return null

  const isInternal =
    currentUser.role === "admin" ||
    currentUser.role === "support-lead" ||
    currentUser.role === "support-staff"

  const visibleTickets = isInternal
    ? tickets
    : tickets.filter((t) => t.organizationId === currentUser.organizationId)

  const openTickets = visibleTickets.filter(
    (t) => t.status === "open" || t.status === "in-progress" || t.status === "awaiting-client"
  )
  const resolvedTickets = visibleTickets.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  )
  const criticalTickets = visibleTickets.filter(
    (t) => t.priority === "critical" && t.status !== "closed" && t.status !== "resolved"
  )
  const myTickets = visibleTickets.filter((t) => t.assignedTo === currentUser.id)
  const totalHoursThisMonth = visibleTickets.reduce((sum, t) => sum + t.hoursWorked, 0)

  const pendingConversions = visibleTickets.filter((t) => {
    if (!t.conversionRequest) return false
    if (isInternal) return t.conversionRequest.internalApproval === "pending"
    return t.conversionRequest.clientApproval === "pending"
  })

  const revenueThisMonth = invoices
    .filter((inv) => inv.month === 2 && inv.year === 2026)
    .reduce((sum, inv) => sum + inv.totalAmount, 0)

  const paidInvoices = invoices.filter((inv) => inv.status === "paid")
  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)

  // Build stats based on role
  const stats = []

  if (currentUser.role === "admin") {
    stats.push(
      { label: "ORGANIZATIONS", value: organizations.length, icon: Building2, color: "text-primary" },
      { label: "OPEN TICKETS", value: openTickets.length, icon: Ticket, color: "text-chart-3" },
      { label: "RESOLVED", value: resolvedTickets.length, icon: CheckCircle2, color: "text-chart-2" },
      { label: "TOTAL REVENUE", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-chart-4" },
      { label: "PENDING APPROVALS", value: pendingConversions.length, icon: GitPullRequestArrow, color: "text-primary" },
      { label: "CRITICAL", value: criticalTickets.length, icon: AlertTriangle, color: "text-destructive" }
    )
  } else if (currentUser.role === "support-lead") {
    stats.push(
      { label: "OPEN TICKETS", value: openTickets.length, icon: Ticket, color: "text-chart-3" },
      { label: "CRITICAL", value: criticalTickets.length, icon: AlertTriangle, color: "text-destructive" },
      { label: "RESOLVED", value: resolvedTickets.length, icon: CheckCircle2, color: "text-chart-2" },
      { label: "HOURS LOGGED", value: totalHoursThisMonth, icon: Clock, color: "text-chart-4" },
      { label: "PENDING APPROVALS", value: pendingConversions.length, icon: GitPullRequestArrow, color: "text-primary" },
      { label: "ORGANIZATIONS", value: organizations.length, icon: Building2, color: "text-chart-3" }
    )
  } else if (currentUser.role === "support-staff") {
    stats.push(
      { label: "MY TICKETS", value: myTickets.length, icon: Ticket, color: "text-primary" },
      { label: "OPEN TICKETS", value: openTickets.length, icon: Ticket, color: "text-chart-3" },
      { label: "CRITICAL", value: criticalTickets.length, icon: AlertTriangle, color: "text-destructive" },
      { label: "HOURS LOGGED", value: totalHoursThisMonth, icon: Clock, color: "text-chart-4" }
    )
  } else {
    // Client
    stats.push(
      { label: "OPEN TICKETS", value: openTickets.length, icon: Ticket, color: "text-chart-3" },
      { label: "RESOLVED", value: resolvedTickets.length, icon: CheckCircle2, color: "text-chart-2" },
      { label: "PENDING RESPONSE", value: visibleTickets.filter((t) => t.status === "awaiting-client").length, icon: MessageSquare, color: "text-chart-4" },
      { label: "PENDING APPROVALS", value: pendingConversions.length, icon: GitPullRequestArrow, color: "text-primary" }
    )
  }

  const visibleActivities = isInternal
    ? activities
    : activities.filter((a) => {
        if (!a.ticketId) return false
        const ticket = tickets.find((t) => t.id === a.ticketId)
        return ticket?.organizationId === currentUser.organizationId
      })

  const recentActivities = visibleActivities.slice(0, 8)

  const recentTickets = [...visibleTickets]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const activityTypeIcon: Record<string, React.ReactNode> = {
    "ticket-created": <Ticket className="h-3.5 w-3.5 text-chart-3" />,
    "ticket-updated": <ArrowUpRight className="h-3.5 w-3.5 text-chart-4" />,
    "message-added": <MessageSquare className="h-3.5 w-3.5 text-primary" />,
    "ticket-resolved": <CheckCircle2 className="h-3.5 w-3.5 text-chart-2" />,
    "conversion-requested": <GitPullRequestArrow className="h-3.5 w-3.5 text-chart-4" />,
    "conversion-approved": <CheckCircle2 className="h-3.5 w-3.5 text-chart-2" />,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold tracking-wider text-foreground uppercase">
          Dashboard Overview
        </h1>
        <p className="text-xs text-muted-foreground tracking-wide mt-1">
          Welcome back, {currentUser.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                {stat.label}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Tickets */}
        <div className="lg:col-span-3 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-xs font-bold tracking-wider text-foreground uppercase">
              Recent Tickets
            </h2>
            <span className="text-[10px] text-muted-foreground tracking-wider">
              LAST UPDATED
            </span>
          </div>
          <div className="divide-y divide-border">
            {recentTickets.map((ticket) => {
              const org = getOrgById(ticket.organizationId)
              const assignee = ticket.assignedTo
                ? getUserById(ticket.assignedTo)
                : null
              return (
                <div
                  key={ticket.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {ticket.id}
                      </span>
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                    </div>
                    <p className="text-sm text-foreground mt-0.5 truncate">
                      {ticket.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {isInternal && org && (
                        <span className="text-[10px] text-muted-foreground">
                          {org.name}
                        </span>
                      )}
                      {assignee && (
                        <span className="text-[10px] text-muted-foreground">
                          {assignee.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(ticket.updatedAt), "MMM d")}
                    </p>
                    {ticket.hoursWorked > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {ticket.hoursWorked}h
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
            {recentTickets.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                No tickets found
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-xs font-bold tracking-wider text-foreground uppercase">
              Recent Activity
            </h2>
          </div>
          <div className="divide-y divide-border">
            {recentActivities.map((activity) => {
              const user = getUserById(activity.userId)
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  <div className="mt-0.5 shrink-0">
                    {activityTypeIcon[activity.type] || (
                      <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground leading-relaxed">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {user?.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(activity.createdAt), "MMM d, HH:mm")}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
            {recentActivities.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-chart-3/15 text-chart-3 border-chart-3/30",
    "in-progress": "bg-primary/15 text-primary border-primary/30",
    "awaiting-client": "bg-chart-4/15 text-chart-4 border-chart-4/30",
    resolved: "bg-chart-2/15 text-chart-2 border-chart-2/30",
    closed: "bg-muted text-muted-foreground border-border",
  }

  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${styles[status] || styles.open}`}
    >
      {status.replace("-", " ")}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    low: "text-muted-foreground",
    medium: "text-chart-4",
    high: "text-primary",
    critical: "text-destructive",
  }

  return (
    <span
      className={`text-[9px] font-bold tracking-wider uppercase ${styles[priority] || ""}`}
    >
      {priority}
    </span>
  )
}
