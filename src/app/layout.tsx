import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "ReconShield", template: "%s · ReconShield" },
  description: "Administration dashboard for reconnaissance attack monitoring and mitigation research.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={dmSans.className}>{children}</body></html>;
}
