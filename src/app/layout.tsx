import type { Metadata } from "next";
import "./globals.css";
import TelegramWebApp from "@/components/TelegramWebApp";

export const metadata: Metadata = {
  title: "Путёвой учёт",
  description: "Система учета рабочих смен",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
      </head>
      <body>
        <TelegramWebApp />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
