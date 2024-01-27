import _ from 'underscore';

/**
 * @class core.func
 *
 * func utils (for high-order func's arg)
 *
 * @singleton
 * @alternateClassName func
 */
const eq = (itemA) => {
  return function(itemB) {
    return itemA === itemB;
  };
}

const eq2 = (itemA, itemB) =>
  itemA === itemB;

const peq2 = (propName) => {
  return function(itemA, itemB) {
    return itemA[propName] === itemB[propName];
  };
}

const ok = () => true;
const fail = () => false;
const self = (a) => a;

function not(f) {
  return function() {
    return !f.apply(f, arguments);
  };
}

function and(...functions) {
  const funcs = functions;
  const len = funcs.length;
  if (len === 0) return false;
  return function(item) {
    for (var i = 0; i < len; i++) {
      if (funcs[i] && !funcs[i](item)) {
        return false;
      }
    }

    return true;
  };
}

function or(...functions) {
  const funcs = functions;
  const len = funcs.length;
  if (len === 0) return false;
  return function(item) {
    for (var i = 0; i < len; i++) {
      if (funcs[i] && funcs[i](item)) {
        return true;
      }
    }

    return false;
  };
}

function invoke(obj, method) {
  return function() {
    return obj[method].apply(obj, arguments);
  };
}

let idCounter = 0;

/**
 * reset globally-unique id
 *
 */
function resetUniqueId() {
  idCounter = 0;
}

/**
 * generate a globally-unique id
 *
 * @param {String} [prefix]
 */
function uniqueId(prefix) {
  const id = ++idCounter + '';
  return prefix ? prefix + id : id;
}

/**
 * Creates and returns a new debounced version of the passed function which will postpone its execution until after wait milliseconds 
 * have elapsed since the last time it was invoked. Useful for implementing behavior that should only happen after the 
 * input has stopped arriving. For example: rendering a preview of a Markdown comment, 
 * recalculating a layout after the window has stopped being resized, and so on.
 *
 * At the end of the wait interval, the function will be called with the arguments that were passed most recently to the debounced function.
 *
 * Pass true for the immediate argument to cause debounce to trigger the function on the 
 * leading instead of the trailing edge of the wait interval. 
 * Useful in circumstances like preventing accidental double-clicks on a "submit" button from firing a second time.
 * @param {Function} func
 * @param {Number} wait
 * @param {Boolean} immediate
 * @return {Function}
 */
const debounce = (func, wait, immediate) =>
  _.debounce(func, wait, immediate);

const delay = (func, wait, args) =>
  _.delay(func, wait, args);

const defer = (func, args) =>
  _.defer(func, args);

/**
 * Creates and returns a new, throttled version of the passed function, that, when invoked repeatedly, 
 * will only actually call the original function at most once per every wait milliseconds.
 * 
 * By default, throttle will execute the function as soon as you call it for the first time, and, 
 * if you call it again any number of times during the wait period, as soon as that period is over. 
 * If you'd like to disable the leading-edge call, pass {leading: false}, and if you'd like to disable the execution on the trailing-edge, pass
 * {trailing: false}
 * @param {Function} func
 * @param {Number} wait
 * @param {Object|null} options
 * @return {Function}
 */
const throttle = (func, wait, options) =>
  _.throttle(func, wait, options);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function constant(val) {
  return () => val;
}

export default {
  eq,
  eq2,
  peq2,
  ok,
  fail,
  self,
  not,
  and,
  or,
  invoke,
  resetUniqueId,
  uniqueId,
  debounce,
  delay,
  defer,
  throttle,
  clamp,
  constant,
};
