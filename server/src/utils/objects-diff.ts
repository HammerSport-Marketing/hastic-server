import * as _ from 'lodash';

export function diff(a: any, b: any): string[] {
  /*
    Returns keys which differ between a and b
    e.g:
      a = { a: 1, b: 2, c: 3 }
      b = { a: 2, b: 2 }
      result: [ 'a', 'c' ]
  */
  return _.reduce(a, function (result, value, key) {
    return _.isEqual(value, b[key]) ?
      result : result.concat(key);
  }, []);
}
