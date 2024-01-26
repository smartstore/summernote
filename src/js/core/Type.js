import _ from 'underscore';

const isArguments = obj => _.isArguments(obj);
const isArray = obj => _.isArray(obj);
const isArrayBuffer = obj => _.isArrayBuffer(obj);
const isBoolean = obj => _.isBoolean(obj);
const isDataView = obj => _.isDataView(obj);
const isDate = obj => _.isDate(obj);
const isElement = obj => _.isElement(obj);
const isError = obj => _.isError(obj);
const isFunction = obj => _.isFunction(obj);
const isFinite = obj => _.isFinite(obj);
const isNaN = obj => _.isNaN(obj);
const isNull = obj => obj === null;
const isNullOrUndefined = obj => obj === undefined || obj === null;
const isAssigned = obj => obj != undefined && obj != null;
const isNumber = obj => _.isNumber(obj);
const isObject = obj => _.isObject(obj);
const isRegExp = obj => _.isRegExp(obj);
const isString = obj => _.isString(obj);
const isSymbol = obj => _.isSymbol(obj);
const isTypedArray = obj => _.isTypedArray(obj);
const isUndefined = obj => _.isUndefined(obj);
const isJquery = obj => obj instanceof jQuery;

// lists
//const isEmpty = (obj) => _.isEmpty(obj);

export default {
  isArguments,
  isArray,
  isArrayBuffer,
  isBoolean,
  isDataView,
  isDate,
  isElement,
  isError,
  isFunction,
  isFinite,
  isNaN,
  isNull,
  isNullOrUndefined,
  isAssigned,
  isNumber,
  isObject,
  isRegExp,
  isString,
  isSymbol,
  isTypedArray,
  isUndefined,
  isJquery
}