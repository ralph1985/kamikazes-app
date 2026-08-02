"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/auth/login", {
        body: JSON.stringify({ username, password }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as {
        data?: { mustChangePassword?: boolean };
        error?: { message?: string };
      };

      if (!response.ok) {
        setError(result.error?.message ?? "No se ha podido iniciar sesión.");
        return;
      }

      window.location.assign(result.data?.mustChangePassword ? "/change-password" : "/");
    } catch {
      setError("No se ha podido conectar con Kamikazes.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="loginShell">
      <div className="loginIntro">
        <p className="eyebrow">Espacio privado</p>
        <h1>Volvemos a casa.</h1>
        <p className="intro">Inicia sesión para consultar y organizar lo que compartimos.</p>
      </div>
      <form className="loginCard" onSubmit={handleSubmit}>
        <div>
          <p className="formEyebrow">Acceso de miembros</p>
          <h2>Iniciar sesión</h2>
        </div>
        <label>
          Nombre de usuario
          <input
            autoComplete="username"
            onChange={(event) => setUsername(event.target.value)}
            required
            value={username}
          />
        </label>
        <label>
          Contraseña
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error ? (
          <p className="formError" role="alert">
            {error}
          </p>
        ) : null}
        <button className="primaryAction" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Entrando…" : "Entrar"}
        </button>
        <Link className="backLink" href="/">
          Volver al inicio
        </Link>
      </form>
    </div>
  );
}
