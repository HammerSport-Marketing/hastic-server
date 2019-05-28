import * as AnalyticsController from '../controllers/analytics_controller';

import * as AnalyticUnit from '../models/analytic_units';
import * as Segment from '../models/segment_model';

import * as Router from 'koa-router';


async function getSegments(ctx: Router.IRouterContext) {
  let analyticUnitIds = ctx.request.query.ids;
  if(!AnalyticUnit.validateAnalyticUnitIds(analyticUnitIds)) {
    throw new Error(`Cannot get segments for array of ids ${analyticUnitIds}`);
  }

  let analyticUnits = await analyticUnitIds.map(id => AnalyticUnit.findById(id));

  let nullId = analyticUnits.indexOf(null);
  if(nullId !== -1) {
    throw new Error(`Cannot find analytic unit with id ${analyticUnitIds[nullId]}`);
  }
  let query: Segment.FindManyQuery = {};

  if(!isNaN(+ctx.request.query.lastSegmentId)) {
    query.intexGT = +ctx.request.query.lastSegmentId;
  }
  if(!isNaN(+ctx.request.query.from)) {
    query.timeFromGTE = +ctx.request.query.from;
  }
  if(!isNaN(+ctx.request.query.to)) {
    query.timeToLTE = +ctx.request.query.to;
  }
  let segments = await Segment.findMany(analyticUnitIds, query);
  ctx.response.body = { segments };
}

async function updateSegments(ctx: Router.IRouterContext) {
  const {
    addedSegments, id, removedSegments: removedIds
  } = ctx.request.body as {
    addedSegments: any[], id: AnalyticUnit.AnalyticUnitId, removedSegments: Segment.SegmentId[]
  };

  const segmentsToInsert: Segment.Segment[] = addedSegments.map(
    s => Segment.Segment.fromObject({ analyticUnitId: id, ...s })
  );

  const { addedIds } = await AnalyticsController.updateSegments(
    id, segmentsToInsert, removedIds
  );

  ctx.response.body = { addedIds }; 
}

export const router = new Router();

router.get('/', getSegments);
router.patch('/', updateSegments);
