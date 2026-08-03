"use client";

import { useState, type FormEvent } from "react";
import styles from "./panel.module.css";

export default function CreateEditionForm({ initialYear }: Readonly<{ initialYear: number }>) {
  const [year, setYear] = useState(String(initialYear));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/editions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ year: Number(year) }),
      });
      const result = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setError(result.error?.message ?? "No se ha podido crear la edición.");
        return;
      }
      window.location.reload();
    } catch {
      setError("No se ha podido conectar con Kamikazes.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.createForm} onSubmit={handleSubmit}>
      <label htmlFor="new-edition-year">Nueva edición</label>
      <div className={styles.createControls}>
        <input
          id="new-edition-year"
          inputMode="numeric"
          min="1900"
          max="2200"
          onChange={(event) => setYear(event.target.value)}
          required
          type="number"
          value={year}
        />
        <button className="primaryAction" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Creando…" : "Crear"}
        </button>
      </div>
      {error ? (
        <p className={styles.createError} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
