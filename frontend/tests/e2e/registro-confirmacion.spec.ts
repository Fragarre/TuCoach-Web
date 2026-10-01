import { expect, test } from "@playwright/test";

// Ejecutar con un servidor local y NEXT_PUBLIC_SUPABASE_URL apuntando a
// https://auth-tucoach-test.invalid. Nunca se envían correos reales.
test.skip(process.env.TUCOACH_AUTH_MOCKED !== "1", "Requiere servidor con autenticación simulada");
test.beforeEach(async ({ page }) => {
  await page.route("https://auth-tucoach-test.invalid/**", (route) => route.fulfill({
    status: 400, contentType: "application/json", body: JSON.stringify({ msg: "Unexpected test request" }),
  }));
});

test("registro pendiente, reenvío y espera", async ({ page }) => {
  let reenvios = 0;
  await page.route("**/auth/v1/signup**", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({
      id: "test-user", email: "prueba@example.com", identities: [],
    }),
  }));
  await page.route("**/auth/v1/resend**", (route) => {
    reenvios++;
    expect(route.request().postDataJSON()).toMatchObject({ type: "signup", email: "prueba@example.com" });
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.goto("/?acceso=login");
  await page.getByRole("button", { name: "Probar gratis", exact: true }).click();
  await page.locator("#email").fill("prueba@example.com");
  await page.locator("#password").fill("password-test");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(page.locator(".success")).toContainText("Revisa tu correo");
  await expect(page.locator(".success")).toContainText("Spam");
  await page.getByRole("button", { name: "Reenviar correo de confirmación", exact: true }).click();
  await expect(page.locator(".success")).toContainText("registro pendiente");
  await expect(page.getByRole("button", { name: /Podrás reenviar en/ })).toBeDisabled();
  expect(reenvios).toBe(1);
});

test("login sin confirmar explica el siguiente paso", async ({ page }) => {
  await page.route("**/auth/v1/token**", (route) => route.fulfill({
    status: 400, contentType: "application/json", headers: {
      "x-supabase-api-version": "2024-01-01",
      "access-control-expose-headers": "X-Supabase-Api-Version",
    },
    body: JSON.stringify({ code: "email_not_confirmed", msg: "Email not confirmed" }),
  }));
  await page.goto("/?acceso=login");
  await page.locator("#email").fill("prueba@example.com");
  await page.locator("#password").fill("password-test");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".error")).toContainText("Debes confirmar tu correo");
});

test("confirmación válida no persiste sesión ni consulta el backend", async ({ page, context }) => {
  let verificaciones = 0;
  const backend: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/api/")) backend.push(request.url()); });
  await page.route("**/auth/v1/verify", (route) => {
    verificaciones++;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      access_token: "simulated-access-token", refresh_token: "simulated-refresh-token",
      token_type: "bearer", expires_in: 3600,
      user: { id: "test-user", email: "prueba@example.com", email_confirmed_at: "2026-10-01T20:00:00Z" },
    }) });
  });
  await page.goto("/auth/confirmar?token_hash=simulated-hash");
  await expect(page.getByRole("button", { name: "Confirmar mi cuenta", exact: true })).toBeEnabled();
  expect(verificaciones).toBe(0);
  await page.getByRole("button", { name: "Confirmar mi cuenta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tu cuenta ha sido confirmada" })).toBeVisible();
  expect(verificaciones).toBe(1);
  const state = await context.storageState();
  expect(state.cookies.filter((cookie) => cookie.name.includes("auth-token"))).toEqual([]);
  expect(state.origins.flatMap((origin) => origin.localStorage).filter((entry) => entry.name.includes("auth-token"))).toEqual([]);
  await page.getByRole("link", { name: "Iniciar sesión", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Iniciar sesión", exact: true })).toBeVisible();
  expect(backend).toEqual([]);
});

test("enlace caducado no muestra confirmación", async ({ page }) => {
  await page.route("**/auth/v1/verify", (route) => route.fulfill({
    status: 403, contentType: "application/json", body: JSON.stringify({ code: "otp_expired", msg: "Token expired" }),
  }));
  await page.goto("/auth/confirmar?token_hash=expired");
  await page.getByRole("button", { name: "Confirmar mi cuenta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No hemos podido confirmar tu cuenta" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tu cuenta ha sido confirmada" })).toHaveCount(0);
});
