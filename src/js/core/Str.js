import _ from 'underscore';
import Type from './Type';

const WHITESPACE_ALL_PATTERN = /^[ \t\r\n]*$/;
const WHITESPACE_PATTERN = /\s/;

const HOST_PATTERN = /^(?!-)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,6}$/;
const IP_PATTERN = /^(([01]?[0-9]?[0-9]|2([0-4][0-9]|5[0-5]))\.){3}([01]?[0-9]?[0-9]|2([0-4][0-9]|5[0-5]))$/;
const PROTOCOL_PATTERN = /^[A-Za-z][A-Za-z0-9+-.]*\:[\/\/]?/;
const MAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const TEL_PATTERN = /^(\+?\d{1,3}[\s-]?)?(\d{1,4})[\s-]?(\d{1,4})[\s-]?(\d{1,4})$/;

const checkRange = (str, substr, start) =>
  substr === '' || str.length >= substr.length && str.substr(start, start + substr.length) === substr;

const startsWith = (str, prefix) => checkRange(str, prefix, 0);
const endsWith = (str, suffix) => checkRange(str, suffix, str.length - suffix.length);
const escape = (str) => _.escape(str);
const unescape = (str) => _.unescape(str);
const hasWhiteSpace = (str) => WHITESPACE_PATTERN.test(str);
const isAllWhitespace = (str) => WHITESPACE_ALL_PATTERN.test(str);

/**
 * Check if test matches strOrPattern  
 * @param {String|RegExp} strOrPattern
 * @param {String} test
 * @return {boolean}
 */
const matches = (strOrPattern, test) => 
  Type.isRegExp(strOrPattern) ? strOrPattern.test(test) : strOrPattern == test;

const namespaceToCamel = (namespace, prefix) => {
  prefix = prefix || '';
  return prefix + namespace.split('.').map((name) => {
    return name.substring(0, 1).toUpperCase() + name.substring(1);
  }).join('');
}

const camelCaseToHyphens = (str) =>
  str.replace(/[A-Z]/g, (v) => '-' + v.toLowerCase());

const isValidHost = (host) => 
  host && (HOST_PATTERN.test(host) || IP_PATTERN.test(host));

const isValidEmail = (email) => 
  email && MAIL_PATTERN.test(email);

const isValidTel = (tel) => 
  tel && TEL_PATTERN.test(tel);

const startsWithUrlScheme = (url) => 
  url && PROTOCOL_PATTERN.test(url);

const isValidUrl = (url) => 
  url && (PROTOCOL_PATTERN.test(url) || isValidHost(url));

/**
 * Splits a string but removes the whitespace before and after each value.
 *
 * @method explode
 * @param {String|Array} str String or array to split.
 * @param {String|RegExp} delim Delimiter to split by.
 * @example
 * // Split a string into an array with [a,b,c]
 * const arr = Str.explode('a, b,   c');
 */
const explode = (str, delim = null) => {
  if (Array.isArray(str)) {
    return str;
  } else if (str === '') {
    return [];
  } else {
    return str.split(delim || ',').map(x => x.trim());;
  }
}

export default {
  startsWith,
  endsWith,
  hasWhiteSpace,
  isAllWhitespace,
  escape,
  unescape,
  matches,
  namespaceToCamel,
  camelCaseToHyphens,
  isValidHost,
  isValidEmail,
  isValidTel,
  startsWithUrlScheme,
  isValidUrl,
  explode
}