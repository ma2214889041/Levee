import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Levee — autonomous landslide relief",
  description:
    "Live landslide risk, on-chain thresholds, and auditable USDC relief payouts on Solana.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
