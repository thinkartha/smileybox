"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import {
  Settings,
  DollarSign,
  Shield,
  Server,
  CheckCircle2,
} from "lucide-react"

export function SettingsPage() {
  const { currentUser, ratePerHour, setRatePerHour } = useStore()
  const [rateInput, setRateInput] = useState(String(ratePerHour))
  const [saved, setSaved] = useState(false)

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        You do not have access to this section.
      </div>
    )
  }

  const handleSaveRate = () => {
    const val = parseFloat(rateInput)
    if (!isNaN(val) && val > 0) {
      setRatePerHour(val)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-sm font-bold tracking-wider text-foreground uppercase">
          Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          System configuration and preferences
        </p>
      </div>

      {/* Billing Rate */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <DollarSign className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-bold tracking-wider text-foreground uppercase">
            Billing Configuration
          </h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Hourly Rate (USD)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  $
                </span>
                <input
                  type="number"
                  min="1"
                  step="5"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="w-full rounded-md border border-border bg-secondary/50 py-2 pl-7 pr-3 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                />
              </div>
              <button
                onClick={handleSaveRate}
                className="rounded-md bg-primary px-4 py-2 text-[10px] font-bold tracking-wider uppercase text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Save
              </button>
              {saved && (
                <span className="flex items-center gap-1 text-[10px] text-chart-2">
                  <CheckCircle2 className="h-3 w-3" />
                  Saved
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
              This rate is used when generating invoices. Changing it does not affect previously generated invoices.
            </p>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Server className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-bold tracking-wider text-foreground uppercase">
            System Information
          </h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-4 py-3">
            <div>
              <p className="text-xs font-medium text-foreground">Backend Mode</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Connected to Go API backend
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded border border-chart-2/30 bg-chart-2/10 px-2 py-1 text-[9px] font-bold tracking-wider uppercase text-chart-2">
              <CheckCircle2 className="h-2.5 w-2.5" />
              API Connected
            </span>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-4 py-3">
            <div>
              <p className="text-xs font-medium text-foreground">Application Version</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                SupportDesk v1.0.0
              </p>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              v1.0.0
            </span>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-4 py-3">
            <div>
              <p className="text-xs font-medium text-foreground">Database Schema</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                mysupporttickr
              </p>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              PostgreSQL
            </span>
          </div>
        </div>
      </div>

      {/* Roles & Permissions Overview */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-bold tracking-wider text-foreground uppercase">
            Roles & Permissions
          </h2>
        </div>
        <div className="divide-y divide-border">
          {[
            {
              role: "ADMIN",
              desc: "Full access to all features including organizations, billing, settings, and all tickets.",
            },
            {
              role: "SUPPORT LEAD",
              desc: "Manage all tickets, approve internal conversions, view organizations and team performance.",
            },
            {
              role: "SUPPORT STAFF",
              desc: "Handle assigned tickets, log time, respond to clients, request ticket conversions.",
            },
            {
              role: "CLIENT",
              desc: "Create support tickets, view organization tickets, approve or reject conversion requests, view invoices.",
            },
          ].map((item) => (
            <div key={item.role} className="flex items-start gap-3 px-5 py-3">
              <span className="shrink-0 mt-0.5 flex h-6 min-w-16 items-center justify-center rounded border border-primary/30 bg-primary/10 px-2 text-[9px] font-bold tracking-wider text-primary">
                {item.role}
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Docker Setup Info */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Settings className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-bold tracking-wider text-foreground uppercase">
            Deployment
          </h2>
        </div>
        <div className="px-5 py-4">
          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-2">
              Docker Compose Quick Start
            </p>
            <pre className="text-xs text-foreground font-mono leading-relaxed overflow-x-auto">
{`# With bundled PostgreSQL
docker compose --profile db up -d

# With external PostgreSQL
export DB_HOST=your-host
export DB_PORT=5432
docker compose up -d`}
            </pre>
            <p className="mt-3 text-[10px] text-muted-foreground leading-relaxed">
              Copy <span className="font-mono text-foreground">.env.example</span> to{" "}
              <span className="font-mono text-foreground">.env</span> and configure database
              credentials before starting.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
