import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'NutriLens',
  description:
    'Asistente informativo que analiza etiquetas alimentarias con IA multimodal. NutriLens no reemplaza el consejo de un profesional de nutrición.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
