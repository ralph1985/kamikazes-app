"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CompactList, CompactListRow } from "@/components/lists/compact-list";
import { ListState, MoneyCell } from "@/components/lists/list-patterns";
import { Modal } from "@/components/ui/modal";
import styles from "./edition.module.css";

type Meal = { id: string; name: string; plannedPrice: string; realPrice: string | null };
type Participant = { memberId: string; displayName: string };
type Attendance = {
  mealId: string;
  memberId: string;
  displayName: string;
  status: string;
  paymentStatus: string;
  paymentNotes: string | null;
};

const attendanceLabels = { yes: "Sí", no: "No", cancelled: "Cancelado" };
const paymentLabels = { pending: "Pendiente", partial: "Parcial", paid: "Pagado" };

export default function CateringOverview({
  editionId,
  readOnly,
}: Readonly<{ editionId: string; readOnly: boolean }>) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [mealModal, setMealModal] = useState(false);
  const [mealName, setMealName] = useState("");
  const [plannedPrice, setPlannedPrice] = useState("");
  const [realPrice, setRealPrice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mealsResponse, attendanceResponse, participantsResponse] = await Promise.all([
        fetch(`/api/v1/editions/${editionId}/catering/meals`),
        fetch(`/api/v1/editions/${editionId}/catering/attendance`),
        fetch(`/api/v1/editions/${editionId}/participants`),
      ]);
      const mealsResult = (await mealsResponse.json()) as {
        data?: { meals: Meal[] };
        error?: { message: string };
      };
      const attendanceResult = (await attendanceResponse.json()) as {
        data?: { attendance: Attendance[] };
        error?: { message: string };
      };
      const participantsResult = (await participantsResponse.json()) as {
        data?: Participant[];
        error?: { message: string };
      };
      if (!mealsResponse.ok || !mealsResult.data)
        throw new Error(mealsResult.error?.message ?? "No se pudieron cargar las comidas");
      if (!attendanceResponse.ok || !attendanceResult.data)
        throw new Error(attendanceResult.error?.message ?? "No se pudo cargar la asistencia");
      if (!participantsResponse.ok || !participantsResult.data)
        throw new Error(participantsResult.error?.message ?? "No se pudieron cargar los miembros");
      setMeals(mealsResult.data.meals);
      setAttendance(attendanceResult.data.attendance);
      setParticipants(participantsResult.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar catering");
    } finally {
      setLoading(false);
    }
  }, [editionId]);
  useEffect(() => {
    void load();
  }, [load]);

  const byMealAndMember = useMemo(
    () => new Map(attendance.map((item) => [`${item.mealId}:${item.memberId}`, item])),
    [attendance],
  );
  async function updateAttendance(mealId: string, memberId: string, status: string) {
    setEditing(true);
    setError(null);
    const current = byMealAndMember.get(`${mealId}:${memberId}`);
    const response = await fetch(`/api/v1/editions/${editionId}/catering/attendance`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mealId,
        memberId,
        status,
        paymentStatus: current?.paymentStatus ?? "pending",
        paymentNotes: current?.paymentNotes ?? null,
      }),
    });
    const result = (await response.json()) as { error?: { message: string } };
    if (!response.ok) setError(result.error?.message ?? "No se pudo actualizar la asistencia");
    else await load();
    setEditing(false);
  }

  async function createMeal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/v1/editions/${editionId}/catering/meals`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: mealName,
        plannedPrice: Number(plannedPrice),
        realPrice: realPrice ? Number(realPrice) : null,
        sortOrder: meals.length,
      }),
    });
    const result = (await response.json()) as { error?: { message: string } };
    if (!response.ok) {
      setError(result.error?.message ?? "No se pudo crear la comida");
      return;
    }
    setMealModal(false);
    setMealName("");
    setPlannedPrice("");
    setRealPrice("");
    await load();
  }

  return (
    <section className={styles.content}>
      <div className={styles.welcome}>
        <div className={styles.header}>
          <div>
            <p className="eyebrow">Catering</p>
            <h2>Comidas y asistencia</h2>
            <p>La asistencia es independiente del presupuesto general y se gestiona por comida.</p>
          </div>
          {!readOnly && (
            <button className={styles.primary} onClick={() => setMealModal(true)} type="button">
              Añadir comida
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <ListState description="Cargando comidas y asistencia…" title="Catering" />
      ) : meals.length === 0 ? (
        <ListState
          description="Los editores de catering pueden añadir la primera comida."
          title="Todavía no hay comidas"
        />
      ) : (
        meals.map((meal) => (
          <section className={styles.welcome} key={meal.id}>
            <div className={styles.header}>
              <div>
                <p className="eyebrow">Comida</p>
                <h2>{meal.name}</h2>
              </div>
              <span>
                <MoneyCell amount={meal.plannedPrice} /> previsto
                {meal.realPrice ? ` · ${meal.realPrice} € real` : ""}
              </span>
            </div>
            <CompactList>
              {participants.map((participant) => {
                const item = byMealAndMember.get(`${meal.id}:${participant.memberId}`);
                return (
                  <CompactListRow
                    key={participant.memberId}
                    meta={
                      item
                        ? `${attendanceLabels[item.status as keyof typeof attendanceLabels]} · ${paymentLabels[item.paymentStatus as keyof typeof paymentLabels]}`
                        : "Sin respuesta"
                    }
                  >
                    <strong>{participant.displayName}</strong>
                    <select
                      aria-label={`Asistencia de ${participant.displayName} en ${meal.name}`}
                      disabled={readOnly || editing}
                      onChange={(event) =>
                        void updateAttendance(meal.id, participant.memberId, event.target.value)
                      }
                      value={item?.status ?? "yes"}
                    >
                      <option value="yes">Sí</option>
                      <option value="no">No</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </CompactListRow>
                );
              })}
            </CompactList>
          </section>
        ))
      )}
      <Modal onClose={() => setMealModal(false)} open={mealModal} title="Añadir comida">
        <form className={styles.form} onSubmit={createMeal}>
          <label>
            Nombre
            <input
              onChange={(event) => setMealName(event.target.value)}
              required
              value={mealName}
            />
          </label>
          <div className={styles.twoColumns}>
            <label>
              Precio previsto
              <input
                min="0"
                onChange={(event) => setPlannedPrice(event.target.value)}
                required
                step="0.01"
                type="number"
                value={plannedPrice}
              />
            </label>
            <label>
              Precio real
              <input
                min="0"
                onChange={(event) => setRealPrice(event.target.value)}
                step="0.01"
                type="number"
                value={realPrice}
              />
            </label>
          </div>
          <div className={styles.actions}>
            <button className={styles.cancel} onClick={() => setMealModal(false)} type="button">
              Cancelar
            </button>
            <button className={styles.primary} type="submit">
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
