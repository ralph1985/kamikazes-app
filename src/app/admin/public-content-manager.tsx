"use client";

import { useEffect, useState } from "react";
import { EditIcon, IconButton } from "@/components/lists/compact-list";
import { Modal } from "@/components/ui/modal";
import styles from "./admin.module.css";

type Section = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
};
type SocialLink = { id: string; label: string; url: string; sortOrder: number; isActive: boolean };
type Editor =
  | { kind: "section"; value: Omit<Section, "id"> & { id?: string } }
  | { kind: "socialLink"; value: Omit<SocialLink, "id"> & { id?: string } };

const emptySection = (): Editor => ({
  kind: "section",
  value: { title: "", body: "", imageUrl: null, sortOrder: 0, isVisible: true },
});
const emptyLink = (): Editor => ({
  kind: "socialLink",
  value: { label: "", url: "https://", sortOrder: 0, isActive: true },
});

export default function PublicContentManager() {
  const [sections, setSections] = useState<Section[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/v1/admin/public-content");
      const result = (await response.json()) as {
        data?: { sections: Section[]; socialLinks: SocialLink[] };
        error?: { message?: string };
      };
      if (!response.ok || !result.data)
        throw new Error(result.error?.message ?? "No se pudo cargar");
      setSections(result.data.sections);
      setSocialLinks(result.data.socialLinks);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar el contenido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (!editor) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/admin/public-content", {
        method: editor.value.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: editor.kind, ...editor.value }),
      });
      const result = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? "No se pudo guardar");
      setEditor(null);
      setMessage("Contenido guardado.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el contenido");
    } finally {
      setSaving(false);
    }
  }

  async function remove(kind: "section" | "socialLink", id: string) {
    if (!window.confirm("¿Quieres eliminar este contenido?")) return;
    const response = await fetch("/api/v1/admin/public-content", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, id }),
    });
    if (response.ok) {
      setMessage("Contenido eliminado.");
      await load();
    } else {
      const result = (await response.json()) as { error?: { message?: string } };
      setMessage(result.error?.message ?? "No se pudo eliminar el contenido.");
    }
  }

  function updateEditor(field: string, value: string | boolean | null) {
    setEditor((current) => {
      if (!current) return current;
      return { ...current, value: { ...current.value, [field]: value } } as Editor;
    });
  }

  return (
    <section className={styles.contentManager}>
      <div className={styles.membersHeader}>
        <div>
          <p className={styles.cardEyebrow}>Contenido público</p>
          <h2>Presentación e historia</h2>
          <p>Gestiona lo que puede consultar cualquier visitante.</p>
        </div>
        <div className={styles.contentActions}>
          <button onClick={() => setEditor(emptySection())} type="button">
            Nueva sección
          </button>
          <button onClick={() => setEditor(emptyLink())} type="button">
            Nuevo enlace
          </button>
        </div>
      </div>
      {message ? (
        <p className={styles.message} role="status">
          {message}
        </p>
      ) : null}
      {loading ? <p className={styles.muted}>Cargando contenido…</p> : null}
      <div className={styles.contentColumns}>
        <div>
          <h3>Secciones</h3>
          <ul className={styles.contentList}>
            {sections.map((section) => (
              <li className={styles.contentItem} key={section.id}>
                <span>
                  <strong>{section.title}</strong>
                  <small>{section.isVisible ? "Visible" : "Oculta"}</small>
                </span>
                <span className={styles.inlineActions}>
                  <IconButton
                    label={`Editar ${section.title}`}
                    onClick={() => setEditor({ kind: "section", value: section })}
                  >
                    <EditIcon />
                  </IconButton>
                  <button onClick={() => void remove("section", section.id)} type="button">
                    Eliminar
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Redes sociales</h3>
          <ul className={styles.contentList}>
            {socialLinks.map((link) => (
              <li className={styles.contentItem} key={link.id}>
                <span>
                  <strong>{link.label}</strong>
                  <small>{link.isActive ? link.url : "Inactivo"}</small>
                </span>
                <span className={styles.inlineActions}>
                  <IconButton
                    label={`Editar ${link.label}`}
                    onClick={() => setEditor({ kind: "socialLink", value: link })}
                  >
                    <EditIcon />
                  </IconButton>
                  <button onClick={() => void remove("socialLink", link.id)} type="button">
                    Eliminar
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Modal
        onClose={() => setEditor(null)}
        open={editor !== null}
        title={editor?.kind === "section" ? "Editar sección pública" : "Editar enlace social"}
      >
        {editor ? (
          <div className={styles.publicEditor}>
            {editor.kind === "section" ? (
              <>
                <label>
                  Título
                  <input
                    value={editor.value.title}
                    onChange={(event) => updateEditor("title", event.target.value)}
                  />
                </label>
                <label>
                  Texto
                  <textarea
                    value={editor.value.body}
                    onChange={(event) => updateEditor("body", event.target.value)}
                  />
                </label>
                <label>
                  Imagen (URL opcional)
                  <input
                    value={editor.value.imageUrl ?? ""}
                    onChange={(event) => updateEditor("imageUrl", event.target.value || null)}
                  />
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    checked={editor.value.isVisible}
                    onChange={(event) => updateEditor("isVisible", event.target.checked)}
                    type="checkbox"
                  />{" "}
                  Visible
                </label>
              </>
            ) : (
              <>
                <label>
                  Nombre
                  <input
                    value={editor.value.label}
                    onChange={(event) => updateEditor("label", event.target.value)}
                  />
                </label>
                <label>
                  URL
                  <input
                    type="url"
                    value={editor.value.url}
                    onChange={(event) => updateEditor("url", event.target.value)}
                  />
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    checked={editor.value.isActive}
                    onChange={(event) => updateEditor("isActive", event.target.checked)}
                    type="checkbox"
                  />{" "}
                  Activo
                </label>
              </>
            )}
            <div className={styles.memberActions}>
              <button disabled={saving} onClick={() => void save()} type="button">
                {saving ? "Guardando…" : "Guardar"}
              </button>
              <button onClick={() => setEditor(null)} type="button">
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
