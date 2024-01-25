import func from '../core/func';
import lists from '../core/lists';
import dom from '../core/dom';
import schema from '../core/schema';

const isNode = (node) =>
  dom.isNode(node);

const isElementNode = (node) =>
  dom.isElement(node) && !dom.isBookmarkNode(node);

const isElementDirectlySelected = (node) => {
  // Table cells are a special case and are separately handled from native editor selection
  if (isElementNode(node) && !/^(TD|TH)$/.test(node.nodeName)) {
    const selectedAttr = dom.getAttr(node, 'data-note-selected');
    const value = parseInt(selectedAttr, 10);
    // Avoid cases where data-note-selected is not a positive number e.g. inline-boundary
    return !isNaN(value) && value > 0;
  } else {
    return false;
  }
};

const isBlockFormat = (format) =>
  func.isString(format.block);

const isWrappingBlockFormat = (format) =>
  isBlockFormat(format) && format.wrapper === true;

const isNonWrappingBlockFormat = (format) =>
  isBlockFormat(format) && format.wrapper !== true;

const isSelectorFormat = (format) =>
  func.isString(format.selector);

const isInlineFormat = (format) =>
  func.isString(format.inline);

const isMixedFormat = (format) =>
  isSelectorFormat(format) && isInlineFormat(format) && func.valueOrDefault(format.mixed, true);

const shouldExpandToSelector = (format) =>
  isSelectorFormat(format) && format.expand !== false && !isInlineFormat(format);

const isEmptyTextNode = (node) =>
  node && dom.isText(node) && node.length === 0;

const isTextBlock = (node) =>
  !!schema.getTextBlockElements()[node.nodeName.toLowerCase()];

const isValid = (parent, child) =>
  schema.isValidChild(parent, child);

const isWhiteSpaceNode = (node, allowSpaces = false) => {
  if (node && dom.isText(node)) {
    // If spaces are allowed, treat them as a non-breaking space
    const data = allowSpaces ? node.data.replace(/ /g, '\u00a0') : node.data;
    return func.isWhitespaceText(data);
  } else {
    return false;
  }
};

const replaceVars = (value, vars = null) => {
  if (func.isFunction(value)) {
    return value(vars);
  } else if (vars) {
    value = value.replace(/%(\w+)/g, (str, name) => {
      return vars[name] || str;
    });
  }
  return value;
};

const normalizeStyleValue = (value, name) => {
  if (!value) {
    return null;
  } else {
    let strValue = String(value);

    // Force the format to hex
    if (name === 'color' || name === 'backgroundColor') {
      // TODO: Implement rgbaToHexString
      //strValue = Transformations.rgbaToHexString(strValue);
    }

    // Opera will return bold as 700
    if (name === 'fontWeight' && value === 700) {
      strValue = 'bold';
    }

    // Normalize fontFamily so "'Font name', Font" becomes: "Font name,Font"
    if (name === 'fontFamily') {
      strValue = strValue.replace(/[\'\"]/g, '').replace(/,\s+/g, ',');
    }

    return strValue;
  }
};

const isFormatPredicate = (editor, formatName, pred) => {
  const formats = editor.formatter.get(formatName);
  return formats && lists.exists(formats, pred);
};

const isVariableFormatName = (editor, formatName) => {
  const hasVariableValues = format => {
    const isVariableValue = val => func.isFunction(val) || val.length > 1 && val.charAt(0) === '%';
    return lists.exists(['styles', 'attributes'], key => format[key].exists(field => {
      const fieldValues = Array.isArray(field) ? field : values(field);
      return lists.exists(fieldValues, isVariableValue);
    }));
  };

  return isFormatPredicate(editor, formatName, hasVariableValues);
};

const areSimilarFormats = (editor, formatName, otherFormatName) => {
  return false;
  // // Note: MatchFormat.matchNode() uses these parameters to check if a format matches a node
  // // Therefore, these are ideal to check if two formats are similar
  // const validKeys = [ 'inline', 'block', 'selector', 'attributes', 'styles', 'classes' ];
  // const filterObj = (format) => Obj.filter(format, (_, key) => lists.exists(validKeys, (validKey) => validKey === key));
  // return isFormatPredicate(editor, formatName, (fmt1) => {
  //   const filteredFmt1 = filterObj(fmt1);
  //   return isFormatPredicate(editor, otherFormatName, (fmt2) => {
  //     const filteredFmt2 = filterObj(fmt2);
  //     return Obj.equal(filteredFmt1, filteredFmt2);
  //   });
  // });
};

// TODO: Implement getStyle, getTextDecoration, getParents, areSimilarFormats

export default {
  isNode,
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
  isValid,
  isWhiteSpaceNode,
  replaceVars,
  normalizeStyleValue,
  isVariableFormatName,
  areSimilarFormats
}