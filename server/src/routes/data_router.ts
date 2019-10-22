import * as AnalyticUnit from '../models/analytic_units';
import * as AnalyticsController from '../controllers/analytics_controller';

import * as Router from 'koa-router';


async function query(ctx: Router.IRouterContext) {

  let from_timestamp = ctx.request.query.from_timestamp;
  let to_timestamp = ctx.request.query.to_timestamp;
  const analyticUnitId = ctx.request.query.analyticUnitId;

  if(analyticUnitId === undefined) {
    throw new Error(`data router error: request must contain analyticUnitId`);
  }

  if(from_timestamp === undefined) {
    throw new Error(`data router error: request must contain 'from'`)
  }

  if(to_timestamp === undefined) {
    throw new Error(`data router error: request must contain 'to'`)
  }

  from_timestamp = +from_timestamp;
  to_timestamp = +to_timestamp;

  if(from_timestamp === NaN) {
    throw new Error(`from must be not NaN`);
  }

  if(to_timestamp === NaN) {
    throw new Error(`to must be not NaN`);
  }

  if(to_timestamp <= from_timestamp) {
    throw new Error(`data router error: 'to' must be greater than 'from_timestamp' (from_timestamp:${from_timestamp} to_timestamp:${to_timestamp})`);
  }

  const analyticUnit = await AnalyticUnit.findById(analyticUnitId);

  if(analyticUnit === null) {
    throw new Error(`can't find analytic unit ${analyticUnitId}`);
  }

  const results = await AnalyticsController.getHSR(analyticUnit, from_timestamp, to_timestamp);
  ctx.response.body = { results };
}

export const router = new Router();

router.get('/', query);
