import { afterEach, describe, expect, it, vi } from 'vitest';
import { claveDeIntencion, generarUuidV4, liberarClave } from './claves';
import { etiquetaIntento, formatearFecha, formatearHora, intentoEnCurso } from './formato';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });

describe('claves de idempotencia', () => {
  it('genera UUID v4 también sin crypto.randomUUID (http en la red local)', () => {
    const original = Object.getOwnPropertyDescriptor(crypto, 'randomUUID');
    Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined });
    try {
      for (let vez = 0; vez < 20; vez++) expect(generarUuidV4()).toMatch(UUID_V4);
    } finally {
      if (original) Object.defineProperty(crypto, 'randomUUID', original);
      else delete (crypto as { randomUUID?: unknown }).randomUUID;
    }
  });

  it('conserva la clave de una intención hasta liberarla', () => {
    const primera = claveDeIntencion('entrega:1');
    expect(claveDeIntencion('entrega:1')).toBe(primera);
    expect(claveDeIntencion('entrega:2')).not.toBe(primera);
    liberarClave('entrega:1');
    expect(claveDeIntencion('entrega:1')).not.toBe(primera);
  });
});

describe('formato', () => {
  it('muestra las horas en la zona operativa de Lima', () => {
    expect(formatearHora('2026-10-17T13:12:00Z')).toBe('08:12');
    expect(formatearHora(null)).toBeNull();
    expect(formatearHora('no-es-fecha')).toBeNull();
  });

  it('la fecha programada es civil y no se desplaza por zona horaria', () => {
    expect(formatearFecha('2026-09-19')).toBe('19/09/2026');
  });

  it('un despacho pendiente se juega el siguiente intento; uno resuelto muestra los consumidos', () => {
    expect(intentoEnCurso(0, 'ASIGNADO')).toBe(1);
    expect(intentoEnCurso(1, 'EN_CAMINO')).toBe(2);
    expect(intentoEnCurso(1, 'FALLIDO')).toBe(1);
    expect(intentoEnCurso(0, 'ENTREGADO')).toBe(1);
    expect(etiquetaIntento(0, 2, 'ASIGNADO')).toBe('Intento 1 de 2');
    expect(etiquetaIntento(0, null, 'ASIGNADO')).toBe('Intento 1');
  });
});
