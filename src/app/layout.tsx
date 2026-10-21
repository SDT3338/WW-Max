import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ThemeSwitcher from '@/components/ThemeSwitcher'

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Студенческая лента",
  description: "Лента новостей студенческих мероприятий",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.className} antialiased`}>
        
        <div className="fixed top-4 right-4 z-50 md:top-6 md:right-8">
          <ThemeSwitcher />
        </div>

        <main className="pt-16 pb-8">
          {children}
        </main>
        
      </body>
    </html>
  );
}