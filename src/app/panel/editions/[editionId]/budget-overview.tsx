import styles from "./edition.module.css";

export default function BudgetOverview({ year }: Readonly<{ year: number }>) {
  return (
    <div className={styles.budgetLayout}>
      <div className={styles.budgetHeader}>
        <div>
          <p className="eyebrow">Gestión económica</p>
          <h2>Presupuesto {year}</h2>
          <p>Cuotas, pagos, devoluciones y saldo de la edición.</p>
        </div>
        <span className={styles.budgetState}>Sin configurar</span>
      </div>
      <div className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span>Participantes</span>
          <strong>—</strong>
          <small>Sin asignaciones todavía</small>
        </article>
        <article className={styles.summaryCard}>
          <span>Pagado</span>
          <strong>—</strong>
          <small>Se calculará al registrar pagos</small>
        </article>
        <article className={styles.summaryCard}>
          <span>Pendiente</span>
          <strong>—</strong>
          <small>Se calculará al configurar cuotas</small>
        </article>
      </div>
      <div className={styles.emptyModule}>
        <p className="eyebrow">Siguiente configuración</p>
        <h3>Primero definiremos las tarifas de esta edición.</h3>
        <p>
          Después podremos asignarlas a los participantes y registrar pagos parciales, devoluciones
          y saldos con su auditoría correspondiente.
        </p>
      </div>
    </div>
  );
}
