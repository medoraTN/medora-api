export const UNIT_KINDS = ["EMERGENCY", "OR", "ICU"] as const;
export type UnitKind = (typeof UNIT_KINDS)[number];

/** Clinical care unit (Urgence, Bloc, ICU). */
export interface Unit {
  id: string;
  name: string;
  kind: UnitKind;
  createdAt: Date;
  updatedAt: Date;
}
