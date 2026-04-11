import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "C8Club — Editor de Vídeo",
  description: "Painel de configuração do Vídeo Diagnóstico Raio-X Cultural",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>
          <Sidebar />
          <main style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "32px", background: "#F8FAFC" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
