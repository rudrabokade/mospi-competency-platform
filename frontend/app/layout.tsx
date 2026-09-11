import type { Metadata } from "next";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans-doc",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif-doc",
});

export const metadata: Metadata = {
  title: "MoSPI AI Competency Platform",
  description:
    "AI-Enabled Adaptive Learning & Competency Gap Platform for Ministry of Statistics & Programme Implementation — SIH 2024",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${ibmPlexSans.variable} ${sourceSerif.variable}`} suppressHydrationWarning>
      <body className={ibmPlexSans.className} suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}