import type { Metadata, Viewport } from "next";
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
              <a href="/" className="hover:text-amber-300 transition-colors">Home</a>
              <a href="/gear" className="hover:text-amber-300 transition-colors">Gear</a>
              <a href="/vehicle" className="hover:text-amber-300 transition-colors">Vehicle</a>
              <a href="/locations" className="hover:text-amber-300 transition-colors">Spots</a>
              <a href="/trips" className="hover:text-amber-300 transition-colors">Trips</a>
            </div>
          </nav>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
