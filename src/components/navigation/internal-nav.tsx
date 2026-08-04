import Link from "next/link";
import styles from "./internal-nav.module.css";

export type InternalNavItem = {
  href: string;
  label: string;
  active?: boolean;
};

export function InternalNav({
  ariaLabel,
  items,
}: Readonly<{ ariaLabel: string; items: readonly InternalNavItem[] }>) {
  return (
    <nav aria-label={ariaLabel} className={styles.nav}>
      {items.map((item) => (
        <Link
          aria-current={item.active ? "page" : undefined}
          className={`${styles.link} ${item.active ? styles.active : ""}`}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
