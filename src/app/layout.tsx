import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

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
      <body>
        <Navigation />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
