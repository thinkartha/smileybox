import type React from "react"
import type { Metadata } from "next"
import { JetBrains_Mono } from "next/font/google"
import { StoreProvider } from "@/lib/store"
import "./globals.css"

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "SupportDesk Pro",
  description: "Enterprise support ticket management portal",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${mono.variable} font-mono antialiased bg-background text-foreground`}>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  )
}
