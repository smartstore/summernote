import $ from 'jquery';
import Type from './Type';
import Obj from './Obj';
import Str from './Str';
import func from './func';
import lists from './lists';
import env from './env';
import schema from './schema';

const NBSP_CHAR = String.fromCharCode(160);
const ZERO_WIDTH_NBSP_CHAR = '\ufeff';

const CharTypes = {
  UNKNOWN: -1,
  CHAR: 0,
  PUNC: 1,
  SPACE: 2
};

const beautifyOpts = {
  indent_size: 2,
  indent_with_tabs: true,
  indent_char: " ",
  max_preserve_newlines: "2",
  preserve_newlines: true,
  keep_array_indentation: false,
  break_chained_methods: false,
  indent_scripts: "normal",
  brace_style: "collapse",
  space_before_conditional: true,
  unescape_strings: false,
  jslint_happy: false,
  end_with_newline: false,
  wrap_line_length: "140",
  indent_inner_html: true,
  comma_first: false,
  e4x: false,
  indent_empty_lines: false
};

const getNode = (node) =>
  Type.isJquery(node) ? node.get(0) : node;

const isNodeType = (type) => {
  return (node) => !!node && node.nodeType === type;
};

const matchNodeName = (name) => {
  const upperCasedName = name.toUpperCase();

  return (node) =>
    Type.isAssigned(node) && node.nodeName === upperCasedName;
};

const matchNodeNames = (names) => {
  if (Type.isString(names)) {
    names = Str.explode(names, ' ');
  }

  if (names.length === 0) {
    return func.fail;
  } else if (names.length == 1) {
    return matchNodeName(names[0]);
  }

  const upperCasedNames = names.map((s) => s.toUpperCase());

  return (node) => {
    if (node && node.nodeName) {
      return lists.contains(upperCasedNames, node.nodeName);
    }

    return false;
  };
};

const isInMap = (map) => {
  return (node) =>
    node && Obj.has(map, node.nodeName)
};

const isNode = node => Type.isNumber(node?.nodeType);
const isElement = isNodeType(1);
const isText = isNodeType(3);
const isCData = isNodeType(4);
const isPi = isNodeType(7);
const isComment = isNodeType(8);
const isDocument = isNodeType(9);
const isDocumentFragment = isNodeType(11);
const isSVGElement = node => isElement(node) && node.namespaceURI === 'http://www.w3.org/2000/svg';
const isHTMLElement = func.and(isElement, func.not(isSVGElement));

// Firefox can allow you to get a selection on a restricted node, such as file/number inputs. These nodes
// won't implement the Object prototype, so Object.getPrototypeOf() will return null or something similar.
const isRestrictedNode = (node) => !!node && !Object.getPrototypeOf(node);

const isBody = matchNodeName('BODY');
const isPre = matchNodeName('PRE');
const isLi = matchNodeName('LI');
const isTable = matchNodeName('TABLE');
const isData = matchNodeName('DATA');
const isHr = matchNodeName('HR');
const isListItem = matchNodeName('LI');
const isDetails = matchNodeName('DETAILS');
const isSummary = matchNodeName('SUMMARY');
const isBlockquote = matchNodeName('BLOCKQUOTE');
const isAnchor = matchNodeName('A');
const isDiv = matchNodeName('DIV');
const isSpan = matchNodeName('SPAN');
const isB = matchNodeName('B');
const isBR = matchNodeName('BR');
const isImg = matchNodeName('IMG');
const isFigure = matchNodeName('FIGURE');
const isTextarea = matchNodeName('TEXTAREA');

const isTextareaOrInput = matchNodeNames(['TEXTAREA', 'INPUT', 'SELECT']);
const isList = matchNodeNames(['UL', 'OL']);
const isCell = matchNodeNames(['TD', 'TH']);
const isCellOrCaption = matchNodeNames(['TD', 'TH', 'CAPTION']);
const isMedia = matchNodeNames(['VIDEO', 'AUDIO', 'OBJECT', 'EMBED']);
const isHeading = isInMap(schema.getHeadingElements());
const isPara = (node) => !isEditable && Obj.has(schema.getTextBlockElements(), node.nodeName);
const isPurePara = (node) => isPara(node) && !isLi(node);
const isInline = (node) => schema.isInline(node.nodeName);
const isBlock = (node) => !schema.isInline(node.nodeName);
const isParaInline = (node) => isInline(node) && !!closest(node, isPara);
const isBodyInline = (node) => isInline(node) && !closest(node, isPara);
const isBodyContainer = (node) => isCell(node) || isBlockquote(node) || isEditable(node);

const getComputedStyle = (node, name) => {
  if (isElement(node)) {
    const win = node.ownerDocument.defaultView;
    if (win) {
      const computed = win.getComputedStyle(node, null);
      return computed ? computed.getPropertyValue(name) : null;
    }
  }
  return null;
};

const matchStyleValues = (name, values) => {
  const items = values.toLowerCase().split(' ');

  return (node) => {
    const styleValue = getComputedStyle(node, name);
    return styleValue && lists.contains(items, styleValue);
  };
};

const matchClass = (className) => {
  return (node) => {
    return node && $(node).hasClass(className);
  };
};

const matchAttribute = (attrName) => {
  return (node) => {
    return isElement(node) && node.hasAttribute(attrName);
  };
};

const matchAttributeValue = (attrName, attrValue) => {
  return (node) => {
    return isElement(node) && node.getAttribute(attrName) === attrValue;
  };
};

const matchContentEditableState = (value) => {
  return (node) => {
    if (isHTMLElement(node)) {
      if (node.contentEditable === value) {
        return true;
      }

      if (node.getAttribute('data-note-contenteditable') === value) {
        return true;
      }
    }

    return false;
  };
};

const matchSelector = (selector, strict = false) => {
  if (Type.isString(selector)) {
    return selector.length ? (node) => node.matches && node.matches(selector) : (strict ? func.fail : func.ok);
  } else if (Type.isFunction(selector)) {
    return (node) => selector(node);
  } else {
    return strict ? func.fail : func.ok;
  }
};

const isEditable = matchClass('note-editable');
const isControlSizing = matchClass('note-control-sizing');
const isBookmarkNode = func.and(matchAttributeValue('data-note-type', 'bookmark'), matchNodeName('SPAN'))
const isVoid = (node) => node && schema.isVoid(node.nodeName);
const isEmptyAnchor = func.and(isAnchor, isEmpty);

const matches = (node, selector) => matchSelector(selector)(node);

/**
 * @method Checks whether node is given tag
 *
 * @param {Node} node
 * @param {String|Array} tagName - Either a single tag as string or an array of tag names to check
 */
const isTag = (node, tag) => matchNodeNames(tag)(node);

function getRoot(node) {
  return $(node).closest('.note-editable')[0];
}

function findPara(node) {
  return closest(node, isPara);
}

/**
 * returns whether nodeB is closest sibling of nodeA
 *
 * @param {Node} nodeA
 * @param {Node} nodeB
 * @return {Boolean}
 */
function isClosestSibling(nodeA, nodeB) {
  return nodeA.nextSibling === nodeB ||
         nodeA.previousSibling === nodeB;
}

/**
 * returns array of closest siblings with node
 *
 * @param {Node} node
 * @param {function} [pred] - predicate function
 * @return {Node[]}
 */
function withClosestSiblings(node, pred) {
  pred = pred || func.ok;

  const siblings = [];
  if (node.previousSibling && pred(node.previousSibling)) {
    siblings.push(node.previousSibling);
  }
  siblings.push(node);
  if (node.nextSibling && pred(node.nextSibling)) {
    siblings.push(node.nextSibling);
  }
  return siblings;
}

/**
 * blank HTML for cursor position
 * - [workaround] old IE only works with &nbsp;
 * - [workaround] IE11 and other browser works with bogus br
 */
const blankHTML = env.isMSIE && env.browserVersion < 11 ? '&nbsp;' : '<br>';

/**
 * @method nodeLength
 *
 * returns #text's text size or element's childNodes size
 *
 * @param {Node} node
 */
function nodeLength(node) {
  if (isText(node)) {
    return node.nodeValue.length;
  }

  if (node) {
    return node.childNodes.length;
  }

  return 0;
}

/**
 * returns whether deepest child node is empty or not.
 *
 * @param {Node} node
 * @return {Boolean}
 */
function deepestChildIsEmpty(node) {
  do {
    if (node.firstElementChild === null || node.firstElementChild.innerHTML === '') break;
  } while ((node = node.firstElementChild));

  return isEmpty(node);
}

/**
 * returns whether node is empty or not.
 *
 * @param {Node} node
 * @return {Boolean}
 */
function isEmpty(node) {
  const len = nodeLength(node);

  if (len === 0) {
    return true;
  } else if (!isText(node) && len === 1 && node.innerHTML === blankHTML) {
    // ex) <p><br></p>, <span><br></span>
    return true;
  } else if (lists.all(node.childNodes, isText) && node.innerHTML === '') {
    // ex) <p></p>, <span></span>
    return true;
  }

  return false;
}

/**
 * padding blankHTML if node is empty (for cursor position)
 */
function paddingBlankHTML(node) {
  if (!isVoid(node) && !nodeLength(node)) {
    node.innerHTML = blankHTML;
  }
}

/**
 * Find closest parent that matches the given selector.
 *
 * @param {Node} node
 * @param {Function|String} selector - Selector function or string.
 */
const closest = (node, selector) => {
  node = getNode(node);
  const pred = matchSelector(selector);
  while (node) {
    if (pred(node)) { return node; }
    if (isEditable(node)) { break; }

    node = node.parentNode;
  }
  return null;
}

/**
 * find nearest ancestor only single child blood line and predicate hit
 *
 * @param {Node} node
 * @param {Function} pred - predicate function
 */
function singleChildAncestor(node, pred) {
  node = node.parentNode;

  while (node) {
    if (nodeLength(node) !== 1) { break; }
    if (pred(node)) { return node; }
    if (isEditable(node)) { break; }

    node = node.parentNode;
  }
  return null;
}

/**
 * Returns array of parent nodes (until selector hit).
 *
 * @param {Node} node
 * @param {Function|String} [optional] selector - Selector function or string.
 */
const getParentsUntil = (node, selector) => {
  const pred = matchSelector(selector, true);
  const root = getRoot(node);

  const parents = [];
  closest(node, (el) => {
    if (el !== root) {
      parents.push(el);
    }
    return pred(el);
  });

  return parents;
}

/**
 * Returns array of parent nodes while selector hits until root.
 *
 * @param {Node} node
 * @param {Function|String} [optional] selector - Selector function or string.
 */
const getParentsWhile = (node, selector) => {
  const pred = matchSelector(selector);
  const root = getRoot(node);

  const parents = [];
  closest(node, (el) => {
    if (el == root) {
      return false;
    }

    if (pred(el)) {
      parents.push(el);
    }

    return true;
  });

  return parents;
}

/**
 * find farthest ancestor predicate hit
 */
function lastAncestor(node, pred) {
  const ancestors = getParentsUntil(node);
  return lists.last(ancestors.filter(pred));
}

/**
 * returns common ancestor node between two nodes.
 *
 * @param {Node} nodeA
 * @param {Node} nodeB
 */
function commonAncestor(nodeA, nodeB) {
  const ancestors = getParentsUntil(nodeA);
  for (let n = nodeB; n; n = n.parentNode) {
    if (ancestors.indexOf(n) > -1) return n;
  }
  return null; // different document area
}

/**
 * listing all previous siblings (until predicate hit).
 *
 * @param {Node} node
 * @param {Function} [optional] pred - predicate function
 */
function listPrev(node, pred) {
  pred = pred || func.fail;

  const nodes = [];
  while (node) {
    if (pred(node)) { break; }
    nodes.push(node);
    node = node.previousSibling;
  }
  return nodes;
}

/**
 * listing next siblings (until predicate hit).
 *
 * @param {Node} node
 * @param {Function} [pred] - predicate function
 */
function listNext(node, pred) {
  pred = pred || func.fail;

  const nodes = [];
  while (node) {
    if (pred(node)) { break; }
    nodes.push(node);
    node = node.nextSibling;
  }
  return nodes;
}

/**
 * listing descendant nodes
 *
 * @param {Node} node
 * @param {Function} [pred] - predicate function
 */
function listDescendant(node, pred) {
  const descendants = [];
  pred = pred || func.ok;

  // start DFS(depth first search) with node
  (function fnWalk(current) {
    if (node !== current && pred(current)) {
      descendants.push(current);
    }
    for (let idx = 0, len = current.childNodes.length; idx < len; idx++) {
      fnWalk(current.childNodes[idx]);
    }
  })(node);

  return descendants;
}

function isDescendantOf(node, parent) {
  return node === parent || parent.contains(node);
}

/**
 * wrap node with new tag.
 *
 * @param {Node} node
 * @param {Node} tagName of wrapper
 * @return {Node} - wrapper
 */
function wrap(node, wrapperName) {
  const parent = node.parentNode;
  const wrapper = $('<' + wrapperName + '>')[0];

  parent.insertBefore(wrapper, node);
  wrapper.appendChild(node);

  return wrapper;
}

/**
 * Unwrap node.
 *
 * @param {Node} node
 * @return {NodeList} - The unwrapped child nodes.
 */
function unwrap(node) {
  const parent = node.parentNode;
  const children = parent.childNodes;
  parent.replaceWith(...children);

  return children.length == 1 ? children.item(0) : node;
}

/**
 * insert node after preceding
 *
 * @param {Node} node
 * @param {Node} preceding - predicate function
 */
function insertAfter(node, preceding) {
  const next = preceding.nextSibling;
  let parent = preceding.parentNode;
  if (next) {
    parent.insertBefore(node, next);
  } else {
    parent.appendChild(node);
  }
  return node;
}

/**
 * append elements.
 *
 * @param {Node} node
 * @param {Collection} aChild
 */
function appendChildNodes(node, aChild) {
  $.each(aChild, function(idx, child) {
    node.appendChild(child);
  });
  return node;
}

/**
 * returns whether boundaryPoint is left edge or not.
 *
 * @param {BoundaryPoint} point
 * @return {Boolean}
 */
function isLeftEdgePoint(point) {
  return point.offset === 0;
}

/**
 * returns whether boundaryPoint is right edge or not.
 *
 * @param {BoundaryPoint} point
 * @return {Boolean}
 */
function isRightEdgePoint(point) {
  return point.offset === nodeLength(point.node);
}

/**
 * returns whether boundaryPoint is edge or not.
 *
 * @param {BoundaryPoint} point
 * @return {Boolean}
 */
function isEdgePoint(point) {
  return isLeftEdgePoint(point) || isRightEdgePoint(point);
}

/**
 * returns whether node is left edge of ancestor or not.
 *
 * @param {Node} node
 * @param {Node} ancestor
 * @return {Boolean}
 */
function isLeftEdgeOf(node, ancestor) {
  while (node && node !== ancestor) {
    if (position(node) !== 0) {
      return false;
    }
    node = node.parentNode;
  }

  return true;
}

/**
 * returns whether node is right edge of ancestor or not.
 *
 * @param {Node} node
 * @param {Node} ancestor
 * @return {Boolean}
 */
function isRightEdgeOf(node, ancestor) {
  if (!ancestor) {
    return false;
  }
  while (node && node !== ancestor) {
    if (position(node) !== nodeLength(node.parentNode) - 1) {
      return false;
    }
    node = node.parentNode;
  }

  return true;
}

/**
 * returns whether point is left edge of ancestor or not.
 * @param {BoundaryPoint} point
 * @param {Node} ancestor
 * @return {Boolean}
 */
function isLeftEdgePointOf(point, ancestor) {
  return isLeftEdgePoint(point) && isLeftEdgeOf(point.node, ancestor);
}

/**
 * returns whether point is right edge of ancestor or not.
 * @param {BoundaryPoint} point
 * @param {Node} ancestor
 * @return {Boolean}
 */
function isRightEdgePointOf(point, ancestor) {
  return isRightEdgePoint(point) && isRightEdgeOf(point.node, ancestor);
}

/**
 * returns offset from parent.
 *
 * @param {Node} node
 */
function position(node) {
  let offset = 0;
  while ((node = node.previousSibling)) {
    offset += 1;
  }
  return offset;
}

function hasChildren(node) {
  return !!(node && node.childNodes && node.childNodes.length);
}

/**
 * returns previous boundaryPoint
 *
 * @param {BoundaryPoint} point
 * @param {Boolean} isSkipInnerOffset
 * @return {BoundaryPoint}
 */
function prevPoint(point, isSkipInnerOffset) {
  let node;
  let offset;

  if (point.offset === 0) {
    if (isEditable(point.node)) {
      return null;
    }

    node = point.node.parentNode;
    offset = position(point.node);
  } else if (hasChildren(point.node)) {
    node = point.node.childNodes[point.offset - 1];
    offset = nodeLength(node);
  } else {
    node = point.node;
    offset = isSkipInnerOffset ? 0 : point.offset - 1;
  }

  return {
    node: node,
    offset: offset,
  };
}

/**
 * returns next boundaryPoint
 *
 * @param {BoundaryPoint} point
 * @param {Boolean} isSkipInnerOffset
 * @return {BoundaryPoint}
 */
function nextPoint(point, isSkipInnerOffset) {
  let node, offset;

  if (nodeLength(point.node) === point.offset) {
    if (isEditable(point.node)) {
      return null;
    }

    let nextTextNode = getNextTextNode(point.node);
    if (nextTextNode) {
      node = nextTextNode;
      offset = 0;
    } else {
      node = point.node.parentNode;
      offset = position(point.node) + 1;
    }
  } else if (hasChildren(point.node)) {
    node = point.node.childNodes[point.offset];
    offset = 0;
  } else {
    node = point.node;
    offset = isSkipInnerOffset ? nodeLength(point.node) : point.offset + 1;
  }

  return {
    node: node,
    offset: offset,
  };
}

/**
 * Find next boundaryPoint for preorder / depth first traversal of the DOM
 * returns next boundaryPoint with empty node
 *
 * @param {BoundaryPoint} point
 * @param {Boolean} isSkipInnerOffset
 * @return {BoundaryPoint}
 */
function nextPointWithEmptyNode(point, isSkipInnerOffset) {
  let node, offset = 0;

  if (nodeLength(point.node) === point.offset) {
    if (isEditable(point.node)) {
      return null;
    }

    node = point.node.parentNode;
    offset = position(point.node) + 1;

    // if parent node is editable,  return current node's sibling node.
    if (isEditable(node)) {
      node = point.node.nextSibling;
      offset = 0;
    }
  } else if (hasChildren(point.node)) {
    node = point.node.childNodes[point.offset];
    offset = 0;
  } else {
    node = point.node;
    offset = isSkipInnerOffset ? nodeLength(point.node) : point.offset + 1;
  }

  return {
    node: node,
    offset: offset,
  };
}

/*
* returns the next Text node index or 0 if not found.
*/
function getNextTextNode(actual) {
  if(!actual.nextSibling) return undefined;
  if(actual.parent !== actual.nextSibling.parent) return undefined;

  if(isText(actual.nextSibling) ) return actual.nextSibling;
  else return getNextTextNode(actual.nextSibling);
}

/**
 * returns whether pointA and pointB is same or not.
 *
 * @param {BoundaryPoint} pointA
 * @param {BoundaryPoint} pointB
 * @return {Boolean}
 */
function isSamePoint(pointA, pointB) {
  return pointA.node === pointB.node && pointA.offset === pointB.offset;
}

/**
 * returns whether point is visible (can set cursor) or not.
 *
 * @param {BoundaryPoint} point
 * @return {Boolean}
 */
function isVisiblePoint(point) {
  if (isText(point.node) || !hasChildren(point.node) || isEmpty(point.node)) {
    return true;
  }

  const leftNode = point.node.childNodes[point.offset - 1];
  const rightNode = point.node.childNodes[point.offset];
  if ((!leftNode || isVoid(leftNode)) && (!rightNode || isVoid(rightNode)) || isTable(rightNode)) {
    return true;
  }

  return false;
}

/**
 * @method prevPointUtil
 *
 * @param {BoundaryPoint} point
 * @param {Function} pred
 * @return {BoundaryPoint}
 */
function prevPointUntil(point, pred) {
  while (point) {
    if (pred(point)) {
      return point;
    }

    point = prevPoint(point);
  }

  return null;
}

/**
 * @method nextPointUntil
 *
 * @param {BoundaryPoint} point
 * @param {Function} pred
 * @return {BoundaryPoint}
 */
function nextPointUntil(point, pred) {
  while (point) {
    if (pred(point)) {
      return point;
    }

    point = nextPoint(point);
  }

  return null;
}

/**
 * Gets the char type at given point.
 *
 * @param {Point} point
 * @return {Number} - -1 = unknown, 0 = char, 1 = interpunctuation, 2 = space
 */
function getCharType(point) {
  if (!isText(point.node)) {
    return CharTypes.UNKNOWN;
  }

  const ch = point.node.nodeValue.charAt(point.offset - 1);

  if (ch === ' ' || ch === NBSP_CHAR) {
    return CharTypes.SPACE;
  }
  else if (ch === '_') {
    return CharTypes.CHAR;
  }
  else if (/^\p{P}$/u.test(ch)) {
    return CharTypes.PUNC;
  }
  else {
    return CharTypes.CHAR;
  }
}

/**
 * Returns whether point has character or not.
 *
 * @param {Point} point
 * @return {Boolean}
 */
function isCharPoint(point) {
  return getCharType(point) == CharTypes.CHAR;
}

/**
 * Returns whether point has space or not.
 *
 * @param {Point} point
 * @return {Boolean}
 */
function isSpacePoint(point) {
  return getCharType(point) == CharTypes.SPACE;
}

/**
 * @method walkPoint - preorder / depth first traversal of the DOM
 *
 * @param {BoundaryPoint} startPoint
 * @param {BoundaryPoint} endPoint
 * @param {Function} handler
 * @param {Boolean} isSkipInnerOffset
 */
function walkPoint(startPoint, endPoint, handler, isSkipInnerOffset) {
  let point = startPoint;

  while (point) {
    handler(point);

    if (isSamePoint(point, endPoint)) {
      break;
    }

    const isSkipOffset = isSkipInnerOffset &&
                       startPoint.node !== point.node &&
                       endPoint.node !== point.node;
    point = nextPointWithEmptyNode(point, isSkipOffset);
  }
}

/**
 * @method makeOffsetPath
 *
 * return offsetPath(array of offset) from ancestor
 *
 * @param {Node} ancestor - ancestor node
 * @param {Node} node
 */
function makeOffsetPath(ancestor, node) {
  const ancestors = getParentsUntil(node, func.eq(ancestor));
  return ancestors.map(position).reverse();
}

/**
 * @method fromOffsetPath
 *
 * return element from offsetPath(array of offset)
 *
 * @param {Node} ancestor - ancestor node
 * @param {array} offsets - offsetPath
 */
function fromOffsetPath(ancestor, offsets) {
  let current = ancestor;
  for (let i = 0, len = offsets.length; i < len; i++) {
    if (current.childNodes.length <= offsets[i]) {
      current = current.childNodes[current.childNodes.length - 1];
    } else {
      current = current.childNodes[offsets[i]];
    }
  }
  return current;
}

function getRangeNode(container, offset) {
  if (isElement(container) && container.hasChildNodes()) {
    const childNodes = container.childNodes;
    const safeOffset = func.clamp(offset, 0, childNodes.length - 1);
    return childNodes[safeOffset];
  }
  else {
    return container;
  }
}

/**
 * @method splitNode
 *
 * split element or #text
 *
 * @param {BoundaryPoint} point
 * @param {Object} [options]
 * @param {Boolean} [options.isSkipPaddingBlankHTML] - default: false
 * @param {Boolean} [options.isNotSplitEdgePoint] - default: false
 * @param {Boolean} [options.isDiscardEmptySplits] - default: false
 * @return {Node} right node of boundaryPoint
 */
function splitNode(point, options) {
  let isSkipPaddingBlankHTML = options && options.isSkipPaddingBlankHTML;
  const isNotSplitEdgePoint = options && options.isNotSplitEdgePoint;
  const isDiscardEmptySplits = options && options.isDiscardEmptySplits;

  if (isDiscardEmptySplits) {
    isSkipPaddingBlankHTML = true;
  }

  // edge case
  if (isEdgePoint(point) && (isText(point.node) || isNotSplitEdgePoint)) {
    if (isLeftEdgePoint(point)) {
      return point.node;
    } else if (isRightEdgePoint(point)) {
      return point.node.nextSibling;
    }
  }

  // split #text
  if (isText(point.node)) {
    return point.node.splitText(point.offset);
  } else {
    const childNode = point.node.childNodes[point.offset];
    const clone = insertAfter(point.node.cloneNode(false), point.node);
    appendChildNodes(clone, listNext(childNode));

    if (!isSkipPaddingBlankHTML) {
      paddingBlankHTML(point.node);
      paddingBlankHTML(clone);
    }

    if (isDiscardEmptySplits) {
      if (isEmpty(point.node)) {
        remove(point.node);
      }
      if (isEmpty(clone)) {
        remove(clone);
        return point.node.nextSibling;
      }
    }

    return clone;
  }
}

/**
 * @method splitTree
 *
 * split tree by point
 *
 * @param {Node} root - split root
 * @param {BoundaryPoint} point
 * @param {Object} [options]
 * @param {Boolean} [options.isSkipPaddingBlankHTML] - default: false
 * @param {Boolean} [options.isNotSplitEdgePoint] - default: false
 * @return {Node} right node of boundaryPoint
 */
function splitTree(root, point, options) {
  // ex) [#text, <span>, <p>]
  let ancestors = getParentsUntil(point.node, func.eq(root));

  if (!ancestors.length) {
    return null;
  } else if (ancestors.length === 1) {
    return splitNode(point, options);
  }
  // Filter elements with sibling elements
  if (ancestors.length > 2) {
    let domList = ancestors.slice(0, ancestors.length - 1);
    let ifHasNextSibling = domList.find(item => item.nextSibling);
    if (ifHasNextSibling && point.offset != 0 && isRightEdgePoint(point)) {
        let nestSibling = ifHasNextSibling.nextSibling;
        let textNode;
        if (nestSibling.nodeType == 1) {
            textNode = nestSibling.childNodes[0];
            ancestors = getParentsUntil(textNode, func.eq(root));
            point = {
                node: textNode,
                offset: 0,
            };
        }
        else if (nestSibling.nodeType == 3 && !nestSibling.data.match(/[\n\r]/g)) {
            textNode = nestSibling;
            ancestors = getParentsUntil(textNode, func.eq(root));
            point = {
                node: textNode,
                offset: 0,
            };
        }
    }
  }
  return ancestors.reduce(function(node, parent) {
    if (node === point.node) {
      node = splitNode(point, options);
    }

    return splitNode({
      node: parent,
      offset: node ? position(node) : nodeLength(parent),
    }, options);
  });
}

/**
 * split point
 *
 * @param {Point} point
 * @param {Boolean} isInline
 * @return {Object}
 */
function splitPoint(point, isInline) {
  // find splitRoot, container
  //  - inline: splitRoot is a child of paragraph
  //  - block: splitRoot is a child of bodyContainer
  const pred = isInline ? isPara : isBodyContainer;
  const ancestors = getParentsUntil(point.node, pred);
  const topAncestor = lists.last(ancestors) || point.node;

  let splitRoot, container;
  if (pred(topAncestor)) {
    splitRoot = ancestors[ancestors.length - 2];
    container = topAncestor;
  } else {
    splitRoot = topAncestor;
    container = splitRoot.parentNode;
  }

  // if splitRoot is exists, split with splitTree
  let pivot = splitRoot && splitTree(splitRoot, point, {
    isSkipPaddingBlankHTML: isInline,
    isNotSplitEdgePoint: isInline,
  });

  // if container is point.node, find pivot with point.offset
  if (!pivot && container === point.node) {
    pivot = point.node.childNodes[point.offset];
  }

  return {
    rightNode: pivot,
    container: container,
  };
}

function create(nodeName) {
  return document.createElement(nodeName);
}

function createText(text) {
  return document.createTextNode(text);
}

/**
 * @method remove
 *
 * remove node, (removeChildren: remove children also?)
 *
 * @param {Node} node
 * @param {Boolean} removeChildren
 */
function remove(node, removeChildren) {
  if (!node || !node.parentNode) { return; }
  if (node.removeNode) { return node.removeNode(removeChildren); }

  const parent = node.parentNode;
  if (!removeChildren) {
    const nodes = [];
    for (let i = 0, len = node.childNodes.length; i < len; i++) {
      nodes.push(node.childNodes[i]);
    }

    for (let i = 0, len = nodes.length; i < len; i++) {
      parent.insertBefore(nodes[i], node);
    }
  }

  parent.removeChild(node);
}

/**
 * @method removeWhile
 *
 * @param {Node} node
 * @param {Function} pred
 */
function removeWhile(node, pred) {
  while (node) {
    if (isEditable(node) || !pred(node)) {
      break;
    }

    const parent = node.parentNode;
    remove(node);
    node = parent;
  }
}

/**
 * @method replace
 *
 * replace node with provided nodeName
 *
 * @param {Node} node
 * @param {String} nodeName
 * @return {Node} - new node
 */
function replace(node, nodeName) {
  // TODO: Rename dom.replace --> dom.rename
  if (!isElement(node) || node.nodeName.toUpperCase() === nodeName.toUpperCase()) {
    return node;
  }

  const newNode = create(nodeName);

  // Copy attributes
  [...node.attributes].map(({ name, value }) => {
    newNode.setAttribute(name, value);
  });

  // Copy children
  while (node.firstChild) {
    newNode.appendChild(node.firstChild);
  }

  // Replace node
  node.parentNode.replaceChild(newNode, node);
  return newNode;
}

/**
 * @param {jQuery} $node
 * @param {Boolean} [stripLinebreaks] - default: false
 */
function value($node, stripLinebreaks) {
  const val = isTextarea($node[0]) ? $node.val() : $node.html();
  if (stripLinebreaks) {
    return val.replace(/[\n\r]/g, '');
  }
  return val;
}

/**
 * @method html
 *
 * get the HTML contents of node
 *
 * @param {jQuery} $node
 * @param {Boolean} [isNewlineOnBlock]
 */
function html($node, prettifyHtml) {
  let markup = value($node);

  if (prettifyHtml) {
    if (typeof window.html_beautify !== 'undefined') {
      markup = window.html_beautify(markup, beautifyOpts);
    }
    else {
      const regexTag = /<(\/?)(\b(?!!)[^>\s]*)(.*?)(\s*\/?>)/g;
      markup = markup.replace(regexTag, function(match, endSlash, name) {
        name = name.toUpperCase();
        const isEndOfInlineContainer = /^DIV|^TD|^TH|^P|^LI|^H[1-7]/.test(name) &&
                                     !!endSlash;
        const isBlockNode = /^BLOCKQUOTE|^TABLE|^TBODY|^TR|^HR|^UL|^OL/.test(name);
  
        return match + ((isEndOfInlineContainer || isBlockNode) ? '\n' : '');
      });
      markup = markup.trim();
    }
  }

  return markup;
}

function posFromPlaceholder(placeholder) {
  const $placeholder = $(placeholder);
  const pos = $placeholder.offset();
  const height = $placeholder.outerHeight(true); // include margin

  return {
    left: pos.left,
    top: pos.top + height,
  };
}

function attachEvents($node, events) {
  Object.keys(events).forEach(function(key) {
    $node.on(key, events[key]);
  });
}

function detachEvents($node, events) {
  Object.keys(events).forEach(function(key) {
    $node.off(key, events[key]);
  });
}

/**
 * @method isCustomStyleTag
 * assert if a node contains a "note-styletag" class,
 * which implies that's a custom-made style tag node
 *
 * @param {Node} an HTML DOM node
 */
function isCustomStyleTag(node) {
  return node && !isText(node) && lists.contains(node.classList, 'note-styletag');
}

/**
 * Gets the value of an HTML attribute
 *
 * @param {any} node - an HTML DOM node or jQuery object
 * @param {String} name - the attribute name
 * @return {String|null}
 */
function getAttr(node, name) {
  node = getNode(node);
  if (node) {
    return node.getAttribute(name);
  }
  return null;
}

/**
 * Sets an HTML attribute
 *
 * @param {any} node - an HTML DOM node or jQuery object
 * @param {String} name - the attribute name
 * @param {String} value - the attribute value. If null or undefined, attribute will be removed.
 * @return {Boolean}
 */
function setAttr(node, name, value) {
  node = getNode(node);
  if (node) {
    if (!!value)
      node.setAttribute(name, value)
    else
      node.removeAttribute(name);
  }
}

/**
 * Returns the current style or runtime/computed value of an element.
 *
 * @method getStyle
 * @param {JQuery/Element} node HTML element or jQuery object to get style from.
 * @param {String} name Style name to return.
 * @param {Boolean} computed Get computed style?.
 * @return {String} Current style or computed style value of an element.
 */
const getStyle = (node, name, computed = false) => {
  if (computed) {
    return getComputedStyle(getNode(node), Str.camelCaseToHyphens(name));
  } else {
    return $(node).css(name);
  }
};

/**
 * Sets the CSS style value on a HTML element. The name can be a camelcase string or the CSS style name like background-color.
 */
const setStyle = (node, name, value) => {
  $(node).css(name, value);
};

/**
 * Sets multiple styles on the specified element(s).
 */
const setStyles = (node, styleMap) => {
  $(node).css(styleMap);
};

export default {
  CharTypes,
  /** @property {String} NBSP_CHAR */
  NBSP_CHAR,
  /** @property {String} ZERO_WIDTH_NBSP_CHAR */
  ZERO_WIDTH_NBSP_CHAR,
  /** @property {String} blank */
  blank: blankHTML,
  /** @property {String} emptyPara */
  emptyPara: `<p>${blankHTML}</p>`,
  getRoot,
  matchNodeNames,
  matchStyleValues,
  matches,
  isEditable,
  isControlSizing,
  isNode,
  isText,
  isElement,
  isBookmarkNode,
  isCData,
  isPi,
  isComment,
  isDocument,
  isDocumentFragment,
  isSVGElement,
  isHTMLElement,
  isRestrictedNode,
  isVoid,
  isTag,
  isPara,
  findPara,
  isPurePara,
  isHeading,
  isInline,
  isBlock,
  isBodyInline,
  isBody,
  isParaInline,
  isPre,
  isList,
  isTable,
  isData,
  isHr,
  isListItem,
  isDetails,
  isSummary,
  isCell,
  isCellOrCaption,
  isMedia,
  isBlockquote,
  isBodyContainer,
  isAnchor,
  isDiv,
  isLi,
  isBR,
  isSpan,
  isB,
  isImg,
  isFigure,
  isTextarea,
  isTextareaOrInput,
  isEmpty,
  isEmptyAnchor,
  isClosestSibling,
  deepestChildIsEmpty,
  withClosestSiblings,
  nodeLength,
  isLeftEdgePoint,
  isRightEdgePoint,
  isEdgePoint,
  isLeftEdgeOf,
  isRightEdgeOf,
  isLeftEdgePointOf,
  isRightEdgePointOf,
  prevPoint,
  nextPoint,
  nextPointWithEmptyNode,
  isSamePoint,
  isVisiblePoint,
  prevPointUntil,
  nextPointUntil,
  getCharType,
  isCharPoint,
  isSpacePoint,
  walkPoint,
  closest,
  ancestor: closest, // Alias
  singleChildAncestor,
  getParentsWhile,
  getParentsUntil,
  listAncestor: getParentsUntil, // Alias
  lastAncestor,
  listNext,
  listPrev,
  listDescendant,
  isDescendantOf,
  commonAncestor,
  wrap,
  unwrap,
  insertAfter,
  appendChildNodes,
  position,
  hasChildren,
  makeOffsetPath,
  fromOffsetPath,
  getRangeNode,
  splitTree,
  splitPoint,
  create,
  createText,
  remove,
  removeWhile,
  replace,
  html,
  value,
  posFromPlaceholder,
  attachEvents,
  detachEvents,
  isCustomStyleTag,
  setAttr,
  getAttr,
  getStyle,
  setStyle,
  setStyles
};
