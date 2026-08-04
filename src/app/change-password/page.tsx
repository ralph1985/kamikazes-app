"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/auth/change-password", {
        body: JSON.stringify({ newPassword }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setError(result.error?.message ?? "No se ha podido cambiar la contraseña.");
        return;
      }
      window.location.assign("/");
    } catch {
      setError("No se ha podido conectar con Kamikazes.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="loginShell">
      <div className="loginIntro">
        <p className="eyebrow">Primer acceso</p>
        <h1>Una contraseña sólo tuya.</h1>
        <p className="intro">Cambia la contraseña de acceso cuando lo necesites.</p>
      </div>
      <form className="loginCard" onSubmit={handleSubmit}>
        <div>
          <p className="formEyebrow">Seguridad de la cuenta</p>
          <h2>Cambiar contraseña</h2>
        </div>
        <label>
          Nueva contraseña
          <input
            autoComplete="new-password"
            minLength={1}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            type="password"
            value={newPassword}
          />
        </label>
        <label>
          Repite la contraseña
          <input
            autoComplete="new-password"
            onChange={(event) => setConfirmation(event.target.value)}
            required
            type="password"
            value={confirmation}
          />
        </label>
        {error ? (
          <p className="formError" role="alert">
            {error}
          </p>
        ) : null}
        <button className="primaryAction" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Guardando…" : "Guardar contraseña"}
        </button>
        <Link className="backLink" href="/">
          Volver al inicio
        </Link>
      </form>
    </div>
  );
}
