import _ from 'underscore';
import Type from './Type';

/**
 * Checks whether given object has a particular property.
 * @param {Object} obj - Object to check
 * @param {String} propName - Property name to check.
 */
const has = (obj, propName) =>
  obj && obj.hasOwnProperty(propName);

/**
 * Returns the specified property of object. path may be specified as a simple key, 
 * or as an array of object keys or array indexes, for deep property fetching. 
 * If the property does not exist or is undefined, the optional default is returned.
 */  
const get = (obj, path, def) =>
  _.get(obj, path, def);

const valueOrDefault = (value, def) => 
  Type.isNullOrUndefined(value) ? def : value;

/**
 * Performs an optimized deep comparison between the two objects, 
 * to determine if they should be considered equal.
 */  
const isEqual = (obj, other) => 
  _.isEqual(obj, other);

/**
 * Tells you if the keys and values in properties are contained in object.
 */  
const isMatch = (obj, props) => 
  _.isMatch(obj, props);

/**
 * Shallowly copy all of the properties in the source objects over to the destination object, 
 * and return the destination object. Any nested objects or arrays will be copied by reference, not duplicated. 
 * It's in-order, so the last source will override properties of the same name in previous arguments.
 */  
const extend = (obj, sources) => 
  _.extendOwn(obj, sources);

/**
 * Returns a copy of the object where the keys have become the values and the values the keys. 
 * For this to work, all of your object's values should be unique and string serializable.
 */  
const invert = (obj) => 
  _.invert(obj);

export default {
  has,
  get,
  valueOrDefault,
  isEqual,
  isMatch,
  extend,
  invert
}