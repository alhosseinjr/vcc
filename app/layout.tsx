import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/common/ThemeProvider";
import { ToastProvider } from "@/components/common/ToastProvider";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { PWAUpdater } from "@/components/common/PWAUpdater";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Onboarding } from "@/components/common/Onboarding";

export const metadata: Metadata = {
  metadataBase: new URL("https://vibe-coded-cleanup.vercel.app"),
  title: "Vibe-Coded Cleanup",
  description: "AI-assisted code review and security analysis for projects and repositories.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Vibe-Coded Cleanup" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Vibe-Coded Cleanup",
  description: "AI-assisted code review and security analysis for projects and repositories.",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <ThemeProvider>
          <ToastProvider>
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 ...">
              Skip to content
            </a>
            <Header />
            <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
            <Footer />
            <Onboarding />
            <PWAUpdater />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
