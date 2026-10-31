/** Ilustración de la pantalla de acceso (Figma 01): caja con líneas de movimiento y punto de acento. */
export function MarcaDespacho({ tamano = 140 }: { tamano?: number }) {
  return (
    <svg width={tamano} height={tamano * 0.6} viewBox="0 0 140 84" fill="none" aria-hidden="true">
      <g stroke="var(--ia-color-text-disabled)" strokeWidth="4" strokeLinecap="round" opacity="0.6">
        <path d="M8 12h40" /><path d="M2 24h52" /><path d="M18 36h36" />
      </g>
      <g stroke="var(--ia-color-text-inverse)" strokeWidth="4" strokeLinejoin="round">
        <path d="M94 6 126 22v38L94 76 62 60V22z" />
        <path d="M62 22l32 16 32-16" /><path d="M94 38v38" />
      </g>
      <circle cx="129" cy="12" r="10" fill="var(--ia-color-action-primary)" />
    </svg>
  );
}
