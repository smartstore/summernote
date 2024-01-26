import _ from 'underscore';
import Type from './Type';
import func from './func';

const isArrayLike = (o) => o.length !== undefined;

/**
 * Returns the first item of an array.
 */
const head = (array) => _.first(array);

/**
 * Returns the last item of an array.
 */
const last = (array) => _.last(array);

/**
 * Returns everything but the last entry of the array.
 */
const initial = (array) => _.initial(array);

/**
 * Returns the rest of the items in an array.
 *
 * @param {Array} array
 */
const tail = (array) => _.rest(array);

const exists = (list, pred, scope) =>
  _.findIndex(list, pred, scope) > -1;

/**
 * Returns the first index where the predicate truth test passes.
 */
const findIndex = (list, pred, scope) =>
  _.findIndex(list, pred, scope);

/**
 * Looks through each value in the list, returning the first one that passes a truth test (predicate), 
 * or undefined if no value passes the test. The function returns as soon as it finds an acceptable element, 
 * and doesn't traverse the entire list. predicate is transformed through iteratee to facilitate shorthand syntaxes.
 */
const find = (list, pred, scope) =>
  _.find(list, pred, scope);

/**
 * Returns true if ALL of the values in the array pass the predicate truth test.
 */
const all = (list, pred, scope) =>
  _.every(list, pred, scope);

/**
 * Returns true if ANY of the values in the list pass the predicate truth test.
 */
const any = (list, pred, scope) =>
  _.some(list, pred, scope);

/**
 * Returns true if the value is present in the list.
 */
const contains = (list, item) => {
  if (list?.contains) {
    // Some list types like `DOMTokenList` don't implement `.indexOf`, but `.contains`
    return list.contains(item);
  }

  return _.contains(list, item);
}

/**
 * Calculated sum in a list.
 *
 * @param {Array} array - array
 * @param {Function} fn - iterator
 */
const sum = (list, fn, scope) => {
  fn = fn || func.self;
  return _.reduce(list, function(memo, v) {
    return memo + fn(v);
  }, 0, scope);
}

/**
 * Looks through each value in the list, returning an array of all the 
 * values that (optionally) pass a truth test (predicate)
 */
const from = (list, pred, scope) => {
  pred = _.isFunction(pred) ? pred : func.ok;
  return _.filter(list, pred, scope);
}

/**
 * Returns true if list has no elements.
 */
const isEmpty = (list) =>
  _.isEmpty(list);

/**
 * Cluster elements by selector function.
 *
 * @param {Array|Object} array - array
 * @param {Function|String} selector - selector function or property name for cluster rule
 * @param {Array[]}
 */
const clusterBy = (list, selector, scope) =>
  _.groupBy(list, selector, scope);

/**
 * Returns a copy of the array with all falsy  values removed
 */
const compact = (list) =>
  _.compact(list);

/**
 * Produces a duplicate-free version of a list.
 * If you know in advance that the array is sorted, passing true for isSorted will run a much faster algorithm.
 *
 * @param {Array|Object} list
 */
const unique = (list, isSorted, scope) =>
  _.uniq(list, isSorted, null, scope);

/**
 * Returns next item.
 * @param {Array} array
 */
const next = (array, item) => {
  if (array?.length && item) {
    const idx = array.indexOf(item);
    return idx === -1 || idx === array.length - 1 ? null : array[idx + 1];
  }

  return null;
}

/**
 * Returns prev item.
 * @param {Array} array
 */
const prev = (array, item) => {
  if (array?.length && item) {
    const idx = array.indexOf(item);
    return idx <= 0 ? null : array[idx - 1];
  }

  return null;
}

  /**
   * Iterates over a list of elements, yielding each in turn to an iteratee function. 
   * The iteratee is bound to the context object (scope), if one is passed. 
   * Each invocation of iteratee is called with three arguments: (element, index, list). 
   * If list is an object, iteratee's arguments will be (value, key, list). Returns the list for chaining.
   *
   * @method each
   * @param {Array|Object} list Array or collection to iterate over.
   * @param {Function} callback Callback function to execute for each item.
   * @param {Object} scope Optional scope to execute the callback in.
   */
const each = (list, callback, scope = null) =>
  _.each(list, callback, scope);

  /**
   * Produces a new array of values by mapping each value in list through a transformation function (transformer). 
   * The iteratee is passed three arguments: the value, then the index (or key) of the iteration, and finally a reference to the entire list.
   *
   * @method map
   * @param {Array|Object} list List of items to iterate.
   * @param {Function} transformer Function to call for each item. It's return value will be the new value.
   * @return {Array} Array with new values based on function return values.
   */
const map = (list, transformer, scope = null) =>
  _.map(list, transformer, scope);

/**
 * Makes a name/object map out of an array with names.
 *
 * @method makeMap
 * @param {Array|String} array Items to make map out of.
 * @param {String} delim Optional delimiter to split string by.
 * @param {Object} map Optional map to add items to.
 * @return {Object} Name/value map of items.
 */
function makeMap(array, delim = null, map = null) {
  const resolvedItems = Type.isString(array) ? array.split(delim || ',') : (array || []);
  map = map || {};
  let i = resolvedItems.length;
  while (i--) {
    map[resolvedItems[i]] = {};
  }

  return map;
}

/**
 * @class core.list
 *
 * list utils
 *
 * @singleton
 * @alternateClassName list
 */
export default {
  head,
  last,
  initial,
  tail,
  prev,
  next,
  exists,
  find,
  findIndex,
  contains,
  all,
  any,
  sum,
  from,
  isEmpty,
  clusterBy,
  compact,
  unique,
  each,
  map,
  makeMap
};
