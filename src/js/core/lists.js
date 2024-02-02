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
 * Returns the rest of the items in an array (starting at index 1).
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
 * Creates a new, shallow-copied Array instance from an iterable or array-like object.
 */
const from = (list, mapper, scope) => {
  if (_.isFunction(Array.from)) {
    return !mapper ? Array.from(list) : Array.from(list, mapper, scope);
  } else {
    return !mapper ? _.toArray(list) : _.map(list, mapper, scope);
  }
}

/**
 * Returns true if list or string has no elements.
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
   * Boils down a list of values into a single value.
   * Memo is the initial state of the reduction, and each successive step of it should be returned by iteratee. 
   * The iteratee is passed four arguments: the memo, then the value and index (or key) of the iteration, 
   * and finally a reference to the entire list.
   * 
   * If no memo is passed to the initial invocation of reduce, the iteratee is not invoked 
   * on the first element of the list. The first element is instead passed as the memo 
   * in the invocation of the iteratee on the next element in the list.
   * @method foldl
   * @param {Array|Object} list Array or collection to iterate over.
   * @param {Function} callback Callback function to execute for each item.
   * @param {any} [memo] - Optional memo.
   * @param {Object} [scope] - Optional scope to execute the callback in.
   */
  const foldl = (list, callback, memo, scope) =>
  _.foldl(list, callback, memo, scope);

  /**
   * The right-associative version of reduce/foldl.
   *
   * @param {Array|Object} list Array or collection to iterate over.
   * @param {Function} callback Callback function to execute for each item.
   * @param {any} [memo] - Optional memo.
   * @param {Object} [scope] - Optional scope to execute the callback in.
   */
  const foldr = (list, callback, memo, scope) =>
  _.foldr(list, callback, memo, scope);

  /**
   * Looks through each value in `list`, returning an array of
   * all the values that pass a truth test (`predicate`).
   * @param list The collection or array to filter.
   * @param predicate The truth test to apply.
   * @param scope `this` object in `predicate`, optional.
   * @returns The set of values that pass the truth test.
   */
    const filter = (list, predicate, scope) =>
      _.filter(list, predicate, scope);

  /**
   * Returns the values in `list` without the elements that pass a
   * truth test (`predicate`).
   * The opposite of filter.
   * @param list The collection or array to filter.
   * @param predicate The truth test to apply.
   * @param scope `this` object in `predicate`, optional.
   * @returns The set of values that fail the truth test.
   */
  const reject = (list, predicate, scope) =>
    _.reject(list, predicate, scope);

  /**
   * Produces a new array of values by mapping each value in list through a transformation function (mapper). 
   * The iteratee is passed three arguments: the value, then the index (or key) of the iteration, and finally a reference to the entire list.
   *
   * @method map
   * @param {Array|Object} list List of items to iterate.
   * @param {Function} mapper Function to call for each item. It's return value will be the new value.
   * @return {Array} Array with new values based on function return values.
   */
const map = (list, mapper, scope = null) =>
  _.map(list, mapper, scope);

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
 * Executes the specified function for each item in an object tree.
 *
 * @method walk
 * @param {Object} node Tree item to traverse.
 * @param {Function} callback Function to call for each item.
 * @param {String} [propName] Optional name of collection inside the item to walk, for example `childNodes`.
 * @param {Object} [scope] - Optional scope to execute the function in.
 */
const walk = (node, callback, propName, scope) => {
  scope = scope || node;

  if (node) {
    if (propName) {
      node = o[propName];
    }

    _.each(node, (o, i) => {
      if (callback.call(scope, o, i, propName) === false) {
        return false;
      } else {
        walk(o, callback, propName, scope);
        return true;
      }
    });
  }
};

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
  foldl,
  foldr,
  filter,
  reject,
  map,
  makeMap,
  isArrayLike,
  walk
};
