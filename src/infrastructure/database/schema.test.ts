import { describe, expect, it } from "vitest";
import {
  accounts,
  auditEvents,
  budgetParticipants,
  budgetRates,
  editionParticipants,
  editions,
  members,
  roleAssignments,
  sessions,
} from "./schema";

describe("esquema de identidad", () => {
  it("define miembros, cuentas y sesiones como tablas separadas", () => {
    expect(members).toBeDefined();
    expect(accounts).toBeDefined();
    expect(sessions).toBeDefined();
    expect(auditEvents).toBeDefined();
    expect(editions).toBeDefined();
    expect(roleAssignments).toBeDefined();
    expect(editionParticipants).toBeDefined();
    expect(budgetRates).toBeDefined();
    expect(budgetParticipants).toBeDefined();
  });
});
