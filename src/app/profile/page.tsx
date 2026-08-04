"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { InternalNav } from "@/components/navigation/internal-nav";

type Profile = { displayName: string; username: string };

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({ displayName: "", username: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/v1/auth/profile")
      .then(async (response) => {
        const result = (await response.json()) as { data?: Profile; error?: { message?: string } };
        if (!response.ok || !result.data)
          throw new Error(result.error?.message ?? "No se pudo cargar el perfil.");
        setProfile(result.data);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "No se pudo cargar el perfil."),
      )
      .finally(() => setLoading(false));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch("/api/v1/auth/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      });
      const result = (await response.json()) as { data?: Profile; error?: { message?: string } };
      if (!response.ok || !result.data)
        throw new Error(result.error?.message ?? "No se pudo guardar el perfil.");
      setProfile(result.data);
      setMessage("Perfil actualizado.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function logoutAll() {
    await fetch("/api/v1/auth/logout-all", { method: "POST" });
    window.location.assign("/login");
  }

  if (loading)
    return (
      <div className="loginShell">
        <p>Cargando perfil…</p>
      </div>
    );

  return (
    <div className="loginShell">
      <div className="loginIntro">
        <p className="eyebrow">Mi cuenta</p>
        <h1>Tu perfil.</h1>
        <p className="intro">Aquí puedes mantener tus datos de acceso y tu nombre visible.</p>
      </div>
      <div className="accountContent">
        <InternalNav
          ariaLabel="Secciones de mi cuenta"
          items={[
            { href: "/profile", label: "Perfil", active: true },
            { href: "/change-password", label: "Seguridad" },
          ]}
        />
        <form className="loginCard" onSubmit={save}>
          <label>
            Nombre visible
            <input
              value={profile.displayName}
              onChange={(event) => setProfile({ ...profile, displayName: event.target.value })}
            />
          </label>
          <label>
            Nombre de usuario
            <input
              autoComplete="username"
              value={profile.username}
              onChange={(event) => setProfile({ ...profile, username: event.target.value })}
            />
          </label>
          {message ? <p role="status">{message}</p> : null}
          {error ? (
            <p className="formError" role="alert">
              {error}
            </p>
          ) : null}
          <button className="primaryAction" disabled={saving} type="submit">
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          <Link className="backLink" href="/change-password">
            Cambiar contraseña
          </Link>
          <button className="backLink" onClick={() => void logoutAll()} type="button">
            Cerrar todas las sesiones
          </button>
        </form>
      </div>
    </div>
  );
}
