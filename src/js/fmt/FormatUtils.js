import Type from '../core/Type';
import Str from '../core/Str';
import Obj from '../core/Obj';
import Convert from '../core/Convert';
import Point from '../core/Point';
import lists from '../core/lists';
import dom from '../core/dom';
import schema from '../core/schema';
import range from '../core/range';
import DomTreeWalker from '../util/DomTreeWalker';

const isNode = (node) =>
  dom.isNode(node);

const isElementNode = (node) =>
  dom.isElement(node) && !dom.isBookmarkNode(node);

const isCaretNode = (node) => false;

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
  Type.isString(format.block);

const isWrappingBlockFormat = (format) =>
  isBlockFormat(format) && format.wrapper === true;

const isNonWrappingBlockFormat = (format) =>
  isBlockFormat(format) && format.wrapper !== true;

const isSelectorFormat = (format) =>
  Type.isString(format.selector) || Type.isFunction(format.selector);

const isInlineFormat = (format) =>
  Type.isString(format.inline);

const isMixedFormat = (format) =>
  isSelectorFormat(format) && isInlineFormat(format) && Obj.valueOrDefault(format.mixed, true);

const shouldExpandToSelector = (format) =>
  isSelectorFormat(format) && format.expand !== false && !isInlineFormat(format);

const isEmptyTextNode = (node) =>
  node && dom.isText(node) && node.length === 0;

const isTextBlock = (node) =>
  !!schema.getTextBlockElements()[node.nodeName.toLowerCase()];

const isValid = (parent, child) =>
  schema.isValidChild(parent, child);

const isDocument = (node) =>
  dom.isDocumentFragment(node) || dom.isDocument(node);

const isWhiteSpaceNode = (node, allowSpaces = false) => 
  dom.isWhiteSpace(node, allowSpaces);

const isNamedAnchor = (node) => {
  return dom.isElement(node) && node.nodeName === 'A' && !node.hasAttribute('href') && (node.hasAttribute('name') || node.hasAttribute('id'));
};

const hasWhitespacePreserveParent = (node, rootNode) => {
  // const rootElement = SugarElement.fromDom(rootNode);
  // const startNode = SugarElement.fromDom(node);
  // return SelectorExists.ancestor(startNode, 'pre,code', Fun.curry(Compare.eq, rootElement));
};

const isWhitespace = (node, rootNode) => {
  return dom.isText(node) && Str.isAllWhitespace(node.data) && !hasWhitespacePreserveParent(node, rootNode);
};

const isContent = (node, rootNode) => {
  return (isCaretCandidate(node) && !isWhitespace(node, rootNode)) || isNamedAnchor(node) || dom.isBookmarkNode(node);
};

const isInlineContent = (node, root) =>
  Type.isAssigned(node) && (isContent(node, root) || schema.isInline(node.nodeName.toLowerCase()));

const surroundedByInlineContent = (node, root) => {
  const prev = new DomTreeWalker(node, root).prev(false);
  const next = new DomTreeWalker(node, root).next(false);
  // Check if the next/previous is either inline content or the start/end (eg is undefined)
  const prevIsInline = Type.isUndefined(prev) || isInlineContent(prev, root);
  const nextIsInline = Type.isUndefined(next) || isInlineContent(next, root);
  return prevIsInline && nextIsInline;
};

// Keep text nodes with only spaces if surrounded by spans.
// eg. "<p><span>a</span> <span>b</span></p>" should keep space between a and b
const isKeepTextNode = (node, root) =>
  dom.isText(node) && node.data.length > 0 && surroundedByInlineContent(node, root);

// Keep elements as long as they have any children
const isKeepElement = (node) =>
  dom.isElement(node) ? node.childNodes.length > 0 : false;

const isInvalidTextElement = dom.matchNodeNames([ 'script', 'style', 'textarea' ]);
const isAtomicInline = dom.matchNodeNames([ 'img', 'input', 'textarea', 'hr', 'iframe', 'video', 'audio', 'object', 'embed' ]);

// UI components on IE is marked with contenteditable=false and unselectable=true so lets not handle those as real content editables
const isUnselectable = (node) =>
  dom.isElement(node) && node.getAttribute('unselectable') === 'true';

const isNonUiContentEditableFalse = (node) => {
  return !isUnselectable(node) && !dom.isContentEditable(node);
};

const isCaretContainerBlock = (node) => {
  if (dom.isText(node)) {
    node = node.parentNode;
  }

  return dom.isElement(node) && node.hasAttribute('data-note-caret');
};

const isCaretContainerInline = (node) =>
  dom.isText(node) && Point.isZwsp(node.data);

const isCaretContainer = (node) =>
  isCaretContainerBlock(node) || isCaretContainerInline(node);

const isCaretCandidate = (node) => {
  if (isCaretContainer(node)) {
    return false;
  }

  if (dom.isText(node)) {
    return !isInvalidTextElement(node.parentNode);
  }

  return isAtomicInline(node) || dom.isBR(node) || dom.isTable(node) || isNonUiContentEditableFalse(node);
};

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
      if (dom.isElement(node) || !isWhiteSpaceNode(node)) {
        return node;
      }
    }
  }
  return undefined;
};

const replaceVars = (value, vars = null) => {
  if (Type.isFunction(value)) {
    return value(vars);
  } else if (vars) {
    value = value.replace(/%(\w+)/g, (str, name) => {
      return vars[name] || str;
    });
  }
  return value;
};

const isFormatPredicate = (editor, formatName, pred) => {
  const formats = editor.formatter.get(formatName);
  return formats && lists.exists(formats, pred);
};

const isVariableFormatName = (editor, formatName) => {
  const hasVariableValues = format => {
    const isVariableValue = val => Type.isFunction(val) || val.length > 1 && val.charAt(0) === '%';
    return lists.exists(['styles', 'attributes'], key => format[key].exists(field => {
      const fieldValues = Array.isArray(field) ? field : values(field);
      return lists.exists(fieldValues, isVariableValue);
    }));
  };

  return isFormatPredicate(editor, formatName, hasVariableValues);
};

const areSimilarFormats = (editor, formatName, otherFormatName) => {
  // Note: MatchFormat.matchNode() uses these parameters to check if a format matches a node
  // Therefore, these are ideal to check if two formats are similar
  const validKeys = [ 'inline', 'block', 'selector', 'attributes', 'styles', 'classes' ];
  const filterObj = format =>   Obj.filter(format, (_, key) => lists.exists(validKeys, validKey => validKey === key));
  return isFormatPredicate(editor, formatName, fmt1 => {
    const filteredFmt1 = filterObj(fmt1);
    return isFormatPredicate(editor, otherFormatName, fmt2 => {
      const filteredFmt2 = filterObj(fmt2);
      return Obj.isEqual(filteredFmt1, filteredFmt2);
    });
  });
};

const getTextDecoration = (node) => {
  let decoration;

  dom.closest(node, (n) => {
    if (dom.isElement(n)) {
      decoration = dom.getStyle(n, 'text-decoration');
      return !!decoration && decoration !== 'none';
    } else {
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
  } else {
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

// Expands the node to the closes contentEditable false element if it exists
const findParentContentEditable = (node) => {
  let parent = node;

  while (parent) {
    const contentEditable = dom.getContentEditable(parent);
    if (dom.isElement(parent) && contentEditable) {
      return contentEditable === 'false' ? parent : node;
    }

    parent = parent.parentNode;
  }

  return node;
};

// This function walks up the tree if there is no siblings before/after the node.
// If a sibling is found then the container is returned
const findParentContainer = (formatList, container, offset, start) => {
  let parent = container;

  const siblingName = start ? 'previousSibling' : 'nextSibling';
  const root = dom.getEditableRoot(container);

  // If it's a text node and the offset is inside the text
  if (dom.isText(container) && !isWhiteSpaceNode(container)) {
    if (start ? offset > 0 : offset < container.data.length) {
      return container;
    }
  }

  while (parent) {
    // Stop expanding on block elements
    if (!formatList[0].block_expand && dom.isBlock(parent)) {
      return parent;
    }

    // Walk left/right
    for (let sibling = parent[siblingName]; sibling; sibling = sibling[siblingName]) {
      // Allow spaces if not at the edge of a block element, as the spaces won't have been collapsed
      const allowSpaces = dom.isText(sibling) && !isAtBlockBoundary(root, sibling, siblingName);
      if (!isWhiteSpaceNode(sibling, allowSpaces)) {
        return parent;
      }
    }

    // Check if we can move up are we at root level or body level
    if (parent === root || parent.parentNode === root) {
      container = parent;
      break;
    }

    parent = parent.parentNode;
  }

  return container;
};

const findSelectorEndPoint = (formatList, rng, container, siblingName) => {
  const sibling = container[siblingName];
  if (dom.isText(container) && container.data.length === 0 && sibling) {
    container = sibling;
  }

  const parents = dom.parents(container);
  for (let i = 0; i < parents.length; i++) {
    for (let y = 0; y < formatList.length; y++) {
      const curFormat = formatList[y];

      // If collapsed state is set then skip formats that doesn't match that
      if (Type.isAssigned(curFormat.collapsed) && curFormat.collapsed !== rng.collapsed) {
        continue;
      }

      if (isSelectorFormat(curFormat) && dom.matches(parents[i], curFormat.selector)) {
        return parents[i];
      }
    }
  }

  return container;
};

const findBlockEndPoint = (formatList, container, siblingName) => {
  let node = container;
  const root = dom.getEditableRoot(node);
  const format = formatList[0];

  // Expand to block of similar type
  if (isBlockFormat(format)) {
    node = format.wrapper ? null : dom.closest(container, format.block);
  }

  // Expand to first wrappable block element or any block element
  if (!node) {
    const scopeRoot = dom.closest(container, 'LI,TD,TH,SUMMARY') ?? root;
    node = dom.closest(
      dom.isText(container) ? container.parentNode : container,
      // Fixes an issue where it would expand to editable parent element in inline mode
      (node) => node !== scopeRoot && isTextBlock(node)
    );
  }

  // Exclude inner lists from wrapping
  if (node && isBlockFormat(format) && format.wrapper) {
    node = dom.parents(node, 'ul,ol').reverse()[0] || node;
  }

  // Didn't find a block element look for first/last wrappable element
  if (!node) {
    node = container;

    while (node && node[siblingName] && !dom.isBlock(node[siblingName])) {
      node = node[siblingName];

      // Break on BR but include it will be removed later on
      // we can't remove it now since we need to check if it can be wrapped
      if (isEq(node, 'br')) {
        break;
      }
    }
  }

  return node || container;
};

// We're at the edge if the parent is a block and there's no next sibling. Alternatively,
// if we reach the root or can't walk further we also consider it to be a boundary.
const isAtBlockBoundary = (root, container, siblingName) => {
  const parent = container.parentNode;
  if (Type.isAssigned(container[siblingName])) {
    return false;
  } else if (parent === root || Type.isNullOrUndefined(parent) || dom.isBlock(parent)) {
    return true;
  } else {
    return isAtBlockBoundary(root, parent, siblingName);
  }
};

const expandRng = (rng, formatList) => {
  let { startContainer, startOffset, endContainer, endOffset } = rng;
  const format = formatList[0];

  // If index based start position then resolve it
  if (dom.isElement(startContainer) && startContainer.hasChildNodes()) {
    startContainer = dom.getRangeNode(startContainer, startOffset);
    if (dom.isText(startContainer)) {
      startOffset = 0;
    }
  }

  // If index based end position then resolve it
  if (dom.isElement(endContainer) && endContainer.hasChildNodes()) {
    endContainer = dom.getRangeNode(endContainer, rng.collapsed ? endOffset : endOffset - 1);
    if (dom.isText(endContainer)) {
      endOffset = endContainer.data.length;
    }
  }

  // Expand to closest contentEditable element
  startContainer = findParentContentEditable(startContainer);
  endContainer = findParentContentEditable(endContainer);

  // TODO: Implement ExpandRange.isSelfOrParentBookmark() (?)

  if (rng.collapsed) {
    rng = rng.getWordRange({ forward: true });
    startContainer = rng.sc;
    startOffset = rng.so;
    endContainer = rng.ec;
    endOffset = rng.eo;
  }

  // Move start/end point up the tree if the leaves are sharp and if we are in different containers
  // Example * becomes !: !<p><b><i>*text</i><i>text*</i></b></p>!
  // This will reduce the number of wrapper elements that needs to be created
  // Move start point up the tree
  if (isInlineFormat(format) || format.block_expand) {
    if (!isInlineFormat(format) || (!dom.isText(startContainer) || startOffset === 0)) {
      startContainer = findParentContainer(formatList, startContainer, startOffset, true);
    }

    if (!isInlineFormat(format) || (!dom.isText(endContainer) || endOffset === endContainer.data.length)) {
      endContainer = findParentContainer(formatList, endContainer, endOffset, false);
    }
  }

  // Expand start/end container to matching selector
  if (shouldExpandToSelector(format)) {
    // Find new startContainer/endContainer if there is better one
    startContainer = findSelectorEndPoint(formatList, rng, startContainer, 'previousSibling');
    endContainer = findSelectorEndPoint(formatList, rng, endContainer, 'nextSibling');
  }

  // Expand start/end container to matching block element or text node
  if (isBlockFormat(format) || isSelectorFormat(format)) {
    // Find new startContainer/endContainer if there is better one
    startContainer = findBlockEndPoint(formatList, startContainer, 'previousSibling');
    endContainer = findBlockEndPoint(formatList, endContainer, 'nextSibling');

    // Non block element then try to expand up the leaf
    if (isBlockFormat(format)) {
      if (!dom.isBlock(startContainer)) {
        startContainer = findParentContainer(formatList, startContainer, startOffset, true);
      }

      if (!dom.isBlock(endContainer)) {
        endContainer = findParentContainer(formatList, endContainer, endOffset, false);
      }
    }
  }

  // Setup index for startContainer
  if (dom.isElement(startContainer) && startContainer.parentNode && !dom.isEditableRoot(startContainer.parentNode)) {
    startOffset = dom.position(startContainer);
    startContainer = startContainer.parentNode;
  }

  // Setup index for endContainer
  if (dom.isElement(endContainer) && endContainer.parentNode && !dom.isEditableRoot(endContainer.parentNode)) {
    endOffset = dom.position(endContainer) + 1;
    endContainer = endContainer.parentNode;
  }

  return range.create(startContainer, startOffset, endContainer, endOffset);
};

const splitNode = (parentElm, splitElm, replacementElm = null) => {
  let rng = document.createRange();
  let beforeFragment;
  let afterFragment;

  if (parentElm && splitElm && parentElm.parentNode && splitElm.parentNode) {
    const parentNode = parentElm.parentNode;
    // Get before chunk
    rng.setStart(parentNode, dom.position(parentElm));
    rng.setEnd(splitElm.parentNode, dom.position(splitElm));
    beforeFragment = rng.extractContents();

    // Get after chunk
    rng = document.createRange();
    rng.setStart(splitElm.parentNode, dom.position(splitElm) + 1);
    rng.setEnd(parentNode, dom.position(parentElm) + 1);
    afterFragment = rng.extractContents();

    // Insert before chunk
    parentNode.insertBefore(trimNode(beforeFragment), parentElm);

    // Insert middle chunk
    if (replacementElm) {
      parentNode.insertBefore(replacementElm, parentElm);
      // pa.replaceChild(replacementElm, splitElm);
    } else {
      parentNode.insertBefore(splitElm, parentElm);
    }

    // Insert after chunk
    parentNode.insertBefore(trimNode(afterFragment), parentElm);
    dom.remove(parentElm, true);

    return replacementElm || splitElm;
  } else {
    return undefined;
  }
};

// W3C valid browsers tend to leave empty nodes to the left/right side of the contents - this makes sense
// but we don't want that in our code since it serves no purpose for the end user
// For example splitting this html at the bold element:
//   <p>text 1<span><b>CHOP</b></span>text 2</p>
// would produce:
//   <p>text 1<span></span></p><b>CHOP</b><p><span></span>text 2</p>
// this function will then trim off empty edges and produce:
//   <p>text 1</p><b>CHOP</b><p>text 2</p>
const trimNode = (node, root = null) => {
    const rootNode = root || node;
    if (dom.isElement(node) && dom.isBookmarkNode(node)) {
      return node;
    }

    const children = node.childNodes;
    for (let i = children.length - 1; i >= 0; i--) {
      trimNode(children[i], rootNode);
    }

    // If the only child is a bookmark then move it up
    if (dom.isElement(node)) {
      const currentChildren = node.childNodes;
      if (currentChildren.length === 1 && dom.isBookmarkNode(currentChildren[0])) {
        node.parentNode?.insertBefore(currentChildren[0], node);
      }
    }

    // Remove any empty nodes
    if (!isDocument(node) && !isContent(node, rootNode) && !isKeepElement(node) && !isKeepTextNode(node, rootNode)) {
      dom.remove(node, true);
    }

    return node;
  };

const afterFormat = (editor) => {
  editor.normalizeContent();
  editor.history.recordUndo();
  editor.context.triggerEvent('change', editor.$editable);
};

export default {
  isNode,
  isElementNode,
  isCaretNode,
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
  getNonWhiteSpaceSibling,
  replaceVars,
  isEq,
  normalizeStyleValue,
  isVariableFormatName,
  areSimilarFormats,
  getTextDecoration,
  getStyle,
  preserveSelection,
  expandRng,
  splitNode,
  trimNode,
  afterFormat
}