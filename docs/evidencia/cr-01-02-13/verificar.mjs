import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Herramienta opcional de revisión; Playwright puede instalarse fuera del proyecto.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const navegador = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox'],
});
const origen = process.env.EJEMPLO_URL ?? 'http://localhost:5173/ejemplos/controles-valqui.html';
const carpeta = new URL('./', import.meta.url);
const errores = [];

try {
  for (const [nombre, width, height] of [['escritorio', 1440, 1024], ['tableta', 1024, 768], ['movil', 390, 844], ['estrecho', 320, 844]]) {
    const contexto = await navegador.newContext({ viewport: { width, height }, timezoneId: 'Asia/Tokyo', reducedMotion: 'reduce' });
    const pagina = await contexto.newPage();
    pagina.on('pageerror', (error) => errores.push(error.message));
    await pagina.goto(origen);
    await pagina.getByRole('heading', { name: 'Controles compartidos · Valqui' }).waitFor();
    await pagina.evaluate(() => document.fonts.ready);
    const barra = pagina.getByRole('region', { name: 'Acciones de la página' });
    const guardar = pagina.getByRole('button', { name: 'Guardar prueba', exact: true });
    const cancelar = pagina.getByRole('button', { name: 'Cancelar', exact: true });
    assert(await guardar.isDisabled());
    assert(await guardar.getAttribute('aria-describedby'));
    const ultimo = pagina.getByRole('textbox', { name: 'Último campo: observaciones' });
    await ultimo.fill('error');
    await pagina.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await pagina.waitForFunction(() => {
      const barra = document.querySelector('[aria-label="Acciones de la página"]');
      return Math.abs(barra.parentElement.getBoundingClientRect().height - barra.getBoundingClientRect().height) < 1;
    });
    const limites = await barra.boundingBox();
    const finError = await pagina.getByText('Mensaje de error de prueba del último campo.').boundingBox();
    assert(finError.y + finError.height <= limites.y, `${nombre}: último error tapado`);
    assert.equal(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${nombre}: scroll horizontal`);
    const principalRect = await guardar.boundingBox();
    const secundariaRect = await cancelar.boundingBox();
    if (width < 768) {
      assert(principalRect.y > secundariaRect.y, `${nombre}: orden móvil`);
      assert(principalRect.height >= 50, `${nombre}: altura táctil`);
      assert(Math.abs(principalRect.width - (limites.width - 32)) < 1, `${nombre}: principal sin ancho completo`);
    } else assert(principalRect.x > secundariaRect.x, `${nombre}: orden de escritorio`);
    const alturaBloqueada = limites.height;
    await pagina.screenshot({ path: fileURLToPath(new URL(`${nombre}-bloqueo.png`, carpeta)) });
    await cancelar.focus();
    await pagina.keyboard.press('Enter');
    assert.match(await pagina.getByRole('status').textContent(), /Envíos simulados: 0.*cancelar/);

    await pagina.getByRole('switch', { name: 'Bloquear acción principal con motivo largo' }).uncheck();
    await pagina.waitForFunction((altura) => document.querySelector('[aria-label="Acciones de la página"]').getBoundingClientRect().height < altura, alturaBloqueada);
    await guardar.click();
    await pagina.getByText('Ingresa el nombre de la zona.', { exact: true }).waitFor();
    assert.match(await pagina.getByRole('status').textContent(), /Envíos simulados: 0/);
    await pagina.getByRole('textbox', { name: 'Nombre de zona', exact: true }).fill('Zona de prueba');
    const importe = pagina.getByRole('textbox', { name: 'Tarifa base de prueba', exact: true });
    await importe.fill('0');
    await importe.press('Tab');
    assert.equal(await importe.inputValue(), '0.00');
    await pagina.getByRole('button', { name: 'Fecha programada de prueba', exact: true }).click();
    const dia = pagina.locator('.mantine-DatePickerInput-day:not([data-outside]):not([data-hidden])').first();
    await dia.click();
    assert.match(await pagina.getByRole('button', { name: 'Fecha programada de prueba', exact: true }).textContent(), /\d{2}\/\d{2}\/\d{4}/);
    await pagina.getByRole('radio', { name: 'No', exact: true }).focus();
    await pagina.keyboard.press('Space');
    assert(await pagina.getByRole('radio', { name: 'No', exact: true }).isChecked());
    const seleccion = pagina.getByRole('combobox', { name: 'Zona de prueba', exact: true });
    await seleccion.fill('Inexistente');
    await pagina.getByText('Sin resultados', { exact: true }).waitFor();
    await seleccion.fill('Comas');
    await seleccion.press('ArrowDown');
    await seleccion.press('Enter');
    assert.equal(await seleccion.inputValue(), 'Comas');
    await guardar.dblclick();
    assert(await guardar.isDisabled());
    assert.match(await pagina.getByRole('status').textContent(), /Envíos simulados: 1/);
    const cargaVisible = await guardar.evaluate((boton) => {
      const interior = boton.querySelector('.mantine-Button-inner');
      const etiqueta = boton.querySelector('.mantine-Button-label');
      const area = boton.getBoundingClientRect();
      const texto = etiqueta.getBoundingClientRect();
      return getComputedStyle(interior).opacity === '1' && getComputedStyle(etiqueta).opacity === '1'
        && texto.top >= area.top && texto.bottom <= area.bottom;
    });
    assert(cargaVisible, `${nombre}: etiqueta oculta en carga`);
    await pagina.screenshot({ path: fileURLToPath(new URL(`${nombre}-carga.png`, carpeta)) });
    await pagina.getByText('No pudimos guardar los datos de prueba. Se conservaron los valores; puedes reintentar.').waitFor();
    assert.equal(await pagina.getByRole('textbox', { name: 'Nombre de zona', exact: true }).inputValue(), 'Zona de prueba');
    await pagina.getByRole('switch', { name: 'Simular error al guardar' }).uncheck();
    await guardar.click();
    await pagina.waitForFunction(() => document.querySelector('[role="status"]').textContent.includes('Operación simulada completada'));
    assert.match(await pagina.getByRole('status').textContent(), /Envíos simulados: 2.*PEN 0\.00.*fecha civil \d{4}-\d{2}-\d{2}.*sello no intacto/);
    console.log(`${nombre} ${width}×${height}: reserva, último error, teclado, cero/No/fecha, doble envío, carga visible y recuperación correctos.`);
    await contexto.close();
  }
  assert.deepEqual(errores, [], 'Errores de ejecución en navegador');
} finally {
  await navegador.close();
}
