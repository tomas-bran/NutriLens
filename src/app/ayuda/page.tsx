/**
 * `/ayuda` — la Ayuda/FAQ ahora vive embebida dentro de Mi cuenta (mismo
 * "SPA"): redirigimos al ancla #ayuda para no mantener dos renders y para que
 * cualquier link viejo siga funcionando.
 */
import { redirect } from 'next/navigation';

export default function AyudaPage() {
  redirect('/mi-cuenta#ayuda');
}
