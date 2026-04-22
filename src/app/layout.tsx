import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baslix Leakage X-Ray",
  description: "Free forensic audit for Amazon FBA sellers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
