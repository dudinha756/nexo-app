import type { Metadata } from "next";
import "./globals.css";
import DailyBriefingPrompt from "@/components/DailyBriefingPrompt";

export const metadata: Metadata = {
  title: "NEXO | Seu tempo faz sentido",
  description: "Um lugar para organizar trabalho, estudos, treinos, saúde, família, aniversários, amigos e lazer.",
  applicationName: "NEXO",
  icons: {icon: [{url: "/icon.svg", type: "image/svg+xml"}], shortcut: "/icon.svg", apple: [{url: "/apple-icon", sizes:"180x180", type:"image/png"}]}
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}
      <div className="nexo-quick-links"><a href="/vida">✳ Minha vida</a><a href="/resumo">☀ Meu resumo diário</a><a href="/assistente">✳ Assistente NEXO</a></div>
      <DailyBriefingPrompt />
    </body></html>;
}
