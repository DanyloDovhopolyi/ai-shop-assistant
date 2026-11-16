import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

import { Providers } from "./_components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Shop Assistant",
  description:
    "A product catalog with an AI assistant that filters and sorts it from plain-language requests.",
};

// Lets the browser paint its own UI (canvas, scrollbars, form controls) in the
// user's theme from the first frame, before the stylesheet loads.
export const viewport: Viewport = {
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
