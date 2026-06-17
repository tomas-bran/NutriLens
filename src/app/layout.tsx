import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'NutriLens',
  description:
    'Asistente informativo que analiza etiquetas alimentarias con IA. NutriLens no reemplaza el consejo de un profesional de nutrición.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // El script inline setea data-sidebar antes de hidratar (sin FOUC); React
    // ignora el desajuste de ese atributo en <html>.
    <html lang="es" suppressHydrationWarning>
      <body>
        {/* Aplica el estado colapsado del sidebar antes del primer paint (sin FOUC). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('nl-sidebar')==='collapsed')document.documentElement.dataset.sidebar='collapsed';}catch(e){}",
          }}
        />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
