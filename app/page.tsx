"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { LoginScreen } from "@/components/login-screen"
import { AppSidebar, type Section } from "@/components/app-sidebar"
import { DashboardPage } from "@/components/pages/dashboard-page"
import { TicketsPage } from "@/components/pages/tickets-page"
import { OrganizationsPage } from "@/components/pages/organizations-page"
import { ApprovalsPage } from "@/components/pages/approvals-page"
import { BillingPage } from "@/components/pages/billing-page"
import { UsersPage } from "@/components/pages/users-page"
import { SettingsPage } from "@/components/pages/settings-page"

export default function Home() {
  const { currentUser } = useStore()
  const [activeSection, setActiveSection] = useState<Section>("dashboard")

  if (!currentUser) {
    return <LoginScreen />
  }

  const renderPage = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardPage />
      case "tickets":
        return <TicketsPage />
      case "organizations":
        return <OrganizationsPage />
      case "users":
        return <UsersPage />
      case "approvals":
        return <ApprovalsPage />
      case "billing":
        return <BillingPage />
      case "settings":
        return <SettingsPage />
      default:
        return <DashboardPage />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <main className="flex-1 overflow-auto">{renderPage()}</main>
    </div>
  )
}
