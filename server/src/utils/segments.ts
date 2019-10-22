//TODO: move this code to span model

import * as _ from 'lodash';


export declare type Segment = {
  readonly from_timestamp: number,
  readonly to_timestamp: number
}

export class IntegerSegment {
  readonly from_timestamp: number;
  readonly to_timestamp: number;

  constructor(from_timestamp: number, to_timestamp: number) {
    if(!(Number.isInteger(from_timestamp) || !Number.isFinite(from_timestamp))) {
      throw new Error(`From should be an Integer or Infinity, but got ${from_timestamp}`);
    }
    if(!(Number.isInteger(to_timestamp) || !Number.isFinite(to_timestamp))) {
      throw new Error(`To should be an Integer or Infinity, but got ${from_timestamp}`);
    }

    let l = IntegerSegment.lengthBetweenPoints(from_timestamp, to_timestamp);
    if(l < 1) {
      throw new Error(
        `Length of segment is less than 1: [${from_timestamp}, ${to_timestamp}]. 
        It's not possible for IntegerSegment`
      );
    }
    this.from_timestamp = from_timestamp;
    this.to_timestamp = to_timestamp;
  }

  get length(): number {
    return IntegerSegment.lengthBetweenPoints(this.from_timestamp, this.to_timestamp);
  }

  insersect(segment: IntegerSegment): IntegerSegment | undefined {
    let from_timestamp = Math.max(this.from_timestamp, segment.from_timestamp);
    let to_timestamp = Math.min(this.to_timestamp, segment.to_timestamp);
    if(IntegerSegment.lengthBetweenPoints(from_timestamp, to_timestamp) >= 1) {
      return new IntegerSegment(from_timestamp, to_timestamp);
    }
    return undefined;
  }

  toString(): string {
    return `[${this.from_timestamp}, ${this.to_timestamp}]`;
  }

  static lengthBetweenPoints(from_timestamp: number, to_timestamp: number): number {
    let l = to_timestamp - from_timestamp + 1; // because [x, x] has length 1
    if(isNaN(l)) { // when [Infinity, Infinity] or [-Infinity, -Infinity]
      return 0;
    } else {
      return Math.max(l, 0); // becase [x, x - 1] we consider as zero length
    }
  }
}

export class IntegerSegmentsSet {

  private _segments: IntegerSegment[];

  constructor(segments: IntegerSegment[], noramlized: boolean = false) {
    this._segments = segments;
    if(noramlized !== true) {
      this._normalize();
    }
  }

  private _normalize() {
    if(this._segments.length === 0) {
      return;
    }
    let sortedSegments = _.sortBy(this._segments, s => s.from_timestamp);
    let lastFrom_timestamp = sortedSegments[0].from_timestamp;
    let lastTo_timestamp = sortedSegments[0].to_timestamp;
    let mergedSegments: IntegerSegment[] = [];
    for(let i = 1; i < sortedSegments.length; i++) {
      let currentSegment = sortedSegments[i];
      if(lastTo_timestamp + 1 >= currentSegment.from_timestamp) { // because [a, x], [x + 1, b] is [a, b]
        lastTo_timestamp = Math.max(currentSegment.to_timestamp, lastTo_timestamp); // we can be inside previous
        continue;
      }
      mergedSegments.push(new IntegerSegment(lastFrom_timestamp, lastTo_timestamp));
      lastFrom_timestamp = currentSegment.from_timestamp;
      lastTo_timestamp = currentSegment.to_timestamp;
    }
    mergedSegments.push(new IntegerSegment(lastFrom_timestamp, lastTo_timestamp));
    this._segments = mergedSegments;
  }

  get segments(): IntegerSegment[] {
    return this._segments;
  }

  inversed(): IntegerSegmentsSet {
    var invertedSegments: IntegerSegment[] = [];
    if(this._segments.length === 0) {
      invertedSegments = [new IntegerSegment(-Infinity, Infinity)];
    } else {
      let push = (f: number, t: number) => {
        if(IntegerSegment.lengthBetweenPoints(f, t) > 0) {
          invertedSegments.push(new IntegerSegment(f, t));
        }
      }
      _.reduce(this._segments, (prev: IntegerSegment | null, s: IntegerSegment) => {
        if(prev === null) {
          push(-Infinity, s.from_timestamp - 1);
        } else {
          push(prev.to_timestamp + 1, s.from_timestamp - 1);
        }
        return s;
      }, null);
      push(this._segments[this._segments.length - 1].to_timestamp + 1, Infinity);
    }
    return new IntegerSegmentsSet(invertedSegments, true);
  }

  intersect(other: IntegerSegmentsSet): IntegerSegmentsSet {
    let result: IntegerSegment[] = [];

    if(this._segments.length === 0 || other.segments.length === 0) {
      return new IntegerSegmentsSet([], true);
    }

    let currentSegmentIndex = 0;
    let withSegmentIndex = 0;

    do {
      let currentSegemet = this.segments[currentSegmentIndex];
      let withSegment = other.segments[withSegmentIndex];
      if(currentSegemet.to_timestamp < withSegment.from_timestamp) {
        currentSegmentIndex++;
        continue;
      }
      if(withSegment.to_timestamp < currentSegemet.from_timestamp) {
        withSegmentIndex++;
        continue;
      }
      let segmentsIntersection = currentSegemet.insersect(withSegment);
      if(segmentsIntersection === undefined) {
        throw new Error(
          `Impossible condition, segments ${currentSegemet} and ${withSegment} don't interset`
        )
      }
      result.push(segmentsIntersection);

      if(currentSegemet.to_timestamp < withSegment.to_timestamp) {
        currentSegmentIndex++;
      } else {
        withSegmentIndex++;
      }
    } while (
      currentSegmentIndex < this._segments.length &&
      withSegmentIndex < other.segments.length
    )

    return new IntegerSegmentsSet(result, true);
  }

  sub(other: IntegerSegmentsSet): IntegerSegmentsSet {
    let inversed = other.inversed();
    return this.intersect(inversed);
  }

}

// TODO: move from utils and use generator
/**
 *
 * @param inputSegment a big segment which we will cut
 * @param cutSegments segments to cut the inputSegment. Segments can overlay.
 *
 * @returns array of segments remain after cut
 */
export function cutSegmentWithSegments(inputSegment: Segment, cutSegments: Segment[]): Segment[] {
  let setA = new IntegerSegmentsSet([new IntegerSegment(inputSegment.from_timestamp, inputSegment.to_timestamp)]);
  let setB = new IntegerSegmentsSet(cutSegments.map(
    s => new IntegerSegment(s.from_timestamp, s.to_timestamp)
  ));
  let setResult = setA.sub(setB);
  return setResult.segments.map(s => ({ from_timestamp: s.from_timestamp, to_timestamp: s.to_timestamp }));
}
