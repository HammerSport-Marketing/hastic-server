import { AnalyticUnitId } from './analytic_units';
import { Collection, makeDBQ } from '../services/data_service';

import * as _ from 'lodash';

let db = makeDBQ(Collection.DETECTION_SPANS);

export enum DetectionStatus {
  READY = 'READY',
  RUNNING = 'RUNNING',
  FAILED = 'FAILED'
}

export type DetectionId = string;

export class DetectionSpan {
  constructor(
    public analyticUnitId: AnalyticUnitId,
    public from: number,
    public to: number,
    public status: DetectionStatus,
    public id?: DetectionId,
  ) {
    if(analyticUnitId === undefined) {
      throw new Error('AnalyticUnitId is undefined');
    }
    if(from === undefined) {
      throw new Error('from is undefined');
    }
    if(isNaN(from)) {
      throw new Error('from is NaN');
    }
    if(to === undefined) {
      throw new Error('to is undefined');
    }
    if(isNaN(to)) {
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
      from: this.from,
      to: this.to,
      status: this.status
    };
  }

  static fromObject(obj: any): DetectionSpan {
    if(obj === undefined) {
      throw new Error('obj is undefined');
    }
    return new DetectionSpan(
      obj.analyticUnitId,
      +obj.from, +obj.to,
      obj.status,
      obj._id
    );
  }
}

export type FindManyQuery = {
  status?: DetectionStatus,
  from?: { $gte?: number, $lte?: number }
  to?: { $gte?: number, $lte?: number }
}

export async function findMany(id: AnalyticUnitId, query?: FindManyQuery): Promise<DetectionSpan[]> {
  let dbQuery: any = { analyticUnitId: id };
  if(query.status !== undefined) {
    dbQuery.status = query.status;
  }
  if(query.from !== undefined) {
    dbQuery.from = query.from;
  }
  if(query.to !== undefined) {
    dbQuery.to = query.to;
  }

  const spans = await db.findMany(dbQuery);
  if(spans === null) {
    return [];
  }
  return spans.map(DetectionSpan.fromObject);
}

export async function getIntersectedSpans(
  analyticUnitId: AnalyticUnitId,
  from: number,
  to: number,
  status?: DetectionStatus
): Promise<DetectionSpan[]> {
  return findMany(analyticUnitId, { status, from: { $lte: to }, to: { $gte: from } });
}

export async function insertSpan(span: DetectionSpan) {
  let spanToInsert = span.toObject();

  const intersections = await getIntersectedSpans(span.analyticUnitId, span.from, span.to, span.status);
  if(intersections.length > 0 && span.status === DetectionStatus.READY) {
    let minFrom = _.minBy(intersections, span => span.from).from;
    minFrom = Math.min(span.from, minFrom);

    let maxTo = _.maxBy(intersections, span => span.to).to;
    maxTo = Math.max(span.to, maxTo);

    const spansInside = await findMany(span.analyticUnitId, { from: { $gte: minFrom }, to: { $lte: maxTo } });
    const spanIdsToRemove = _.concat(intersections.map(span => span.id), spansInside.map(span => span.id));

    await db.removeMany(spanIdsToRemove);

    spanToInsert = new DetectionSpan(span.analyticUnitId, minFrom, maxTo, span.status).toObject();
  }
  return db.insertOne(spanToInsert);
}

export function getSpanBorders(spans: DetectionSpan[]): number[] {
  let spanBorders: number[] = [];

  _.sortBy(spans.map(span => span.toObject()), span => span.from)
    .forEach(span => {
      spanBorders.push(span.from);
      spanBorders.push(span.to);
    });

  return spanBorders;
}

export function clearSpans(analyticUnitId: AnalyticUnitId) {
  return db.removeMany({ analyticUnitId });
}
