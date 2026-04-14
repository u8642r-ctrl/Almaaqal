"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * شريط تحميل سلس يظهر عند الانتقال بين الصفحات
 * يعطي المستخدم إحساساً بأن الشيء يحصل بدل الانتظار في الفراغ
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevPath = useRef(pathname + searchParams.toString());

  useEffect(() => {
    const currentPath = pathname + searchParams.toString();
    if (currentPath !== prevPath.current) {
      // بدء التحميل
      setLoading(true);
      setProgress(10);
      prevPath.current = currentPath;

      // محاكاة تقدم سريع
      timerRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 85) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 85;
          }
          return p + Math.random() * 15;
        });
      }, 120);

      // إنهاء الشريط بعد تحميل
      const finish = setTimeout(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(100);
        setTimeout(() => {
          setLoading(false);
          setProgress(0);
        }, 300);
      }, 500);

      return () => {
        clearTimeout(finish);
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [pathname, searchParams]);

  if (!loading && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      style={{ transition: "opacity 0.3s", opacity: loading || progress > 0 ? 1 : 0 }}
    >
      <div
        className="h-full bg-gradient-to-r from-[#c8a44e] via-[#e2c574] to-[#c8a44e] shadow-[0_0_8px_rgba(200,164,78,0.6)]"
        style={{
          width: `${progress}%`,
          transition: "width 0.2s ease, opacity 0.3s ease",
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
