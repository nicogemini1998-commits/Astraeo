import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AETHER | Mission Control",
  description: "Centro de mando para gestión de agentes IA y clientes — AETHER",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
