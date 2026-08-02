export const MAX_FAILED_LOGIN_ATTEMPTS = 3;
export const SESSION_MAX_AGE_DAYS = 30;

export type IdentityErrorCode =
  "invalid_credentials" | "account_locked" | "account_inactive" | "invalid_password";

export class IdentityError extends Error {
  constructor(
    public readonly code: IdentityErrorCode,
    message = "No se han podido validar las credenciales",
  ) {
    super(message);
    this.name = "IdentityError";
  }
}

export function normalizeUsername(username: string): string {
  return username
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s/g, "")
    .toLowerCase();
}

export function assertPasswordNotEmpty(password: string): void {
  if (password.length === 0) {
    throw new IdentityError("invalid_password", "La contraseña no puede estar vacía");
  }
}

export function sessionExpiresAt(now: Date): Date {
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + SESSION_MAX_AGE_DAYS);
  return expiresAt;
}
