import { AnalyticUnitId } from './analytic_units';
import { Collection, makeDBQ } from '../services/data_service';

import * as _ from 'lodash';

let db = makeDBQ(Collection.DETECTION_SPANS);

export enum DetectionStatus {
  READY = 'READY',
  RUNNING = 'RUNNING',
  FAILED = 'FAILED'
}

export type SpanId = string;

/**
 * Detection-span represents the state of dataset segment:
 * - READY: detection is done
 * - RUNNING: detection is running
 * - FAILED: detection failed
 */
export class DetectionSpan {
  constructor(
    public analyticUnitId: AnalyticUnitId,
    public from_timestamp: number,
    public to_timestamp: number,
    public status: DetectionStatus,
    public id?: SpanId,
  ) {
    if(analyticUnitId === undefined) {
      throw new Error('AnalyticUnitId is undefined');
    }
    if(from_timestamp === undefined) {
      throw new Error('from is undefined');
    }
    if(isNaN(from_timestamp)) {
      throw new Error('from is NaN');
    }
    if(to_timestamp === undefined) {
      throw new Error('to is undefined');
    }
    if(isNaN(to_timestamp)) {
      throw new Error('to is NaN');
    }
    if(status === undefined) {
      throw new Error('status is undefined');
    }
  }

  public toObject() {
    return {
      _id: this.id,
      analyticUnitId: this.analyticUnitId,
      from_timestamp: this.from_timestamp,
      to_timestamp: this.to_timestamp,
      status: this.status
    };
  }

  static fromObject(obj: any): DetectionSpan {
    if(obj === undefined) {
      throw new Error('obj is undefined');
    }
    return new DetectionSpan(
      obj.analyticUnitId,
      +obj.from_timestamp, +obj.to_timestamp,
      obj.status,
      obj._id
    );
  }
}

export type FindManyQuery = {
  status?: DetectionStatus,
  // TODO:
  // from?: { $gte?: number, $lte?: number }
  // to?: { $gte?: number, $lte?: number }
  timeFromLTE?: number,
  timeToGTE?: number,
  timeFromGTE?: number,
  timeToLTE?: number,
}

export async function findMany(id: AnalyticUnitId, query?: FindManyQuery): Promise<DetectionSpan[]> {
  let dbQuery: any = { analyticUnitId: id };
  if(query.status !== undefined) {
    dbQuery.status = query.status;
  }
  if(query.timeFromLTE !== undefined) {
    dbQuery.from_timestamp = { $lte: query.timeFromLTE };
  }
  if(query.timeToGTE !== undefined) {
    dbQuery.to_timestamp = { $gte: query.timeToGTE };
  }
  if(query.timeFromGTE !== undefined) {
    dbQuery.from_timestamp = { $gte: query.timeFromGTE };
  }
  if(query.timeToLTE !== undefined) {
    dbQuery.to_timestamp = { $lte: query.timeToLTE };
  }

  const spans = await db.findMany(dbQuery);
  if(spans === null) {
    return [];
  }
  return spans.map(DetectionSpan.fromObject);
}

export async function getIntersectedSpans(
  analyticUnitId: AnalyticUnitId,
  from_timestamp: number,
  to_timestamp: number,
  status?: DetectionStatus
): Promise<DetectionSpan[]> {
  return findMany(analyticUnitId, { status, timeFromLTE: to_timestamp, timeToGTE: from_timestamp });
}

export async function insertSpan(span: DetectionSpan): Promise<SpanId> {
  let spanToInsert = span.toObject();

  const intersections = await getIntersectedSpans(span.analyticUnitId, span.from_timestamp, span.to_timestamp);
  if(_.isEmpty(intersections)) {
    return db.insertOne(spanToInsert);
  }
  const spansWithSameStatus = intersections.filter(
    intersectedSpan => intersectedSpan.status === span.status
  );

  let from_timestamp = span.from_timestamp;
  let to_timestamp = span.to_timestamp;

  if(!_.isEmpty(spansWithSameStatus)) {
    let minFrom_timestamp = _.minBy(spansWithSameStatus, s => s.from_timestamp).from_timestamp;
    from_timestamp = Math.min(from_timestamp, minFrom_timestamp);

    let maxTo_timestamp = _.maxBy(spansWithSameStatus, s => s.to_timestamp).to_timestamp;
    to_timestamp = Math.max(to_timestamp, maxTo_timestamp);
  }

  const spansInside = intersections.filter(
    intersectedSpan => intersectedSpan.from_timestamp >= span.from_timestamp && intersectedSpan.to_timestamp <= span.to_timestamp
  );
  const spanIdsToRemove = _.concat(
    spansWithSameStatus.map(s => s.id),
    spansInside.map(s => s.id)
  );

  await db.removeMany(spanIdsToRemove);

  spanToInsert = new DetectionSpan(span.analyticUnitId, from_timestamp, to_timestamp, span.status).toObject();

  return db.insertOne(spanToInsert);
}

export function clearSpans(analyticUnitId: AnalyticUnitId) {
  return db.removeMany({ analyticUnitId });
}
