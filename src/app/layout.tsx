import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "ReconShield", template: "%s · ReconShield" },
  description: "Dasbor administrasi untuk pemantauan serangan reconnaissance dan penelitian mitigasi.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body className={dmSans.className}>{children}</body></html>;
}
