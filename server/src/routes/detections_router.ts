import * as AnalyticsController from '../controllers/analytics_controller';
import { AnalyticUnitId } from '../models/analytic_units';
import { DetectionSpan } from '../models/detection_model';

import * as Router from 'koa-router';


declare type DetectionSpansResponse = {
  spans: DetectionSpan[]
}

export async function getDetectionSpans(ctx: Router.IRouterContext) {
  let id: AnalyticUnitId = ctx.request.query.id;
  if(id === undefined || id === '') {
    throw new Error('analyticUnitId (id) is missing');
  }

  let from_timestamp: number = +ctx.request.query.from_timestamp;
  if(isNaN(from_timestamp) || ctx.request.query.from_timestamp === '') {
    throw new Error(`from is missing or corrupted (got ${ctx.request.query.from_timestamp})`);
  }
  let to_timestamp: number = +ctx.request.query.to_timestamp;
  if(isNaN(to_timestamp) || ctx.request.query.to_timestamp === '') {
    throw new Error(`to is missing or corrupted (got ${ctx.request.query.to_timestamp})`);
  }

  if(from_timestamp >= to_timestamp) {
    throw new Error(`'from_timestamp' timestamp ${from_timestamp} must be less than 'to_timestamp' timestamp ${to_timestamp}`);
  }

  let response: DetectionSpansResponse = { spans: [] };
  // TODO: invalidate
  response.spans = await AnalyticsController.getDetectionSpans(id, from_timestamp, to_timestamp);
  ctx.response.body = response;
}

export const router = new Router();

router.get('/spans', getDetectionSpans);
