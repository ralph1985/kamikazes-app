import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/navigation/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kamikazes",
  description: "Gestión de las ediciones anuales de Kamikazes.",
  icons: {
    icon: "/brand/kamikazes-logo.png",
    shortcut: "/brand/kamikazes-logo.png",
    apple: "/brand/kamikazes-logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
