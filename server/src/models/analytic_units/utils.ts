import { DetectorType, AnalyticUnitId } from './types';
import { AnalyticUnit } from './analytic_unit_model';
import { PatternAnalyticUnit } from './pattern_analytic_unit_model';
import { AnomalyAnalyticUnit } from './anomaly_analytic_unit_model';
import { ThresholdAnalyticUnit } from './threshold_analytic_unit_model';

import * as _ from 'lodash';
import { isArray } from 'util';


export function createAnalyticUnitFromObject(obj: any): AnalyticUnit {
  if (obj === undefined) {
    throw new Error('obj is undefined');
  }

  const detectorType: DetectorType = obj.detectorType;
  switch (detectorType) {
    case DetectorType.PATTERN:
      return PatternAnalyticUnit.fromObject(obj);
    case DetectorType.ANOMALY:
      return AnomalyAnalyticUnit.fromObject(obj);
    case DetectorType.THRESHOLD:
      return ThresholdAnalyticUnit.fromObject(obj);

    default:
      throw new Error(`Can't create analytic unit with type "${detectorType}"`);
  }
}

export function validateAnalyticUnitIds(ids: AnalyticUnitId[]): boolean {
  return ids !== undefined && isArray(ids) && _.every(ids.map(id => id !== null && id !== ''));
}