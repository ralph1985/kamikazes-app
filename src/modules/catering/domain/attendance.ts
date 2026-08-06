export const attendanceStatuses = ["yes", "no", "cancelled"] as const;
export const paymentStatuses = ["pending", "partial", "paid"] as const;

export type AttendanceStatus = (typeof attendanceStatuses)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];

export function canChangeAttendance(
  actorMemberId: string,
  targetMemberId: string,
  isEditor: boolean,
) {
  return isEditor || actorMemberId === targetMemberId;
}
