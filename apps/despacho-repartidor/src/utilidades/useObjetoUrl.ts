import { useEffect, useState } from 'react';

/** URL local de una foto para previsualizarla; se revoca al cambiar o desmontar. */
export function useObjetoUrl(archivo: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!archivo) { setUrl(null); return; }
    const creada = URL.createObjectURL(archivo);
    setUrl(creada);
    return () => URL.revokeObjectURL(creada);
  }, [archivo]);
  return url;
}
