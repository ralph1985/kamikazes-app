import styles from "./edition.module.css";

export default function ParticipantsOverview({ year }: Readonly<{ year: number }>) {
  return (
    <div className={styles.budgetLayout}>
      <div className={styles.budgetHeader}>
        <div>
          <p className="eyebrow">Organización de la edición</p>
          <h2>Participantes {year}</h2>
          <p>Personas que forman parte de esta edición y su participación económica.</p>
        </div>
        <span className={styles.budgetState}>Sin configurar</span>
      </div>
      <div className={styles.emptyModule}>
        <p className="eyebrow">Siguiente configuración</p>
        <h3>Aquí veremos quién participa este año.</h3>
        <p>
          La participación anual será independiente de la cuenta del miembro y permitirá indicar
          quién entra en el presupuesto de {year}.
        </p>
      </div>
    </div>
  );
}
