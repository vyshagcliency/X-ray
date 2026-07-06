import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// OG/share framing is payout-integrity — "Settlement Truth Audit," never "FBA
// reimbursement" (the old, dying wedge). See report-killer-plan P4.3 / feex-rework R3.3.
const OG_TITLE = "Settlement Truth Audit — your Amazon payouts, verified line by line";
const OG_DESCRIPTION =
  "A free forensic audit that proves, row by row, where Amazon's settlement doesn't reconcile. Upload your own Seller Central reports; get a dispute-ready report in minutes.";

export const metadata: Metadata = {
  title: {
    default: "Baslix Leakage X-Ray — Settlement Truth Audit",
    template: "%s · Baslix Leakage X-Ray",
  },
  description: OG_DESCRIPTION,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Baslix Leakage X-Ray",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
