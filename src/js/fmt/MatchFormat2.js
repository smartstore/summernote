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
        return true;
      }
    }
  }

  return false;
};

const matchParents = (editor, node, name, vars = null) => {
  // Find first node with similar format settings
  const matchedNode = dom.closest(node, (elm) => {
    if (matchesUnInheritedFormatSelector(editor, elm, name)) {
      return true;
    }

    return !!matchNode(editor, elm, name, vars);
  });

  return matchedNode;
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
    // Check each format in list
    for (let i = 0; i < formatList.length; i++) {
      const format = formatList[i];
      
      // Custom match
      if (Type.isFunction(format.onmatch)) {
        // onmatch is generic in a way that we can't really express without casting
        return format.onmatch(node, format);
      }

      // Match name, attributes, styles and classes
      if (matchName(node, format) && matchItems(node, format, 'attributes', vars)) {
        const stylesMatch = matchItems(node, format, 'styles', vars);
        const isMatch = format.compound ? stylesMatch && classesMatch(format) : stylesMatch || classesMatch(format);

        if (isMatch) {
          return format;
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

  // // Check selected node
  // node = editor.selection.getNode();
  // if (matchParents(editor, node, name, vars)) {
  //   return true;
  // }

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