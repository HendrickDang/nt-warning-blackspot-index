import type { Metadata } from "next";
import "./globals.css";
import "./overrides.css";

export const metadata: Metadata = {
  title: "Warning Blackspot",
  description: "Offline bushfire reporting for remote Northern Territory communities.",
  openGraph: {
    title: "Warning Blackspot",
    description: "Offline bushfire reporting for remote communities",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "Warning Blackspot" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Warning Blackspot",
    description: "Offline bushfire reporting for remote communities",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU">
      <body className="antialiased">{children}</body>
    </html>
  );
}
