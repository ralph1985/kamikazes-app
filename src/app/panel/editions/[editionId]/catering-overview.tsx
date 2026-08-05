"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CompactList, CompactListRow } from "@/components/lists/compact-list";
import { ListState, MoneyCell } from "@/components/lists/list-patterns";
import { Modal } from "@/components/ui/modal";
import styles from "./edition.module.css";

type Meal = {
  id: string;
  name: string;
  plannedPrice: string;
  realPrice: string | null;
  sortOrder?: number;
};
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
const money = (value: string | number) => `${Number(value).toFixed(2)} €`;

export default function CateringOverview({
  editionId,
  readOnly,
}: Readonly<{ editionId: string; readOnly: boolean }>) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mealModal, setMealModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
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
        data?: { meals: Meal[]; canEdit: boolean };
        error?: { message: string };
      };
      const attendanceResult = (await attendanceResponse.json()) as {
        data?: { attendance: Attendance[]; canEdit: boolean; memberId: string };
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
      setCanEdit(mealsResult.data.canEdit && attendanceResult.data.canEdit);
      setMemberId(attendanceResult.data.memberId);
      setParticipants(participantsResult.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar catering");
    } finally {
      setLoading(false);
    }
  }, [editionId]);

  useEffect(() => void load(), [load]);

  const byMealAndMember = useMemo(
    () => new Map(attendance.map((item) => [`${item.mealId}:${item.memberId}`, item])),
    [attendance],
  );
  const totals = useMemo(
    () =>
      meals.reduce(
        (result, meal) => {
          const confirmed = attendance.filter(
            (item) => item.mealId === meal.id && item.status === "yes",
          ).length;
          result.people += confirmed;
          result.planned += confirmed * Number(meal.plannedPrice);
          result.real += confirmed * Number(meal.realPrice ?? meal.plannedPrice);
          return result;
        },
        { people: 0, planned: 0, real: 0 },
      ),
    [attendance, meals],
  );

  async function updateAttendance(
    mealId: string,
    participantId: string,
    values: { status?: string; paymentStatus?: string; paymentNotes?: string | null },
  ) {
    setEditing(true);
    setError(null);
    const current = byMealAndMember.get(`${mealId}:${participantId}`);
    const response = await fetch(`/api/v1/editions/${editionId}/catering/attendance`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mealId,
        memberId: participantId,
        status: values.status ?? current?.status ?? "yes",
        paymentStatus: values.paymentStatus ?? current?.paymentStatus ?? "pending",
        paymentNotes: values.paymentNotes ?? current?.paymentNotes ?? null,
      }),
    });
    const result = (await response.json()) as { error?: { message: string } };
    if (!response.ok) setError(result.error?.message ?? "No se pudo actualizar catering");
    else await load();
    setEditing(false);
  }

  function openMeal(meal?: Meal) {
    setSelectedMeal(meal ?? null);
    setMealName(meal?.name ?? "");
    setPlannedPrice(meal?.plannedPrice ?? "");
    setRealPrice(meal?.realPrice ?? "");
    setMealModal(true);
  }

  async function saveMeal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/v1/editions/${editionId}/catering/meals`, {
      method: selectedMeal ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: selectedMeal?.id,
        name: mealName,
        plannedPrice: Number(plannedPrice),
        realPrice: realPrice ? Number(realPrice) : null,
        sortOrder: selectedMeal?.sortOrder ?? meals.length,
      }),
    });
    const result = (await response.json()) as { error?: { message: string } };
    if (!response.ok) {
      setError(result.error?.message ?? "No se pudo guardar la comida");
      return;
    }
    setMealModal(false);
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
          {canEdit && !readOnly && (
            <button className={styles.primary} onClick={() => openMeal()} type="button">
              Añadir comida
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      {!loading && meals.length > 0 && (
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span>Asistencias confirmadas</span>
            <strong>{totals.people}</strong>
            <small>Sumadas entre todas las comidas</small>
          </div>
          <div className={styles.summaryCard}>
            <span>Total previsto</span>
            <strong>{money(totals.planned)}</strong>
            <small>Según precio previsto y asistentes</small>
          </div>
          <div className={styles.summaryCard}>
            <span>Total real</span>
            <strong>{money(totals.real)}</strong>
            <small>Según precio real disponible</small>
          </div>
        </div>
      )}
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
              <div>
                <span>
                  <MoneyCell amount={meal.plannedPrice} /> previsto
                  {meal.realPrice ? ` · ${meal.realPrice} € real` : ""}
                </span>
                {canEdit && !readOnly && (
                  <button className={styles.secondary} onClick={() => openMeal(meal)} type="button">
                    Editar
                  </button>
                )}
              </div>
            </div>
            <CompactList>
              {participants.map((participant) => {
                const item = byMealAndMember.get(`${meal.id}:${participant.memberId}`);
                const ownRow = participant.memberId === memberId;
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
                    <div className={styles.rowActions}>
                      <select
                        aria-label={`Asistencia de ${participant.displayName} en ${meal.name}`}
                        disabled={readOnly || editing || (!canEdit && !ownRow)}
                        onChange={(event) =>
                          void updateAttendance(meal.id, participant.memberId, {
                            status: event.target.value,
                          })
                        }
                        value={item?.status ?? "yes"}
                      >
                        <option value="yes">Sí</option>
                        <option value="no">No</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                      {canEdit && !readOnly && (
                        <select
                          aria-label={`Pago de ${participant.displayName} en ${meal.name}`}
                          disabled={editing}
                          onChange={(event) =>
                            void updateAttendance(meal.id, participant.memberId, {
                              paymentStatus: event.target.value,
                            })
                          }
                          value={item?.paymentStatus ?? "pending"}
                        >
                          <option value="pending">Pendiente</option>
                          <option value="partial">Parcial</option>
                          <option value="paid">Pagado</option>
                        </select>
                      )}
                    </div>
                  </CompactListRow>
                );
              })}
            </CompactList>
          </section>
        ))
      )}
      <Modal
        onClose={() => setMealModal(false)}
        open={mealModal}
        title={selectedMeal ? "Editar comida" : "Añadir comida"}
      >
        <form className={styles.form} onSubmit={saveMeal}>
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
