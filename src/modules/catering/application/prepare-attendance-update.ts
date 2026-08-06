import type { AttendanceStatus, PaymentStatus } from "@/modules/catering/domain/attendance";

export type ExistingAttendance = {
  id: string;
  paymentStatus: PaymentStatus;
  paymentNotes: string | null;
};

export type AttendanceUpdateInput = {
  id: string;
  mealId: string;
  memberId: string;
  status: AttendanceStatus;
  paymentStatus?: PaymentStatus;
  paymentNotes?: string | null;
  updatedAt: Date;
};

export function prepareAttendanceUpdate(
  input: AttendanceUpdateInput,
  editor: boolean,
  existing?: ExistingAttendance,
) {
  return {
    id: input.id,
    action: existing ? ("update" as const) : ("create" as const),
    values: {
      mealId: input.mealId,
      memberId: input.memberId,
      status: input.status,
      paymentStatus: editor
        ? (input.paymentStatus ?? existing?.paymentStatus ?? "pending")
        : (existing?.paymentStatus ?? "pending"),
      paymentNotes: editor
        ? (input.paymentNotes ?? existing?.paymentNotes ?? null)
        : (existing?.paymentNotes ?? null),
      updatedAt: input.updatedAt,
    },
  };
}
