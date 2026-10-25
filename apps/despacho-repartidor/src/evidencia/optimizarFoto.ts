import { POLITICA_EVIDENCIA } from '../config';

const LADO_MAXIMO = 1600;
const CALIDADES = [0.8, 0.7, 0.6, 0.5];

/**
 * Decisión registrada en pendiente.md: la app reduce la foto antes de subirla (lado mayor 1600 px, JPEG) para
 * cumplir el límite de 2 MiB. Re-codificar en un canvas descarta los metadatos EXIF, incluida la ubicación.
 * El backend no comprime; solo valida tipo y tamaño.
 */
export async function optimizarFoto(archivo: File): Promise<File> {
  if (!archivo.type.startsWith('image/')) throw new Error('El archivo seleccionado no es una imagen.');
  const imagen = await decodificar(archivo);
  try {
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.max(1, Math.round(imagen.width * escala));
    lienzo.height = Math.max(1, Math.round(imagen.height * escala));
    const contexto = lienzo.getContext('2d');
    if (!contexto) throw new Error('El navegador no permite procesar la imagen.');
    contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    for (const calidad of CALIDADES) {
      const resultado = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, 'image/jpeg', calidad));
      if (resultado && resultado.size <= POLITICA_EVIDENCIA.maximoBytes) {
        return new File([resultado], 'evidencia.jpg', { type: 'image/jpeg', lastModified: Date.now() });
      }
    }
    throw new Error('No se pudo reducir la foto por debajo de 2 MB. Toma otra foto.');
  } finally {
    if ('close' in imagen) imagen.close();
  }
}

/** createImageBitmap respeta la orientación EXIF; si no está disponible se usa un elemento img. */
async function decodificar(archivo: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(archivo, { imageOrientation: 'from-image' }); } catch { /* Se intenta con img. */ }
  }
  const url = URL.createObjectURL(archivo);
  try {
    const imagen = new Image();
    imagen.decoding = 'async';
    imagen.src = url;
    await imagen.decode();
    return imagen;
  } finally {
    URL.revokeObjectURL(url);
  }
}
