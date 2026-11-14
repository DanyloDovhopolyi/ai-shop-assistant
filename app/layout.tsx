import type { Metadata } from "next";
import { Bricolage_Grotesque, Public_Sans } from "next/font/google";

import { Providers } from "./_components/providers";
import "./globals.css";

// Headings: a grotesque with character. Body and prices: a plain, legible sans
// with tabular figures, so price columns line up.
const display = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

const body = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Shop Assistant",
  description:
    "A product catalog with an AI assistant that filters and sorts it from plain-language requests.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
