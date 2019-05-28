import * as AnalyticsController from '../controllers/analytics_controller';
import { AnalyticUnitId, validateAnalyticUnitIds } from '../models/analytic_units';
import { DetectionSpan } from '../models/detection_model';

import * as Router from 'koa-router';


declare type DetectionSpansResponse = {
  spans: any;
}

export async function getDetectionSpans(ctx: Router.IRouterContext) {
  let analyticUnitIds: AnalyticUnitId[] = ctx.request.query.ids;
  if(!validateAnalyticUnitIds(analyticUnitIds)) {
    throw new Error(`Cannot get spans for array of ids ${analyticUnitIds}`);
  }

  let from: number = +ctx.request.query.from;
  if(isNaN(from) || ctx.request.query.from === '') {
    throw new Error(`from is missing or corrupted (got ${ctx.request.query.from})`);
  }
  let to: number = +ctx.request.query.to;
  if(isNaN(to) || ctx.request.query.to === '') {
    throw new Error(`to is missing or corrupted (got ${ctx.request.query.to})`);
  }

  let response: DetectionSpansResponse = { spans: {} };
  // TODO: invalidate
  await Promise.all(analyticUnitIds.map(id => {
    return async function() {
      const spans = await AnalyticsController.getDetectionSpans(id, from, to);
      response.spans[id] = spans;
    }
  }));
  ctx.response.body = response;
}

export const router = new Router();

router.get('/spans', getDetectionSpans);
