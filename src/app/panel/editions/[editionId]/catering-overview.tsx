"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ListState, MoneyCell } from "@/components/lists/list-patterns";
import { MealForm } from "./catering-forms";
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

function mealAmount(meal: Meal, status: string, real: boolean) {
  return status === "yes"
    ? Number(real ? (meal.realPrice ?? meal.plannedPrice) : meal.plannedPrice)
    : 0;
}

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

  const totals = useMemo(() => {
    const result = { people: 0, planned: 0, real: 0, paid: 0 };
    attendance.forEach((item) => {
      const meal = meals.find((candidate) => candidate.id === item.mealId);
      if (!meal) return;
      if (item.status === "yes") {
        result.people += 1;
        result.planned += mealAmount(meal, item.status, false);
        result.real += mealAmount(meal, item.status, true);
      }
      if (item.status === "yes" && item.paymentStatus === "paid") result.paid += 1;
    });
    return result;
  }, [attendance, meals]);

  async function updateAttendance(
    mealId: string,
    participantId: string,
    values: { status?: string; paymentStatus?: string; paymentNotes?: string | null },
  ) {
    setEditing(true);
    setError(null);
    try {
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
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "No se pudo actualizar catering",
      );
    } finally {
      setEditing(false);
    }
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
      <div className={styles.cateringHeading}>
        <div>
          <p className="eyebrow">Catering</p>
          <h2>Comidas y asistencia</h2>
          <p>Una fila por persona y una columna por comida, como en la hoja original.</p>
        </div>
        {canEdit && !readOnly ? (
          <button className={styles.primary} onClick={() => openMeal()} type="button">
            Añadir comida
          </button>
        ) : null}
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <ListState description="Cargando comidas y asistencia…" title="Catering" />
      ) : meals.length === 0 ? (
        <ListState
          description="Los editores de catering pueden añadir la primera comida."
          title="Todavía no hay comidas"
        />
      ) : (
        <>
          <div className={styles.cateringSummary}>
            <div>
              <span>Asistencias confirmadas</span>
              <strong>{totals.people}</strong>
            </div>
            <div>
              <span>Total previsto</span>
              <strong>
                <MoneyCell amount={totals.planned} />
              </strong>
            </div>
            <div>
              <span>Total real</span>
              <strong>
                <MoneyCell amount={totals.real} />
              </strong>
            </div>
            <div>
              <span>Pagos completos</span>
              <strong>{totals.paid}</strong>
            </div>
          </div>
          <div className={styles.cateringTableScroll}>
            <table className={styles.cateringTable}>
              <thead>
                <tr>
                  <th className={styles.cateringMemberColumn}>Miembro</th>
                  {meals.map((meal) => (
                    <th className={styles.cateringMealHeader} colSpan={2} key={meal.id}>
                      <span>{meal.name}</span>
                      <small>
                        {meal.plannedPrice} € previsto
                        {meal.realPrice ? ` · ${meal.realPrice} € real` : ""}
                      </small>
                      {canEdit && !readOnly ? (
                        <button onClick={() => openMeal(meal)} type="button">
                          Editar
                        </button>
                      ) : null}
                    </th>
                  ))}
                  <th className={styles.cateringTotalColumn}>Total prev.</th>
                  <th className={styles.cateringTotalColumn}>Total real</th>
                </tr>
                <tr className={styles.cateringSubheader}>
                  <th className={styles.cateringMemberColumn} />
                  {meals.map((meal) => (
                    <Fragment key={meal.id}>
                      <th>Asistencia</th>
                      <th>Pago</th>
                    </Fragment>
                  ))}
                  <th />
                  <th />
                </tr>
              </thead>
              <tbody>
                {participants.map((participant) => {
                  const ownRow = participant.memberId === memberId;
                  let plannedTotal = 0;
                  let realTotal = 0;
                  return (
                    <tr key={participant.memberId}>
                      <th className={styles.cateringMemberColumn} scope="row">
                        {participant.displayName}
                      </th>
                      {meals.map((meal) => {
                        const item = byMealAndMember.get(`${meal.id}:${participant.memberId}`);
                        const status = item?.status ?? "yes";
                        plannedTotal += mealAmount(meal, status, false);
                        realTotal += mealAmount(meal, status, true);
                        return (
                          <Fragment key={meal.id}>
                            <td>
                              <select
                                aria-label={`Asistencia de ${participant.displayName} en ${meal.name}`}
                                disabled={readOnly || editing || (!canEdit && !ownRow)}
                                onChange={(event) =>
                                  void updateAttendance(meal.id, participant.memberId, {
                                    status: event.target.value,
                                  })
                                }
                                value={status}
                              >
                                <option value="yes">Sí</option>
                                <option value="no">No</option>
                                <option value="cancelled">Cancelado</option>
                              </select>
                            </td>
                            <td className={styles.cateringPaymentCell}>
                              <select
                                aria-label={`Pago de ${participant.displayName} en ${meal.name}`}
                                disabled={readOnly || editing || !canEdit}
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
                            </td>
                          </Fragment>
                        );
                      })}
                      <td className={styles.cateringAmountCell}>{plannedTotal.toFixed(2)} €</td>
                      <td className={styles.cateringAmountCell}>{realTotal.toFixed(2)} €</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={styles.cateringHint}>
            {canEdit
              ? "Puedes corregir asistencia y pagos de cualquier miembro."
              : "Puedes modificar únicamente tu propia asistencia; los pagos los gestionan los editores."}
          </p>
        </>
      )}
      <MealForm
        editing={selectedMeal !== null}
        name={mealName}
        onClose={() => setMealModal(false)}
        onNameChange={setMealName}
        onPlannedPriceChange={setPlannedPrice}
        onRealPriceChange={setRealPrice}
        onSubmit={saveMeal}
        open={mealModal}
        plannedPrice={plannedPrice}
        realPrice={realPrice}
      />
    </section>
  );
}
