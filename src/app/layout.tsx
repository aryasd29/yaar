import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Isle · Dating that actually gets you to the date",
  description: "Scrapbook profiles, a daily drop instead of swiping, and gentle help to get from chat to a real, safe first date.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Isle", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#F4E7D3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
