import func from './func';

const isArrayLike = (o) => o.length !== undefined;

/**
 * returns the first item of an array.
 *
 * @param {Array} array
 */
function head(array) {
  return array[0];
}

/**
 * returns the last item of an array.
 *
 * @param {Array} array
 */
function last(array) {
  return array[array.length - 1];
}

/**
 * returns everything but the last entry of the array.
 *
 * @param {Array} array
 */
function initial(array) {
  return array.slice(0, array.length - 1);
}

/**
 * returns the rest of the items in an array.
 *
 * @param {Array} array
 */
function tail(array) {
  return array.slice(1);
}

/**
 * returns first found item
 */
function find(array, pred) {
  for (let idx = 0, len = array.length; idx < len; idx++) {
    const item = array[idx];
    if (pred(item)) {
      return item;
    }
  }
}

/**
 * Returns index of first found item or -1.
 */
function findIndex(array, pred) {
  scope = scope || array;
  for (let i = 0, l = array.length; i < l; i++) {
    if (pred(array[i], i, array)) {
      return i;
    }
  }

  return -1;
}

/**
 * returns true if all of the values in the array pass the predicate truth test.
 */
function all(array, pred) {
  for (let idx = 0, len = array.length; idx < len; idx++) {
    if (!pred(array[idx])) {
      return false;
    }
  }
  return true;
}

/**
 * returns true if the value is present in the list.
 */
function contains(array, item) {
  if (array && array.length && item) {
    if (array.indexOf) {
      return array.indexOf(item) !== -1;
    } else if (array.contains) {
      // `DOMTokenList` doesn't implement `.indexOf`, but it implements `.contains`
      return array.contains(item);
    }
  }
  return false;
}

/**
 * get sum from a list
 *
 * @param {Array} array - array
 * @param {Function} fn - iterator
 */
function sum(array, fn) {
  fn = fn || func.self;
  return array.reduce(function(memo, v) {
    return memo + fn(v);
  }, 0);
}

/**
 * Returns an array copy of an array-like collection.
 * @param {Collection} collection - collection e.g. node.childNodes, ...
 */
function from(collection) {
  const result = [];
  const length = collection.length;
  let idx = -1;
  while (++idx < length) {
    result[idx] = collection[idx];
  }
  return result;
}

/**
 * returns whether collection is empty or not
 */
function isEmpty(array) {
  return !array || !array.length;
}

/**
 * cluster elements by predicate function.
 *
 * @param {Array} array - array
 * @param {Function} fn - predicate function for cluster rule
 * @param {Array[]}
 */
function clusterBy(array, fn) {
  if (!array.length) { return []; }
  const aTail = tail(array);
  return aTail.reduce(function(memo, v) {
    const aLast = last(memo);
    if (fn(last(aLast), v)) {
      aLast[aLast.length] = v;
    } else {
      memo[memo.length] = [v];
    }
    return memo;
  }, [[head(array)]]);
}

/**
 * returns a copy of the array with all false values removed
 *
 * @param {Array} array - array
 * @param {Function} fn - predicate function for cluster rule
 */
function compact(array) {
  const aResult = [];
  for (let idx = 0, len = array.length; idx < len; idx++) {
    if (array[idx]) { aResult.push(array[idx]); }
  }
  return aResult;
}

/**
 * produces a duplicate-free version of the array
 *
 * @param {Array} array
 */
function unique(array) {
  const results = [];

  for (let idx = 0, len = array.length; idx < len; idx++) {
    if (!contains(results, array[idx])) {
      results.push(array[idx]);
    }
  }

  return results;
}

/**
 * returns next item.
 * @param {Array} array
 */
function next(array, item) {
  if (array && array.length && item) {
    const idx = array.indexOf(item);
    return idx === -1 ? null : array[idx + 1];
  }
  return null;
}

/**
 * returns prev item.
 * @param {Array} array
 */
function prev(array, item) {
  if (array && array.length && item) {
    const idx = array.indexOf(item);
    return idx === -1 ? null : array[idx - 1];
  }
  return null;
}

  /**
   * Performs an iteration of all items in a collection such as an object or array. This method will execute the
   * callback function for each item in the collection, if the callback returns false the iteration will terminate.
   * The callback has the following format: `cb(value, key_or_index)`.
   *
   * @method each
   * @param {Array|Object} collection Array or collection to iterate over.
   * @param {Function} callback Callback function to execute for each item.
   * @param {Object} scope Optional scope to execute the callback in.
   */
function each(collection, callback, scope = null) {
  if (!collection) {
    return false;
  }

  scope = scope || collection;

  if (isArrayLike(collection)) {
    // Indexed arrays
    for (let n = 0, l = o.length; n < l; n++) {
      if (callback?.call(scope, collection[n], n, collection) === false) {
        return false;
      }
    }
  } else {
    // Plain objects
    for (const n in collection) {
      if (collection.hasOwnProperty(n)) {
        if (callback?.call(scope, collection[n], n, collection) === false) {
          return false;
        }
      }
    }
  }

  return true;
}

  /**
   * Creates a new array by the return value of each iteration function call. This enables you to convert
   * one array list into another.
   *
   * @method map
   * @param {Array} array Array of items to iterate.
   * @param {Function} callback Function to call for each item. It's return value will be the new value.
   * @return {Array} Array with new values based on function return values.
   */
function map(array, callback) {
  const out = [];

  each(array, (item, index) => {
    out.push(callback(item, index, array));
  });

  return out;
}

/**
 * Splits a string but removes the whitespace before and after each value.
 *
 * @method explode
 * @param {String|Array} s String to split.
 * @param {String|RegExp} d Delimiter to split by.
 * @example
 * // Split a string into an array with [a,b,c]
 * const arr = func.explode('a, b,   c');
 */
function explode(s, d = null) {
  if (Array.isArray(s)) {
    return s;
  } else if (s === '') {
    return [];
  } else {
    return map(s.split(d || ','), x => x.trim());
  }
}

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
  const resolvedItems = func.isString(items) ? items.split(delim || ',') : (items || []);
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
  find,
  findIndex,
  contains,
  all,
  sum,
  from,
  isEmpty,
  clusterBy,
  compact,
  unique,
  each,
  map,
  explode,
  makeMap
};
