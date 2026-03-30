import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Camp Commander",
  description: "Personal car camping assistant and travel guide",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 min-h-screen">
        <header className="sticky top-0 z-50 bg-stone-800 text-stone-50 px-4 py-3 shadow-md">
          <nav className="max-w-4xl mx-auto flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-tight">Camp Commander</h1>
            <div className="flex gap-4 text-sm">
              <Link href="/" className="hover:text-amber-300 transition-colors">Home</Link>
              <Link href="/gear" className="hover:text-amber-300 transition-colors">Gear</Link>
              <Link href="/vehicle" className="hover:text-amber-300 transition-colors">Vehicle</Link>
              <Link href="/spots" className="hover:text-amber-300 transition-colors">Spots</Link>
              <Link href="/trips" className="hover:text-amber-300 transition-colors">Trips</Link>
            </div>
          </nav>
        </header>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
