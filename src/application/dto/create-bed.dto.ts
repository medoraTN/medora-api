import type { BedType } from "../../domain/entities/bed.entity";

export interface CreateBedDto {
  unitId: string;
  code: string;
  type: BedType;
}
