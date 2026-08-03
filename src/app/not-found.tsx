import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <p className="eyebrow">Kamikazes</p>
      <p className={styles.code}>404</p>
      <h1>Esta página se ha ido de fiesta.</h1>
      <p className={styles.text}>
        No encontramos lo que buscabas, pero todavía queda mucho por organizar.
      </p>
      <Link className="primaryAction" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}
