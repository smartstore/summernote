import Obj from '../core/Obj';
import Type from '../core/Type';
import lists from '../core/lists';
import dom from '../core/dom';
import FormatUtils from './FormatUtils';

const isEq = FormatUtils.isEq;

const matchesUnInheritedFormatSelector = (editor, node, name) => {
  const formatList = editor.formatter.get(name);

  if (formatList) {
    for (let i = 0; i < formatList.length; i++) {
      const format = formatList[i];
      if (FormatUtils.isSelectorFormat(format) && format.inherit === false && dom.matches(node, format.selector)) {
        return true;
      }
    }
  }

  return false;
};

const matchParents = (editor, node, name, vars, similar) => {
  // Find first node with similar format settings
  const matchedNode = dom.closest(node, (elm) => {
    if (matchesUnInheritedFormatSelector(editor, elm, name)) {
      return true;
    }

    return !!matchNode(editor, elm, name, vars, true);
  });

  // Do an exact check on the similar format element
  return !!matchNode(editor, matchedNode, name, vars, similar);
};

const matchName = (node, format) => {
  // Check for inline match
  if (FormatUtils.isInlineFormat(format) && isEq(node, format.inline)) {
    return true;
  }

  // Check for block match
  if (FormatUtils.isBlockFormat(format) && isEq(node, format.block)) {
    return true;
  }

  // Check for selector match
  if (FormatUtils.isSelectorFormat(format)) {
    return dom.isElement(node) && dom.matches(node, format.selector);
  }

  return false;
};

const matchItems = (node, format, itemName = 'attributes' | 'styles', similar = false, vars = null) => {
  const items = format[itemName];
  const matchAttributes = itemName === 'attributes';

  // Custom match
  if (Type.isFunction(format.onmatch)) {
    // onmatch is generic in a way that we can't really express without casting
    return format.onmatch(node, format, itemName);
  }

  // Check all items
  if (items) {
    // Non indexed object
    if (!lists.isArrayLike(items)) {
      for (const key in items) {
        if (Obj.has(items, key)) {
          const value = matchAttributes ? dom.getAttr(node, key) : FormatUtils.getStyle(node, key);
          const expectedValue = FormatUtils.replaceVars(items[key], vars);
          const isEmptyValue = Type.isNullOrUndefined(value) || value == '';

          if (isEmptyValue && Type.isNullOrUndefined(expectedValue)) {
            continue;
          }

          if (similar && isEmptyValue && !format.exact) {
            return false;
          }

          if ((!similar || format.exact) && !isEq(value, FormatUtils.normalizeStyleValue(expectedValue, key))) {
            return false;
          }
        }
      }
    } else {
      // Only one match needed for indexed arrays
      for (let i = 0; i < items.length; i++) {
        if (matchAttributes ? dom.getAttr(node, items[i]) : FormatUtils.getStyle(node, items[i])) {
          return true;
        }
      }
    }
  }

  return true;
};

const matchNode = (editor, node, name, vars, similar) => {
  const formatList = editor.formatter.get(name);

  const classesMatch = (fmt) => {
    const classes = fmt.classes;
    if (classes) {
      for (let x = 0; x < classes.length; x++) {
        if (!dom.hasClass(node, FormatUtils.replaceVars(classes[x], vars))) {
          return false;
        }
      }
    }

    return true;
  };

  if (formatList && dom.isElement(node)) {
    // Check each format in list
    for (let i = 0; i < formatList.length; i++) {
      const format = formatList[i];
      
      // Match name, attributes, styles and classes
      if (matchName(node, format) && matchItems(node, format, 'attributes', similar, vars)) {
        const stylesMatch = matchItems(node, format, 'styles', false, vars);
        const isMatch = format.compound ? stylesMatch && classesMatch(format) : stylesMatch || classesMatch(format);

        if (isMatch) {
          return format;
        }     
      }
    }
  }

  return undefined;
};

const match = (editor, name, vars, node, similar) => {
  // Check specified node
  if (node) {
    return matchParents(editor, node, name, vars, similar);
  }

  // Check selected node
  node = editor.selection.getNode();
  if (matchParents(editor, node, name, vars, similar)) {
    return true;
  }

  // Check start node if it's different
  const startNode = editor.selection.getStart();
  if (startNode !== node) {
    if (matchParents(editor, startNode, name, vars, similar)) {
      return true;
    }
  }

  return false;
};

const matchAll = (editor, names, vars) => {
  const matchedFormatNames = [];
  const checkedMap = {};
  
  // Check start of selection for formats
  const startElement = editor.selection.getStart();

  dom.closest(startElement, (node) => {
    for (let i = 0; i < names.length; i++) {
      const name = names[i];

      if (!checkedMap[name] && matchNode(editor, node, name, vars)) {
        checkedMap[name] = true;
        matchedFormatNames.push(name);
      }
    }
  });

  return matchedFormatNames;
};

const closest = (editor, names) => {
  // TODO: Implement MatchFormat.closest() ?
  return null;
};

const canApply = (editor, name) => {
  const formatList = editor.formatter.get(name);

  if (formatList && editor.selection.isEditable()) {
    const startNode = editor.selection.getStart();
    const parents = dom.parents(startNode);

    for (let x = formatList.length - 1; x >= 0; x--) {
      const format = formatList[x];

      // Format is not selector based then always return TRUE
      if (!FormatUtils.isSelectorFormat(format)) {
        return true;
      }

      for (let i = parents.length - 1; i >= 0; i--) {
        if (dom.matches(parents[i], format.selector)) {
          return true;
        }
      }
    }
  };

  return false;
};

const matchAllOnNode = (editor, node, formatNames) => {
  return lists.foldl(formatNames, (acc, name) => {
    const matchSimilar = FormatUtils.isVariableFormatName(editor, name);
    if (matchNode(node, name, {}, matchSimilar)) {
      return acc.concat([ name ]);
    } else {
      return acc;
    }
  }, []); 
};

export default {
  matchNode,
  matchName,
  match,
  closest,
  matchAll,
  matchAllOnNode,
  canApply,
  matchesUnInheritedFormatSelector
};