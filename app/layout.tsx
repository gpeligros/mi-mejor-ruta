import type { Metadata } from 'next'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import Navbar from '@/components/ui/Navbar'
import Footer from '@/components/ui/Footer'

export const metadata: Metadata = {
  title: {
    default: 'Rutas de España',
    template: '%s | Rutas de España',
  },
  description: 'Descubre rutas de senderismo, bici, moto y 4x4 por toda España',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="flex flex-col min-h-screen bg-white">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  )
}
