import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "جامعة المعقل",
    short_name: "المعقل",
    description: "النظام الإلكتروني الرسمي لجامعة المعقل",
    start_url: "/",
    display: "standalone",
    background_color: "#f0f4f8",
    theme_color: "#0f2744",
    lang: "ar",
    dir: "rtl",
    icons: [
      {
        src: "/logo.webp",
        sizes: "any",
        type: "image/webp",
        purpose: "maskable",
      },
      {
        src: "/logo.webp",
        sizes: "any",
        type: "image/webp",
        purpose: "any",
      },
    ],
  };
}
