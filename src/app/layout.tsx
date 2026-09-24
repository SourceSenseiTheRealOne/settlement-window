import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Settlement Window | Bounded settlement protection",
  description:
    "Protect pending crypto settlements with bounded DreamDEX Event Contracts on Somnia Shannon testnet.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
