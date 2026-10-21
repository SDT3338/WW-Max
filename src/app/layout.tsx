import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ThemeSwitcher from '@/components/ThemeSwitcher'
import NotificationBell from '@/components/NotificationBell'

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "WW-Max",
  description: "Умная лента новостей студенческих мероприятий",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.className} antialiased`}>
        
        {/* Плавающая панель с уведомлениями и темами */}
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 md:top-6 md:right-8">
          <NotificationBell />
          <ThemeSwitcher />
        </div>

        <main className="pt-16 pb-8">
          {children}
        </main>
        
      </body>
    </html>
  );
}