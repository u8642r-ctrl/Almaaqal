import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppLayout from "./AppLayout";
import { Providers } from "./providers";

// إضافة display: swap لتحسين أداء تحميل الخطوط (لا تترك المستخدم يحدق في فراغ)
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// فصل الـ Viewport عن الـ Metadata (أفضل الممارسات في الإصدارات الحديثة من Next.js)
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // يمنع الزوم العشوائي في الموبايل
};

// Metadata احترافية تدعم محركات البحث (SEO)
export const metadata: Metadata = {
  title: {
    template: "%s | جامعة المعقل",
    default: "جامعة المعقل", // يظهر إذا لم تحدد عنواناً للصفحات الفرعية
  },
  description: "النظام الإلكتروني الرسمي لجامعة المعقل",
  keywords: ["جامعة المعقل", "نظام جامعي", "Al-Maaqal University"],
  openGraph: {
    title: "جامعة المعقل",
    description: "النظام الإلكتروني الرسمي لجامعة المعقل",
    type: "website",
    locale: "ar_IQ", // بما أننا في البصرة العظيمة 😉
  },
  icons: {
    icon: "/logo.webp",
    apple: "/logo.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning ضروري جداً لو قررت تستخدم Dark/Light mode لاحقاً
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300`}
      >
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}