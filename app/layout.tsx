import type { Metadata } from "next";
import { EnsureSession } from "@/components/EnsureSession";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-brutalist",
});

export const metadata: Metadata = {
  title: "VibeTime",
  description: "Feel-good productivity calendar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} h-full bg-bg`}>
      <body className="min-h-dvh bg-bg text-text flex flex-col font-mono tracking-tight antialiased">
        <EnsureSession>{children}</EnsureSession>
      </body>
    </html>
  );
}
