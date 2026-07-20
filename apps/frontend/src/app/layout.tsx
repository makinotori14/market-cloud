import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: "CDM | Маркетплейс облачных находок",
  description: "Prompt-based cloud solution recommendations with score ranking.",
  icons: {
    icon: "/cdm_logo.png",
    apple: "/cdm_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
