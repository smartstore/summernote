import Obj from '../core/Obj';
import Type from '../core/Type';
import lists from '../core/lists';
import dom from '../core/dom';

const matchesUnInheritedFormatSelector = (editor, node, name) => {
  const formatList = editor.formatter.get(name);

  if (formatList) {
    for (let i = 0; i < formatList.length; i++) {
      const format = formatList[i];
      if (FormatUtils.isSelectorFormat(format) && format.inherit === false && dom.matches(node, format.selector)) {
        return { node, format };
      }
    }
  }

  return false;
};

const matchParents = (editor, node, name, vars = null) => {
  // Find first node with similar format settings
  let matchedFormat;
  let matchedNode = dom.closest(node, (elm) => {
    let match = matchesUnInheritedFormatSelector(editor, elm, name);
    if (match) {
      matchedFormat = match.format;
      return true;
    }

    match = matchNode(editor, elm, name, vars);
    if (match) {
      matchedFormat = match.format;
      return true;
    }

    return false;
  });

  return !!matchedNode ? { node: matchedNode, format: matchedFormat } : undefined;
};

const matchName = (node, format) => {
  // Check for inline match
  if (FormatUtils.isInlineFormat(format) && ((format.inline === true && dom.isInline(node)) || isEq(node, format.inline))) {
    return true;
  }

  // Check for block match
  if (FormatUtils.isBlockFormat(format) && ((format.block === true && dom.isBlock(node)) || isEq(node, format.block))) {
    return true;
  }

  // Check for selector match
  if (FormatUtils.isSelectorFormat(format)) {
    return dom.isElement(node) && dom.matches(node, format.selector);
  }

  return false;
};

const matchItems = (node, format, itemName = 'attributes' | 'styles', vars = null) => {
  const items = format[itemName];
  const matchAttributes = itemName === 'attributes';

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

          if (!isEq(value, FormatUtils.normalizeStyleValue(expectedValue, key))) {
            return false;
          }
        }
      }
    } 
    else {
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

const matchNode = (editor, node, name, vars = null) => {
  const formatList = editor.formatter.get(name);

  const classesMatch = (fmt) => {
    const classes = fmt.classes;
    if (classes) {
      for (let i = 0; i < classes.length; i++) {
        if (!node.classList.contains(FormatUtils.replaceVars(classes[i], vars))) {
          return false;
        }
      }
    }

    return true;
  };

  if (formatList && dom.isElement(node)) {
    let isMatch;

    // Check each format in list
    for (let i = 0; i < formatList.length; i++) {
      const format = formatList[i];
      
      // Custom match
      if (Type.isFunction(format.onmatch)) {
        // onmatch is generic in a way that we can't really express without casting
        isMatch = format.onmatch(node, format);
        return isMatch ? { node, format } : undefined;
      }

      // Match name, attributes, styles and classes
      if (matchName(node, format) && matchItems(node, format, 'attributes', vars)) {
        const stylesMatch = matchItems(node, format, 'styles', vars);
        isMatch = format.compound ? stylesMatch && classesMatch(format) : stylesMatch || classesMatch(format);

        if (isMatch) {
          return { node, format };
        }     
      }
    }
  }

  return undefined;
};

const match = (editor, node, name, vars = null) => {
  // Check specified node
  if (node) {
    return matchParents(editor, node, name, vars);
  }

  // Check selected start node
  //node = editor.selection.getNode();
  node = editor.selection.getRange().startContainer;

  let match = matchParents(editor, node, name, vars);
  if (match) {
    return match;
  }

  // // Check start node if it's different
  // const startNode = editor.selection.getStart();
  // if (startNode !== node) {
  //   if (matchParents(editor, startNode, name, vars)) {
  //     return true;
  //   }
  // }

  return false;
}

export default {
  match
}