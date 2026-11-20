import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '../components/sidebar';

export const metadata: Metadata = {
  title: 'OshxonaPOS — Restoran & Oshxona Boshqaruv Tizimi',
  description: 'Online & Offline restoran va kassa tizimi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <body className="flex min-h-screen bg-slate-100 text-slate-900 antialiased">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
