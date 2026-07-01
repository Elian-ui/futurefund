import { ReturnWindow } from '../schemas/return-snapshot.schema';

export interface CalculateReturnDto {
  deposit: number;
  targetRoi: number;
  window: ReturnWindow;
  periods?: number;
  compound?: boolean;
}
