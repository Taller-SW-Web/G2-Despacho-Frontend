import { expect, type Page } from '@playwright/test';

/** Doble HTTP del contrato G7. No acredita firmas JWT ni integración con Seguridad real. */
export async function iniciarSesionGestor(page: Page, destino: string) {
  const correo = 'gestor@example.test',
    contrasena = 'ClaveSoloParaPruebas!';
  const challengeToken = 'desafio-e2e',
    codigo = '123456';
  let desafioEmitido = false,
    codigoSolicitado = false;
  // Registrar después de las APIs de negocio: esta ruta específica tiene prioridad.
  await page.route('**/api/v1/auth/**', async (ruta) => {
    const peticion = ruta.request(),
      recurso = new URL(peticion.url()).pathname;
    const cuerpo = peticion.postDataJSON() ?? {};
    if (
      peticion.method() === 'POST' &&
      recurso.endsWith('/login') &&
      cuerpo.correo === correo &&
      cuerpo.contrasena === contrasena
    ) {
      desafioEmitido = true;
      return ruta.fulfill({
        json: { mfaRequerido: true, challengeToken, canal: 'EMAIL', expiraEn: 300 },
      });
    }
    if (
      peticion.method() === 'POST' &&
      recurso.endsWith('/otp/solicitar') &&
      desafioEmitido &&
      cuerpo.challengeToken === challengeToken
    ) {
      codigoSolicitado = true;
      return ruta.fulfill({
        status: 202,
        json: {
          canal: 'EMAIL',
          destinoEnmascarado: 'g***r@example.test',
          expiraEn: 300,
          desafioExpiraEn: 300,
        },
      });
    }
    if (
      peticion.method() === 'POST' &&
      recurso.endsWith('/otp/verificar') &&
      codigoSolicitado &&
      cuerpo.challengeToken === challengeToken &&
      cuerpo.codigo === codigo
    ) {
      const usuario = {
        id: '00000000-0000-4000-8000-000000000099',
        nombreCompleto: 'Gestor de prueba',
        correo,
        roles: ['GESTOR_DESPACHO'],
      };
      const codificar = (datos: unknown) =>
        Buffer.from(JSON.stringify(datos)).toString('base64url');
      const ahora = Math.floor(Date.now() / 1000);
      const accessToken = `${codificar({ alg: 'RS256', typ: 'JWT' })}.${codificar({ sub: usuario.id, roles: usuario.roles, iat: ahora, exp: ahora + 900 })}.firma-simulada`;
      return ruta.fulfill({
        json: {
          accessToken,
          refreshToken: 'refresco-e2e',
          tokenType: 'Bearer',
          expiresIn: 900,
          usuario,
        },
      });
    }
    return ruta.fulfill({ status: 401, json: { code: 'CREDENCIALES_INVALIDAS' } });
  });

  await page.goto(destino);
  await expect(page).toHaveURL(/\/acceso$/);
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(contrasena);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Verifica tu acceso', exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/acceso$/);
  const entrada = page.getByRole('textbox', { name: 'PinInput', exact: true }).first();
  await expect(entrada).toBeEnabled();
  await entrada.focus();
  await page.keyboard.type(codigo);
  await expect(page).toHaveURL(new URL(destino, page.url()).href);
}
