import Type from '../core/Type';
import Obj from '../core/Obj';
import Convert from '../core/Convert';
import dom from '../core/dom';
import schema from '../core/schema';
import range from '../core/range';

const isElementNode = (node) =>
  dom.isElement(node) && !dom.isBookmarkNode(node);

const isBlockFormat = (format) =>
  format.block === true || Type.isString(format.block);

const isWrappingBlockFormat = (format) =>
  isBlockFormat(format) && format.wrapper === true;

const isNonWrappingBlockFormat = (format) =>
  isBlockFormat(format) && format.wrapper !== true;

const isSelectorFormat = (format) =>
  Type.isString(format.selector) || Type.isFunction(format.selector);

const isInlineFormat = (format) =>
  format.inline === true || Type.isString(format.inline);

const isMixedFormat = (format) =>
  isSelectorFormat(format) && isInlineFormat(format) && Obj.valueOrDefault(format.mixed, true);

const shouldExpandToSelector = (format) =>
  isSelectorFormat(format) && format.expand !== false && !isInlineFormat(format);

const isEmptyTextNode = (node) =>
  node && dom.isText(node) && node.length === 0;

const isTextBlock = (node) =>
  !!schema.getTextBlockElements()[node.nodeName.toLowerCase()];

/**
 * Returns the next/previous non whitespace node.
 *
 * @private
 * @param {Node} node Node to start at.
 * @param {Boolean} [next] (Optional) Include next or previous node defaults to previous.
 * @param {Boolean} [inc] (Optional) Include the current node in checking. Defaults to false.
 * @return {Node} Next or previous node or undefined if it wasn't found.
 */
const getNonWhiteSpaceSibling = (node, next, inc) => {
  if (node) {
    const nextName = next ? 'nextSibling' : 'previousSibling';

    for (node = inc ? node : node[nextName]; node; node = node[nextName]) {
      if (dom.isElement(node) || !dom.isWhiteSpace(node)) {
        return node;
      }
    }
  }
  return undefined;
};

const replaceVars = (value, vars = null) => {
  if (Type.isFunction(value)) {
    return value(vars);
  } 
  else if (vars) {
    value = value.replace(/%(\w+)/g, (str, name) => {
      return vars[name] || str;
    });
  }
  return value;
};

const getTextDecoration = (node) => {
  let decoration;

  dom.closest(node, (n) => {
    if (dom.isElement(n)) {
      decoration = dom.getStyle(n, 'text-decoration');
      return !!decoration && decoration !== 'none';
    } 
    else {
      return false;
    }
  });

  return decoration;
};

/**
 * Compares two string/nodes regardless of their case.
 *
 * @private
 * @param {String/Node} str1 Node or string to compare.
 * @param {String/Node} str2 Node or string to compare.
 * @return {Boolean} True/false if they match.
 */
const isEq = (str1, str2) => {
  str1 = str1 || '';
  str2 = str2 || '';

  str1 = '' + (str1?.nodeName || str1);
  str2 = '' + (str2?.nodeName || str2);

  return str1.toLowerCase() === str2.toLowerCase();
};

const normalizeStyleValue = (value, name) => {
  if (Type.isNullOrUndefined(value)) {
    return null;
  } 
  else {
    let strValue = String(value);

    // Force the format to hex
    if (name === 'color' || name === 'backgroundColor') {
      strValue = Convert.rgbaToHexString(strValue);
    }

    // Opera/Chrome will return bold as 700
    if (name === 'fontWeight') {
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        if (numValue >= 500) strValue = 'bold';
        else if (numValue >= 400) strValue = 'normal';
        else strValue = 'light';
      }
    }

    // Normalize fontFamily so "'Font name', Font" becomes: "Font name,Font"
    if (name === 'fontFamily') {
      strValue = strValue.replace(/[\'\"]/g, '').replace(/,\s+/g, ',');
    }

    return strValue;
  }
};

const getStyle = (node, name) => {
  const style = dom.getStyle(node, name);
  return normalizeStyleValue(style, name);
};

const preserveSelection = (editor, rng, action) => {
  // Remember selection points before applying format
  const pts = rng.getPoints();

  // Apply stuff to range
  action();

  let rngAfter;
  if (pts.sc == pts.ec) {
    rngAfter = range.createFromNode(pts.sc);
  }
  else {
    rngAfter = range.create(pts.sc, pts.so, pts.ec, pts.eo);
  }

  editor.selection.setRange(rngAfter);
};

const afterFormat = (editor) => {
  editor.normalizeContent();
  editor.history.recordUndo();
  editor.context.triggerEvent('change', editor.$editable);
};

export default {
  isElementNode,
  isInlineFormat,
  isBlockFormat,
  isMixedFormat,
  shouldExpandToSelector,
  isWrappingBlockFormat,
  isNonWrappingBlockFormat,
  isSelectorFormat,
  isEmptyTextNode,
  isTextBlock,
  getNonWhiteSpaceSibling,
  replaceVars,
  isEq,
  normalizeStyleValue,
  getTextDecoration,
  getStyle,
  preserveSelection,
  afterFormat
}