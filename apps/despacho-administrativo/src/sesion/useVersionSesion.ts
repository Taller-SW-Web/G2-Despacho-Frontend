import { useEffect, useState } from 'react';

/** Invalida consultas y formularios cuando cambia la identidad, también entre pestañas. */
export function useVersionSesion() {
  const [version, establecerVersion] = useState(0);
  useEffect(() => {
    const cambiar = () => establecerVersion((anterior) => anterior + 1);
    const almacen = (evento: StorageEvent) => {
      if (!evento.key || evento.key.startsWith('despacho.')) cambiar();
    };
    window.addEventListener('despacho:sesion', cambiar);
    window.addEventListener('storage', almacen);
    return () => {
      window.removeEventListener('despacho:sesion', cambiar);
      window.removeEventListener('storage', almacen);
    };
  }, []);
  return version;
}
