"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { HospitalProvider } from "@/lib/hospital-context";
import { LanguageProvider } from "@/lib/language-context";
import { HospitalSelectorModal } from "@/components/HospitalSelectorModal";
import { SplashScreen } from "@/components/SplashScreen";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 10, // 10s
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HospitalProvider>
          <LanguageProvider>
            <SplashScreen />
            <HospitalSelectorModal />
            {children}
            <Toaster richColors position="top-right" />
          </LanguageProvider>
        </HospitalProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
