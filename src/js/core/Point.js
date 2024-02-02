import func from './func';
import lists from './lists';
import dom from './dom';

const NBSP_CHAR = String.fromCharCode(160);
const ZERO_WIDTH_NBSP_CHAR = '\ufeff';
const SOFT_HYPHEN = '\u00AD';

const CharTypes = {
  UNKNOWN: -1,
  CHAR: 0,
  PUNC: 1,
  SPACE: 2
};

// Private
/**
 * padding blankHTML if node is empty (for cursor position)
 */
const paddingBlankHTML = (node) => {
  if (!dom.isVoid(node) && !dom.nodeLength(node)) {
    node.innerHTML = dom.blank;
  }
}

/**
 * Checks whether boundary point is left edge or not.
 * 
  * @param {BoundaryPoint} point
 */
const isLeftEdgePoint = (point) => point.offset === 0;

/**
 * Checks whether boundary point is right edge or not.
 *
 * @param {BoundaryPoint} point
 */
const isRightEdgePoint = (point) => point.offset === dom.nodeLength(point.node);

/**
 * Checks whether boundary point is edge or not.
 *
 * @param {BoundaryPoint} point
 */
const isEdgePoint = (point) => isLeftEdgePoint(point) || isRightEdgePoint(point);

/**
 * Checks whether point is left edge of parent or not.
 * @param {BoundaryPoint} point
 * @param {Node} parent
 * @return {Boolean}
 */
const isLeftEdgePointOf = (point, parent) => 
  isLeftEdgePoint(point) && dom.isLeftEdgeOf(point.node, parent);

/**
 * Checks whether point is right edge of parent or not.
 * @param {BoundaryPoint} point
 * @param {Node} parent
 * @return {Boolean}
 */
const isRightEdgePointOf = (point, parent) => {
  isRightEdgePoint(point) && dom.isRightEdgeOf(point.node, parent);
}

/**
 * Gets previous boundary point.
 *
 * @param {BoundaryPoint} point
 * @param {Boolean} skipInnerOffset
 * @return {BoundaryPoint}
 */
const prevPoint = (point, skipInnerOffset) => {
  let node, offset;

  if (point.offset === 0) {
    if (dom.isEditableRoot(point.node)) {
      return null;
    }
    node = point.node.parentNode;
    offset = dom.position(point.node);
  } else if (dom.hasChildren(point.node)) {
    node = point.node.childNodes[point.offset - 1];
    offset = dom.nodeLength(node);
  } else {
    node = point.node;
    offset = skipInnerOffset ? 0 : point.offset - 1;
  }

  return { node: node, offset: offset };
}

/**
 * Gets next boundary point.
 *
 * @param {BoundaryPoint} point
 * @param {Boolean} skipInnerOffset
 * @return {BoundaryPoint}
 */
const nextPoint = (point, skipInnerOffset) => {
  let node, offset;

  if (point.offset === dom.nodeLength(point.node)) {
    if (dom.isEditableRoot(point.node)) {
      return null;
    }

    let nextTextNode = dom.getNextTextNode(point.node);
    if (nextTextNode) {
      node = nextTextNode;
      offset = 0;
    } else {
      node = point.node.parentNode;
      offset = dom.position(point.node) + 1;
    }
  } else if (dom.hasChildren(point.node)) {
    node = point.node.childNodes[point.offset];
    offset = 0;
  } else {
    node = point.node;
    offset = skipInnerOffset ? dom.nodeLength(point.node) : point.offset + 1;
  }

  return { node: node, offset: offset };
}

/**
 * Finds next boundary point with empty node
 *
 * @param {BoundaryPoint} point
 * @param {Boolean} skipInnerOffset
 * @return {BoundaryPoint}
 */
const nextPointWithEmptyNode = (point, skipInnerOffset) => {
  let node, offset = 0;

  if (point.offset === dom.nodeLength(point.node)) {
    if (dom.isEditableRoot(point.node)) {
      return null;
    }

    node = point.node.parentNode;
    offset = dom.position(point.node) + 1;

    // if parent node is editable,  return current node's sibling node.
    if (dom.isEditableRoot(node)) {
      node = point.node.nextSibling;
      offset = 0;
    }
  } else if (dom.hasChildren(point.node)) {
    node = point.node.childNodes[point.offset];
    offset = 0;
  } else {
    node = point.node;
    offset = skipInnerOffset ? dom.nodeLength(point.node) : point.offset + 1;
  }

  return { node: node, offset: offset };
}

// Private
const pointUntil = (point, selector, next) => {
  const pred = dom.matchSelector(selector);
  while (point) {
    if (pred(point)) {
      return point;
    }
    point = next ? nextPoint(point) : prevPoint(point);
  }
  return null;
}

const prevPointUntil = (point, selector) => pointUntil(point, selector, false);
const nextPointUntil = (point, selector) => pointUntil(point, selector, true);

/**
 * @method walkPoint - Preorder / depth first traversal of the DOM
 *
 * @param {BoundaryPoint} startPoint
 * @param {BoundaryPoint} endPoint
 * @param {Function} handler
 * @param {Boolean} skipInnerOffset
 */
const walkPoint = (startPoint, endPoint, handler, skipInnerOffset) => {
  let point = startPoint;

  while (point) {
    handler(point);

    if (isSamePoint(point, endPoint)) {
      break;
    }

    const skipOffset = skipInnerOffset &&
                       startPoint.node !== point.node &&
                       endPoint.node !== point.node;
    point = nextPointWithEmptyNode(point, skipOffset);
  }
}


/**
 * Split element or #text
 *
 * @param {BoundaryPoint} point
 * @param {Object} [options]
 * @param {Boolean} [options.isSkipPaddingBlankHTML] - default: false
 * @param {Boolean} [options.isNotSplitEdgePoint] - default: false
 * @param {Boolean} [options.isDiscardEmptySplits] - default: false
 * @return {Node} Right node of boundary point
 */
const splitNode = (point, options) => {
  let isSkipPaddingBlankHTML = options && options.isSkipPaddingBlankHTML;
  const isNotSplitEdgePoint = options && options.isNotSplitEdgePoint;
  const isDiscardEmptySplits = options && options.isDiscardEmptySplits;

  if (isDiscardEmptySplits) {
    isSkipPaddingBlankHTML = true;
  }

  // Edge case
  if (isEdgePoint(point) && (dom.isText(point.node) || isNotSplitEdgePoint)) {
    if (isLeftEdgePoint(point)) {
      return point.node;
    } else if (isRightEdgePoint(point)) {
      return point.node.nextSibling;
    }
  }

  // split #text
  if (dom.isText(point.node)) {
    return point.node.splitText(point.offset);
  } else {
    const childNode = point.node.childNodes[point.offset];
    let childNodes = dom.nextSiblings(childNode);
    // Remove empty nodes
    childNodes = childNodes.filter(func.not(dom.isEmpty));	

    const clone = dom.insertAfter(point.node, point.node.cloneNode(false));
    dom.appendChildNodes(clone, childNodes);

    if (!isSkipPaddingBlankHTML) {
      paddingBlankHTML(point.node);
      paddingBlankHTML(clone);
    }

    if (isDiscardEmptySplits) {
      if (dom.isEmpty(point.node)) {
        dom.remove(point.node);
      }
      if (dom.isEmpty(clone)) {
        dom.remove(clone);
        return point.node.nextSibling;
      }
    }

    return clone;
  }
}

/**
 * Split tree by point
 *
 * @param {Node} root - split root
 * @param {BoundaryPoint} point
 * @param {Object} [options]
 * @param {Boolean} [options.isSkipPaddingBlankHTML] - default: false
 * @param {Boolean} [options.isNotSplitEdgePoint] - default: false
 * @return {Node} Right node of boundary point
 */
const splitTree = (root, point, options) => {
  // ex) [#text, <span>, <p>]
  let parents = dom.parents(point.node, root);

  if (!parents.length) {
    return null;
  } else if (parents.length === 1) {
    return splitNode(point, options);
  }
  // Filter elements with sibling elements
  if (parents.length > 2) {
    let domList = parents.slice(0, parents.length - 1);
    let ifHasNextSibling = domList.find(item => item.nextSibling);
    if (ifHasNextSibling && point.offset != 0 && isRightEdgePoint(point)) {
        let nestSibling = ifHasNextSibling.nextSibling;
        let textNode;
        if (nestSibling.nodeType == 1) {
            textNode = nestSibling.childNodes[0];
            parents = dom.parents(textNode, root);
            point = { node: textNode, offset: 0 };
        }
        else if (nestSibling.nodeType == 3 && !nestSibling.data.match(/[\n\r]/g)) {
            textNode = nestSibling;
            parents = dom.parents(textNode, root);
            point = { node: textNode, offset: 0 };
        }
    }
  }
  return parents.reduce(function(node, parent) {
    if (node === point.node) {
      node = splitNode(point, options);
    }

    return splitNode({
      node: parent,
      offset: node ? dom.position(node) : dom.nodeLength(parent),
    }, options);
  });
}

/**
 * Split point
 *
 * @param {Point} point
 * @param {Boolean} isInline
 * @return {Object}
 */
const splitPoint = (point, isInline) => {
  // find splitRoot, container
  //  - inline: splitRoot is a child of paragraph
  //  - block: splitRoot is a child of bodyContainer
  const pred = isInline ? dom.isPara : dom.isBodyContainer;
  const parents = dom.parents(point.node, pred);
  const topAncestor = lists.last(parents) || point.node;

  let splitRoot, container;
  if (pred(topAncestor)) {
    splitRoot = parents[parents.length - 2];
    container = topAncestor;
  } else {
    splitRoot = topAncestor;
    container = splitRoot.parentNode;
  }

  // if splitRoot exists, split with splitTree
  let pivot = splitRoot && splitTree(splitRoot, point, {
    isSkipPaddingBlankHTML: isInline,
    isNotSplitEdgePoint: isInline,
  });

  // if container is point.node, find pivot with point.offset
  if (!pivot && container === point.node) {
    pivot = point.node.childNodes[point.offset];
  }

  return { rightNode: pivot, container: container };
}

/**
 * Checks whether point1 and point2 is same or not.
 *
 * @param {BoundaryPoint} point1
 * @param {BoundaryPoint} point2
 * @return {Boolean}
 */
const isSamePoint = (point1, point2) =>
  point1.node === point2.node && point1.offset === point2.offset;

/**
 * Checks whether point is visible (can set cursor).
 *
 * @param {BoundaryPoint} point
 * @return {Boolean}
 */
const isVisiblePoint = (point) => {
  if (dom.isText(point.node) || !dom.hasChildren(point.node) || dom.isEmpty(point.node)) {
    return true;
  }

  const leftNode = point.node.childNodes[point.offset - 1];
  const rightNode = point.node.childNodes[point.offset];
  if ((!leftNode || dom.isVoid(leftNode)) && (!rightNode || dom.isVoid(rightNode)) || dom.isTable(rightNode)) {
    return true;
  }

  return false;
}

/**
 * Gets the char type at given point.
 *
 * @param {Point} point
 * @return {Number} - -1 = unknown, 0 = char, 1 = interpunctuation, 2 = space
 */
const getCharType = (point) => {
  if (!dom.isText(point.node)) {
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
const isCharPoint = (point) => getCharType(point) == CharTypes.CHAR;

/**
 * Checks whether point has space or not.
 *
 * @param {Point} point
 * @return {Boolean}
 */
const isSpacePoint = (point) => getCharType(point) == CharTypes.SPACE;

const isZwsp = (char) => char === ZERO_WIDTH_NBSP_CHAR;

const removeZwsp = (s) => s.replace(/\uFEFF/g, '');


export default {
  /** @property {String} NBSP_CHAR */
  NBSP_CHAR,
  /** @property {String} ZERO_WIDTH_NBSP_CHAR */
  ZERO_WIDTH_NBSP_CHAR,
  SOFT_HYPHEN,
  CharTypes,
  isLeftEdgePoint,
  isRightEdgePoint,
  isEdgePoint,
  isLeftEdgePointOf,
  isRightEdgePointOf,
  isLeftEdgePointOf,
  isRightEdgePointOf,
  prevPoint,
  nextPoint,
  nextPointWithEmptyNode,
  isSamePoint,
  isVisiblePoint,
  prevPointUntil,
  nextPointUntil,
  isCharPoint,
  isSpacePoint,
  walkPoint,
  splitTree,
  splitPoint,
  getCharType,
  isCharPoint,
  isSpacePoint,
  isZwsp,
  removeZwsp
}