import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Путёвой учёт",
  description: "Система учета рабочих смен",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
      </head>
      <body>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
