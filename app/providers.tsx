"use client";

import { SessionProvider } from "next-auth/react";
import React, { Suspense } from "react";
import NavigationProgress from "./NavigationProgress";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* شريط التحميل عند التنقل بين الصفحات */}
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      {children}
    </SessionProvider>
  );
}