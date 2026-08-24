import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
const sans = Manrope({ variable: "--font-sans", subsets: ["latin"] });
export const metadata: Metadata = {
  title: "Narciso Geronimo Jewelry Inventory",
  description: "Secure gold jewelry inventory and barcode management",
};
export const viewport: Viewport = {
  themeColor: "#f8f5ed",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}
