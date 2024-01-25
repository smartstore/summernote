import $ from 'jquery';

const WHITESPACE_PATTERN = /\s/;
const HOST_PATTERN = /^(?!-)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,6}$/;
const IP_PATTERN = /^(([01]?[0-9]?[0-9]|2([0-4][0-9]|5[0-5]))\.){3}([01]?[0-9]?[0-9]|2([0-4][0-9]|5[0-5]))$/;
const PROTOCOL_PATTERN = /^[A-Za-z][A-Za-z0-9+-.]*\:[\/\/]?/;
const MAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const TEL_PATTERN = /^(\+?\d{1,3}[\s-]?)?(\d{1,4})[\s-]?(\d{1,4})[\s-]?(\d{1,4})$/;

/**
 * @class core.func
 *
 * func utils (for high-order func's arg)
 *
 * @singleton
 * @alternateClassName func
 */
function eq(itemA) {
  return function(itemB) {
    return itemA === itemB;
  };
}

function eq2(itemA, itemB) {
  return itemA === itemB;
}

function peq2(propName) {
  return function(itemA, itemB) {
    return itemA[propName] === itemB[propName];
  };
}

function ok() {
  return true;
}

function fail() {
  return false;
}

function not(f) {
  return function() {
    return !f.apply(f, arguments);
  };
}

function and(fA, fB) {
  return function(item) {
    return fA(item) && fB(item);
  };
}

function self(a) {
  return a;
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
 * returns bnd (bounds) from rect
 *
 * - IE Compatibility Issue: http://goo.gl/sRLOAo
 * - Scroll Issue: http://goo.gl/sNjUc
 *
 * @param {Rect} rect
 * @return {Object} bounds
 * @return {Number} bounds.top
 * @return {Number} bounds.left
 * @return {Number} bounds.width
 * @return {Number} bounds.height
 */
function rect2bnd(rect) {
  const $document = $(document);
  return {
    top: rect.top + $document.scrollTop(),
    left: rect.left + $document.scrollLeft(),
    width: rect.right - rect.left,
    height: rect.bottom - rect.top,
  };
}

/**
 * returns a copy of the object where the keys have become the values and the values the keys.
 * @param {Object} obj
 * @return {Object}
 */
function invertObject(obj) {
  const inverted = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      inverted[obj[key]] = key;
    }
  }
  return inverted;
}

/**
 * @param {String} namespace
 * @param {String} [prefix]
 * @return {String}
 */
function namespaceToCamel(namespace, prefix) {
  prefix = prefix || '';
  return prefix + namespace.split('.').map(function(name) {
    return name.substring(0, 1).toUpperCase() + name.substring(1);
  }).join('');
}

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 * @param {Function} func
 * @param {Number} wait
 * @param {Boolean} immediate
 * @return {Function}
 */
function debounce(func, wait, immediate) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    const later = () => {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    }
  };
}

/**
 *
 * @param {String} str
 * @return {Boolean}
 */
function hasWhiteSpace(str) {
  return str && WHITESPACE_PATTERN.test(str);
}

/**
 * @param {String} host
 * @return {Boolean}
 */
function isValidHost(host) {
  return host && (HOST_PATTERN.test(host) || IP_PATTERN.test(host));
}

/**
 * @param {String} email
 * @return {Boolean}
 */
function isValidEmail(email) {
  return email && MAIL_PATTERN.test(email);
}

/**
 * @param {String} tel
 * @return {Boolean}
 */
function isValidTel(tel) {
  return tel && TEL_PATTERN.test(tel);
}

/**
 * @param {String} url
 * @return {Boolean}
 */
function startsWithUrlScheme(url) {
  return url && PROTOCOL_PATTERN.test(url);
}

/**
 * @param {String} url
 * @return {Boolean}
 */
function isValidUrl(url) {
  return url && (PROTOCOL_PATTERN.test(url) || isValidHost(url));
}

/**
 * Check if test matches strOrPattern  
 * @param {String|RegExp} strOrPattern
 * @param {String} test
 * @return {boolean}
 */
function matches(strOrPattern, test) {
  return strOrPattern instanceof RegExp ? strOrPattern.test(test) : strOrPattern == test;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isNumber(val) {
  return typeof val === 'number';
}

function isString(val) {
  return typeof val === 'string';
}

function constant(val) {
  return () => val;
}

const checkRange = (str, substr, start) =>
  substr === '' || str.length >= substr.length && str.substr(start, start + substr.length) === substr;

function startsWith(str, prefix) {
  return checkRange(str, prefix, 0);
}

function endsWith(str, suffix) {
  return checkRange(str, suffix, str.length - suffix.length);
}

function valueOrDefault(value, def) {
  return value === undefined || value === null ? def : value;
}

const whiteSpaceRegExp = /^[ \t\r\n]*$/;
function isWhitespaceText(text) {
  return whiteSpaceRegExp.test(text);
}

/**
 * Checksa whether given object has a particular property.
 * @param {Object} obj - Object to check
 * @param {String} propName - Property name to check.
 */
function has(obj, propName) {
  return obj && obj.hasOwnProperty(propName);
}

function isFunction(value) {
  return typeof value === 'function';
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
  invoke,
  resetUniqueId,
  uniqueId,
  rect2bnd,
  invertObject,
  namespaceToCamel,
  debounce,
  isValidHost,
  isValidEmail,
  isValidTel,
  startsWithUrlScheme,
  isValidUrl,
  hasWhiteSpace,
  matches,
  clamp,
  isNumber,
  isString,
  constant,
  startsWith,
  endsWith,
  valueOrDefault,
  isWhitespaceText,
  has,
  isFunction
};
