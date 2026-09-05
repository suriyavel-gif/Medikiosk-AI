import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "MediKiosk AI™ — Autonomous Triage, IoT Diagnostics & Clinical EHR",
  description: "Next-generation healthcare ecosystem with physical AI triage kiosks, doctor workspace, electronic prescribing, sovereign consent, and public health surveillance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased font-sans flex flex-col selection:bg-blue-500 selection:text-white">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
