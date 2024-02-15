import $ from 'jquery';
import func from './func';
import lists from './lists';
import dom from './dom';
import Point from './Point';
import Type from './Type';
// import * as NormalizeRange from '../util/NormalizeRange';
// import schema from './schema';

const makeIsOn = (selector, root) => {
  const pred = dom.matchSelector(selector);
  return function() {
    const ancestor = dom.closest(this.sc, pred, true, root);
    return !!ancestor && (ancestor === dom.closest(this.ec, pred, true, root));
  };
};

const makeCharPredicate = (opts) => {
  // -1 = UNKNOWN, 0 = SPACE, 1 = PUNC, 2 = CHAR
  const stopAtPunc = opts?.stopAtPunc === true;
  if (stopAtPunc) {
    return func.not(Point.isCharPoint); // Stop at any non-char
  } else {
    return (pt) => Point.getCharType(pt) < 1; // Stop at space/unknown only
  }
};

const detachRange = (rng) => {
  try { rng.detach(); } catch {}
};

const callNative = (rng, action) => {
  let detach = false;
  if (rng.isWrapper) {
    rng = getNativeRange(rng);
    detach = true;
  }

  const out = action(rng);

  if (detach) detachRange(rng);
  return out;
};

const getNativeRange = (rng) => {
  if (rng.isWrapper) {
    const {sc, so, ec, eo} = rng;
    rng = document.createRange();
    rng.setStart(sc, so);
    rng.setEnd(ec, eo);
  }
  return rng;
};

const getWrappedRange = (rng) => {
  return rng.isWrapper ? rng : createFromNativeRange(rng);
};

/**
 * Checks whether the given range is completely within the boundaries of the given node.
 */
const isFullyContainedInNode = (rng, node) => {
  return dom.isChildOf(rng.startContainer, node, true) && (rng.endContainer == rng.startContainer || dom.isChildOf(rng.endContainer, node, true));
}

// Judge whether range is on editable or not
const isOnEditable = makeIsOn(dom.isEditableRoot, 'div.note-editing-area');
// Judge whether range is on list node or not
const  isOnList = makeIsOn(dom.isList);
// Judge whether range is on anchor node or not
const isOnAnchor = makeIsOn(dom.isAnchor);
// Judge whether range is on cell node or not
const isOnCell = makeIsOn(dom.isCell);
// Judge whether range is on data node or not
const isOnData = makeIsOn(dom.isData);


/**
 * Create a `WrappedRange` object from a native `Range` object.
 *
 * @param {Range} nativeRange - The native range
 * @return {WrappedRange}
 */
const createFromNativeRange = (nativeRange) => {
  const r = nativeRange;
  return new WrappedRange(r.startContainer, r.startOffset, r.endContainer, r.endOffset);
};

/**
 * Create a `WrappedRange` object from boundary points.
 *
 * @param {Node} [sc] - Start container
 * @param {Number} [so] - Start offset
 * @param {Node} [ec] - End container
 * @param {Number} [eo] - End offset
 * @return {WrappedRange}
 */
function create(sc, so, ec, eo) {
  const len = arguments.length;
  if (len === 2 || len === 4) {

    if (len === 2) {
      // Collapsed
      ec = sc;
      eo = so;
    }

    return new WrappedRange(sc, so, ec, eo);
  }

  let rng = createFromSelection();

  if (!rng && len === 1) {
    let bodyElement = arguments[0];
    if (dom.isEditableRoot(sc)) {
      bodyElement = bodyElement.lastChild;
    }
    
    return createFromBodyElement(bodyElement, dom.emptyPara === arguments[0].innerHTML);
  }

  return rng;
};

/**
 * Create a `WrappedRange` object from start end end point objects.
 *
 * @return {WrappedRange}
 */
const createFromPoints = (startPoint, endPoint) => {
  if (!endPoint) {
    return new WrappedRange(startPoint.node, startPoint.offset);
  } else {
    return new WrappedRange(startPoint.node, startPoint.offset, endPoint.node, endPoint.offset);
  }
};

/**
 * Create a `WrappedRange` object from the current browser selection.
 *
 * @return {WrappedRange}
 */
const createFromSelection = () => {
  const selection = window.getSelection ? window.getSelection() : window.document.selection;
  if (!selection || selection.rangeCount === 0) {
    return null;
  } else if (dom.isBody(selection.anchorNode)) {
    // Firefox: returns entire body as range on initialization.
    // We won't ever need it.
    return null;
  }

  return createFromNativeRange(selection.getRangeAt(0));
};

const createFromBodyElement = (bodyElement, collapseToStart = false) => {
  var wrappedRange = createFromNode(bodyElement);
  return wrappedRange.collapse(collapseToStart);
};

/**
 * Create a `WrappedRange` object from a DOM node.
 *
 * @return {WrappedRange}
 */
const createFromNode = (node) => {
  let sc = node, so = 0, ec = node, eo = dom.nodeLength(ec);

  // Browsers can't target a picture or void node
  if (dom.isVoid(sc)) {
    so = dom.prevSiblings(sc).length - 1;
    sc = sc.parentNode;
  }

  if (dom.isBR(ec)) {
    eo = dom.prevSiblings(ec).length - 1;
    ec = ec.parentNode;
  } else if (dom.isVoid(ec)) {
    eo = dom.prevSiblings(ec).length;
    ec = ec.parentNode;
  }

  return new WrappedRange(sc, so, ec, eo);
};

/**
 * Create a `WrappedRange` object from a DOM node, collapsed to start.
 *
 * @return {WrappedRange}
 */
const createFromNodeBefore = (node) => {
  return createFromNode(node).collapse(true);
};

/**
 * Create a `WrappedRange` object from a DOM node, collapsed to end.
 *
 * @return {WrappedRange}
 */
const createFromNodeAfter = (node) => {
  return createFromNode(node).collapse(false);
};

  /**
   * Creates a new range from the list of element nodes.
   *
   * @param {Node[]} nodes - DOM element list
   * @return {WrappedRange}
   */
  const createFromNodes = (nodes) => {
    const startRange = createFromNodeBefore(lists.head(nodes));
    const startPoint = startRange.getStartPoint();
    const endRange = createFromNodeAfter(lists.last(nodes));
    const endPoint = endRange.getEndPoint();

    return create(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset
    );
  }

/**
 * Create a `WrappedRange` object from a bookmark.
 *
 * @return {WrappedRange}
 */
const createFromBookmark = (editable, bookmark) => {
  const sc = dom.fromOffsetPath(editable, bookmark.s.path);
  const so = bookmark.s.offset;
  const ec = dom.fromOffsetPath(editable, bookmark.e.path);
  const eo = bookmark.e.offset;
  return new WrappedRange(sc, so, ec, eo);
};

/**
 * Create a `WrappedRange` object from a para bookmark.
 *
 * @return {WrappedRange}
 */
const createFromParaBookmark = (bookmark, paras) => {
  const so = bookmark.s.offset;
  const eo = bookmark.e.offset;
  const sc = dom.fromOffsetPath(lists.head(paras), bookmark.s.path);
  const ec = dom.fromOffsetPath(lists.last(paras), bookmark.e.path);
  return new WrappedRange(sc, so, ec, eo);
};

// const skipEmptyTextNodes = (node, forwards) => {
//   const orig = node;
//   while (node && dom.isText(node) && node.length === 0) {
//     node = forwards ? node.nextSibling : node.previousSibling;
//   }
//   return node || orig;  
// }

/**
 * Wrapped Range
 *
  * @param {Node} startContainer - Start container
  * @param {Number} startOffset - Start offset
  * @param {Node} endContainer - End container
  * @param {Number} endOffset - End offset
 */
class WrappedRange {
  constructor(startContainer, startOffset, endContainer, endOffset) {
    this.isWrapper = true;
    this.startContainer = startContainer;
    this.startOffset = startOffset;
    this.endContainer = endContainer;
    this.endOffset = endOffset;
    this.collapsed = startContainer === endContainer && startOffset === endOffset;

    // Judge whether range is on editable or not
    this.isOnEditable = isOnEditable;
    // Judge whether range is on list node or not
    this.isOnList = isOnList;
    // Judge whether range is on anchor node or not
    this.isOnAnchor = isOnAnchor;
    // Judge whether range is on cell node or not
    this.isOnCell = isOnCell;
    // Judge whether range is on data node or not
    this.isOnData = isOnData;
  }

  updateStart(node, offset) {
    if (node != this.startContainer) {
      this._commonParent = undefined;
    }
    this.startContainer = node;
    this.startOffset = offset;
    this.collapsed = node === this.endContainer && offset === this.endOffset;
  }

  updateEnd(node, offset) {
    if (node != this.endContainer) {
      this._commonParent = undefined;
    }
    this.endContainer = node;
    this.endOffset = offset;
    this.collapsed = node === this.startContainer && offset === this.startOffset;
  }

  getNativeRange() {
    return getNativeRange(this);
  }

  equals(other) {
    if (other == this) {
      return true;
    }
    else if (other instanceof WrappedRange || other instanceof Range) {
      const { startContainer, startOffset, endContainer, endOffset } = other;
      return this.startContainer === startContainer &&
        this.startOffset === startOffset &&
        this.endContainer === endContainer &&
        this.endOffset === endOffset;
    }

    return false;
  }

  startEquals(other) {
    if (other == this) {
      return true;
    }
    else if (other instanceof WrappedRange || other instanceof Range) {
      return this.startContainer === other.startContainer && this.startOffset === other.startOffset;
    }
    return false;
  }

  endEquals(other) {
    if (other == this) {
      return true;
    }
    else if (other instanceof WrappedRange || other instanceof Range) {
      return this.endContainer === other.endContainer && this.endOffset === other.endOffset;
    }
    return false;
  }

  // #region Range like properties

  // Legacy. Keep for compat reasons.
  get sc() {
    return this.startContainer;
  }
  get so() {
    return this.startOffset;
  }
  set so(value) {
    return this.updateStart(this.startContainer, value);
  }

  get ec() {
    return this.endContainer;
  }
  get eo() {
    return this.endOffset;
  }
  set eo(value) {
    return this.updateEnd(this.endContainer, value);
  }

  isCollapsed() {
    return this.collapsed;
  }

  // endregion


  // #region Wrapped Range members

  get commonAncestorContainer() {
    if (!this._commonParent) {
      this._commonParent = this.collapsed ? this.startContainer : dom.commonParent(this.startContainer, this.endContainer);
    }
    return this._commonParent
  }

  cloneContents() {
    return callNative(this, x => x.cloneContents());
  }

  cloneRange() {
    return new WrappedRange(this.startContainer, this.startOffset, this.endContainer, this.endOffset);
  }

  collapse(toStart) {
    const node = toStart ? this.startContainer : this.endContainer;
    const offset = toStart ? this.startOffset : this.endOffset;
    this.updateStart(node, offset);
    this.updateEnd(node, offset);
    return this;
  }

  compareBoundaryPoints(how, sourceRange) {
    //return callNative(this, x => x.compareBoundaryPoints(how, getNativeRange(sourceRange)));
    var node1, offset1, node2, offset2;
    var prefix1 = (how == Range.END_TO_START || how == Range.START_TO_START) ? "start" : "end";
    var prefix2 = (how == Range.START_TO_END || how == Range.START_TO_START) ? "start" : "end";
    node1 = this[prefix1 + "Container"];
    offset1 = this[prefix1 + "Offset"];
    node2 = sourceRange[prefix2 + "Container"];
    offset2 = sourceRange[prefix2 + "Offset"];
    return Point.comparePoints({ node: node1, offset: offset1 }, { node: node2, offset: offset2 } );
  }

  compareNode(referenceNode) {
    return callNative(this, x => x.compareNode(referenceNode));
  }

  comparePoint(referenceNode, offset) {
    return callNative(this, x => x.comparePoint(referenceNode, offset));
  }

  createContextualFragment(content) {
    return callNative(this, x => x.createContextualFragment(content));
  }

  // deleteContents_temp() {
  //   callNative(this, x => x.deleteContents());
  //   return this;
  // }

  deleteContents() {
    if (this.collapsed) {
      return this;
    }

    const rng = this.splitText();
    const nodes = rng.nodes(null, {
      fullyContains: true,
    });

    // Find new cursor point
    const point = Point.prevPointUntil(rng.getStartPoint(), (point) => {
      return !lists.contains(nodes, point.node);
    });

    const emptyParents = [];
    lists.each(nodes, (node) => {
      // find empty parents
      const parent = node.parentNode;
      if (point.node !== parent && dom.nodeLength(parent) === 1) {
        emptyParents.push(parent);
      }
      dom.remove(node, false);
    });

    // remove empty parents
    lists.each(emptyParents, (node) => {
      dom.remove(node, false);
    });

    return new WrappedRange(
      point.node,
      point.offset,
      point.node,
      point.offset
    ).normalize();
  }

  detach() {
    // Noop
    return this;
  }

  extractContents() {
    return callNative(this, x => x.extractContents());
  }

  getBoundingClientRect() {
    return callNative(this, x => x.getBoundingClientRect());
  }

  getClientRects() {
    return callNative(this, x => x.getClientRects());
  }

  /**
   * Insert node at current cursor
   *
   * @param {Node} node
   * @param {Boolean} [doNotInsertPara] - Default is false, removes added <p> that's added if true
   * @return {Node}
   */
    insertNode(node, doNotInsertPara = false) {
      let rng = this;
  
      if (dom.isInlineOrText(node)) {
        rng = this.wrapBodyInlineWithPara().deleteContents();
      }

      const info = Point.splitPoint(rng.getStartPoint(), !dom.isBlock(node));

      if (info.rightNode) {
        info.rightNode.parentNode.insertBefore(node, info.rightNode);
        if (dom.isEmpty(info.rightNode) && (doNotInsertPara || dom.isPara(node))) {
          info.rightNode.parentNode.removeChild(info.rightNode);
        }
      } else if (info.container) {
        info.container.appendChild(node);
      }
  
      return node;
    }

  intersectsNode(referenceNode) {
    return callNative(this, x => x.intersectsNode(referenceNode));
  }

  isPointInRange(referenceNode, offset) {
    return callNative(this, x => x.isPointInRange(referenceNode, offset));
  }

  selectNode(referenceNode) {
    const start = Point.pointBeforeNode(referenceNode);
    const end = Point.pointAfterNode(referenceNode);
    this.updateStart(start.node, start.offset);
    this.updateEnd(end.node, end.offset);
    return this;
  }

  selectNodeContents(referenceNode) {
    this.updateStart(referenceNode, 0);
    this.updateEnd(referenceNode, dom.nodeLength(referenceNode));
    return this;
  }

  setEnd(endNode, endOffset) {
    this.updateEnd(endNode, endOffset);
    return this;
  }

  setEndAfter(referenceNode) {
    const pt = Point.pointAfterNode(referenceNode);
    this.updateEnd(pt.node, pt.offset);
    return this;
  }

  setEndBefore(referenceNode) {
    const pt = Point.pointBeforeNode(referenceNode);
    this.updateEnd(pt.node, pt.offset);
    return this;
  }

  setStart(startNode, startOffset) {
    this.updateStart(startNode, startOffset);
    return this;
  }

  setStartAfter(referenceNode) {
    const pt = Point.pointAfterNode(referenceNode);
    this.updateStart(pt.node, pt.offset);
    return this;
  }

  setStartBefore(referenceNode) {
    const pt = Point.pointBeforeNode(referenceNode);
    this.updateStart(pt.node, pt.offset);
    return this;
  }

  surroundContents(newParent) {
    callNative(this, x => {
      x.surroundContents(newParent);
      this.updateStart(x.startContainer, x.startOffset);
      this.updateEnd(x.endContainer, x.endOffset);    
    });
    return this;
  }

  toString() {
    return callNative(this, x => x.toString());
  }

  // #endregion


  // #region Sugar utils

  // #endregion

  getPoints() {
    return {
      sc: this.startContainer,
      so: this.startOffset,
      ec: this.endContainer,
      eo: this.endOffset,
    };
  }

  getStartPoint() {
    return {
      node: this.startContainer,
      offset: this.startOffset,
    };
  }

  getEndPoint() {
    return {
      node: this.endContainer,
      offset: this.endOffset,
    };
  }

  walk(callback) {
    const startOffset = this.startOffset;
    const startContainer = dom.getRangeNode(this.startContainer, startOffset);
    const endOffset = this.endOffset;
    const endContainer = dom.getRangeNode(this.endContainer, endOffset - 1);

    /**
     * Excludes start/end text node if they are out side the range
     *
     * @private
     * @param {Array} nodes Nodes to exclude items from.
     * @return {Array} Array with nodes excluding the start/end container if needed.
     */
    const exclude = (nodes) => {
      // First node is excluded
      const firstNode = nodes[0];
      if (dom.isText(firstNode) && firstNode === startContainer && startOffset >= firstNode.data.length) {
        nodes.splice(0, 1);
      }

      // Last node is excluded
      const lastNode = nodes[nodes.length - 1];
      if (endOffset === 0 && nodes.length > 0 && lastNode === endContainer && dom.isText(lastNode)) {
        nodes.splice(nodes.length - 1, 1);
      }

      return nodes;
    };

    const collectSiblings = (node, name = 'nextSibling' | 'previousSibling', endNode) => {
      const siblings = [];
  
      for (; node && node !== endNode; node = node[name]) {
        siblings.push(node);
      }
      
      return siblings;
    };

    const findEndPoint = (node, root) => {
      return dom.closest(node, n => n.parentNode === root);
    };
      
    const walkBoundary = (startNode, endNode, next) => {
      const siblingName = next ? 'nextSibling' : 'previousSibling';
  
      for (let node = startNode, parent = node.parentNode; node && node !== endNode; node = parent) {
        parent = node.parentNode;
        const siblings = collectSiblings(node === startNode ? node : node[siblingName], siblingName);
  
        if (siblings.length) {
          if (!next) {
            siblings.reverse();
          }
          
          callback(exclude(siblings));
        }
      }
    };

    // Same container
    if (startContainer === endContainer) {
      return callback(exclude([ startContainer ]));
    }

    // Find common ancestor and end points
    const ancestor = dom.commonParent(startContainer, endContainer) || dom.getEditableRoot(startContainer);

    // Process left side
    if (dom.isChildOf(startContainer, endContainer)) {
      return walkBoundary(startContainer, ancestor, true);
    }

    // Process right side
    if (dom.isChildOf(endContainer, startContainer)) {
      return walkBoundary(endContainer, ancestor);
    }

    // Find start/end point
    const startPoint = findEndPoint(startContainer, ancestor) || startContainer;
    const endPoint = findEndPoint(endContainer, ancestor) || endContainer;

    // Walk left leaf
    walkBoundary(startContainer, startPoint, true);

    // Walk the middle from start to end point
    const siblings = collectSiblings(
      startPoint === startContainer ? startPoint : startPoint.nextSibling,
      'nextSibling',
      endPoint === endContainer ? endPoint.nextSibling : endPoint
    );

    if (siblings.length) {
      callback(exclude(siblings));
    }

    // Walk right leaf
    walkBoundary(endContainer, endPoint);
  }



  /**
   * Changes the visible selection to this DOM range.
   * 
  * @param {Boolean} forward Optional boolean if the selection is forwards or backwards.
   */
  select(forward) {
    const sel = window.getSelection ? window.getSelection() : document.selection;
    const rng = getNativeRange(this);
    let selectedRange;

    if (sel) {
      try {
        sel.removeAllRanges();
        sel.addRange(rng);
      } catch (ex) {
        // IE might throw errors here if the editor is within a hidden container and selection is changed
      }

      // Forward is set to false and we have an extend function
      if (forward === false && sel.extend) {
        sel.collapse(rng.endContainer, rng.endOffset);
        sel.extend(rng.startContainer, rng.startOffset);
      }

      // Adding range isn't always successful so we need to check range count otherwise an exception can occur
      selectedRange = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    }

    // WebKit edge case selecting images works better using setBaseAndExtent when the image is floated
    if (!rng.collapsed && rng.startContainer === rng.endContainer && sel?.setBaseAndExtent) {
      if (rng.endOffset - rng.startOffset < 2) {
        if (rng.startContainer.hasChildNodes()) {
          const node = rng.startContainer.childNodes[rng.startOffset];
          if (node && node.nodeName === 'IMG') {
            sel.setBaseAndExtent(
              rng.startContainer,
              rng.startOffset,
              rng.endContainer,
              rng.endOffset
            );

            // Since the setBaseAndExtent is fixed in more recent Blink versions we
            // need to detect if it's doing the wrong thing and falling back to the
            // crazy incorrect behavior api call since that seems to be the only way
            // to get it to work on Safari WebKit as of 2017-02-23
            if (sel.anchorNode !== rng.startContainer || sel.focusNode !== rng.endContainer) {
              sel.setBaseAndExtent(node, 0, node, 1);
            }
          }
        }
      }
    }

    return this;
  }

  /**
   * Moves the scrollbar to start container(sc) of current range
   */
  scrollIntoView(container) {
    const height = $(container).height();
    if (container.scrollTop + height < this.startContainer.offsetTop) {
      container.scrollTop += Math.abs(container.scrollTop + height - this.startContainer.offsetTop);
    }

    return this;
  }

  /**
   * Normalizes the range by finding the closest best suitable caret location.
   *
   * @return {WrappedRange} - Current instance for chaining.
   */
  normalize() {
    // const normRng = NormalizeRange.normalize(this);
    // if (normRng) {
    //   // this.setStart(normRng.startContainer, normRng.startOffset);
    //   // this.setEnd(normRng.endContainer, normRng.endOffset);
    //   return normRng;
    // }

    // return this;

    /**
     * @param {BoundaryPoint} point
     * @param {Boolean} isLeftToRight - true: prefer to choose right node
     *                                - false: prefer to choose left node
     * @return {BoundaryPoint}
     */
    const getVisiblePoint = function(point, isLeftToRight) {
      if (!point) {
        return point;
      }

      // Just use the given point [XXX:Adhoc]
      //  - case 01. if the point is on the middle of the node
      //  - case 02. if the point is on the right edge and prefer to choose left node
      //  - case 03. if the point is on the left edge and prefer to choose right node
      //  - case 04. if the point is on the right edge and prefer to choose right node but the node is void
      //  - case 05. if the point is on the left edge and prefer to choose left node but the node is void
      //  - case 06. if the point is on the block node and there is no children
      if (Point.isVisiblePoint(point)) {
        if (!Point.isEdgePoint(point) ||
            (Point.isRightEdgePoint(point) && !isLeftToRight) ||
            (Point.isLeftEdgePoint(point) && isLeftToRight) ||
            (Point.isRightEdgePoint(point) && isLeftToRight && dom.isVoid(point.node.nextSibling)) ||
            (Point.isLeftEdgePoint(point) && !isLeftToRight && dom.isVoid(point.node.previousSibling)) ||
            (dom.isBlock(point.node) && dom.isEmpty(point.node))) {
          return point;
        }
      }

      // point on block's edge
      const block = dom.closest(point.node, dom.isBlock);
      let hasRightNode = false;

      if (!hasRightNode) {
        const prevPoint = Point.prevPoint(point) || { node: null };
        hasRightNode = (Point.isLeftEdgePointOf(point, block) || dom.isVoid(prevPoint.node)) && !isLeftToRight;
      }

      let hasLeftNode = false;
      if (!hasLeftNode) {
        const nextPoint = Point.nextPoint(point) || { node: null };
        hasLeftNode = (Point.isRightEdgePointOf(point, block) || dom.isVoid(nextPoint.node)) && isLeftToRight;
      }

      if (hasRightNode || hasLeftNode) {
        // returns point already on visible point
        if (Point.isVisiblePoint(point)) {
          return point;
        }
        // reverse direction
        isLeftToRight = !isLeftToRight;
      }

      const nextPoint = isLeftToRight ? Point.nextPointUntil(Point.nextPoint(point), Point.isVisiblePoint)
        : Point.prevPointUntil(Point.prevPoint(point), Point.isVisiblePoint);
      return nextPoint || point;
    };

    const endPoint = getVisiblePoint(this.getEndPoint(), false);
    const startPoint = this.collapsed ? endPoint : getVisiblePoint(this.getStartPoint(), true);

    return new WrappedRange(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset
    );
  }

  /**
   * returns matched nodes on range
   *
   * @param {Function|String|Node} [selector] - Selector function, string or node.
   * @param {Object} [options]
   * @param {Boolean} [options.includeAncestor]
   * @param {Boolean} [options.fullyContains]
   * @return {Node[]}
   */
  nodes(selector, options) {
    const pred = dom.matchSelector(selector, func.ok);
    const includeAncestor = options && options.includeAncestor;
    const fullyContains = options && options.fullyContains;

    // TODO compare points and sort
    const startPoint = this.getStartPoint();
    const endPoint = this.getEndPoint();

    const nodes = [];
    const leftEdgeNodes = [];
    
    Point.walkPoint(startPoint, endPoint, function(point) {
      if (dom.isEditableRoot(point.node)) {
        return;
      }

      let node;
      if (fullyContains) {
        if (Point.isLeftEdgePoint(point)) {
          leftEdgeNodes.push(point.node);
        }
        if (Point.isRightEdgePoint(point) && lists.contains(leftEdgeNodes, point.node)) {
          node = point.node;
        }
      } else if (includeAncestor) {
        node = dom.closest(point.node, pred);
      } else {
        node = point.node;
      }  

      if (node && pred(node)) {
        nodes.push(node);
      }
    }, true);

    return lists.unique(nodes);
  }

  /**
   * Gets expanded range by selector
   *
   * @param {Function|String|Node} selector - Selector function, string or node.
   * @return {WrappedRange}
   */
  expand(selector) {
    const pred = dom.matchSelector(selector);
    const startAncestor = dom.closest(this.startContainer, pred);
    const endAncestor = dom.closest(this.endContainer, pred);

    if (!startAncestor && !endAncestor) {
      return this;
    }

    const pts = this.getPoints();

    if (startAncestor) {
      pts.sc = startAncestor;
      pts.so = 0;
    }

    if (endAncestor) {
      pts.ec = endAncestor;
      pts.eo = dom.nodeLength(endAncestor);
    }

    this.setStart(pts.sc, pts.so);
    this.setEnd(pts.ec, pts.eo);

    return this;
  }

  /**
   * Splits text on range and returns a new range.
   */
  splitText() {
    const pts = this.getPoints();

    // Handle single text node
    if (pts.sc === pts.ec && dom.isText(pts.sc)) {
      if (pts.so > 0 && pts.so < pts.sc.data.length) {
        pts.ec = pts.sc.splitText(pts.so);
        pts.sc = pts.ec.previousSibling;

        if (pts.eo > pts.so) {
          pts.eo = pts.eo - pts.so;
          const newContainer = pts.ec.splitText(pts.eo).previousSibling;
          pts.sc = pts.ec = newContainer;
          pts.eo = newContainer.data.length;
          pts.so = 0;
        } else {
          pts.eo = 0;
        }
      }
    } else {
      // Split startContainer text node if needed
      if (dom.isText(pts.sc) && pts.so > 0 && pts.so < pts.sc.data.length) {
        pts.sc = pts.sc.splitText(pts.so);
        pts.so = 0;
      }

      // Split endContainer text node if needed
      if (dom.isText(pts.ec) && pts.eo > 0 && pts.eo < pts.ec.data.length) {
        const newContainer = pts.ec.splitText(pts.eo).previousSibling;
        pts.ec = newContainer;
        pts.eo = newContainer.data.length;
      }
    }

    return create(pts.sc, pts.so, pts.ec, pts.eo);
  }

  splitText_old() {
    // TODO: Remove range.splitText_old()
    const isSameContainer = this.sc === this.ec;
    const pts = this.getPoints();

    if (dom.isText(this.ec) && !Point.isEdgePoint(this.getEndPoint())) {
      this.ec.splitText(this.eo);
    }

    if (dom.isText(this.sc) && !Point.isEdgePoint(this.getStartPoint())) {
      pts.sc = this.sc.splitText(this.so);
      pts.so = 0;

      if (isSameContainer) {
        pts.ec = pts.sc;
        pts.eo = this.eo - this.so;
      }
    }

    this.setStart(pts.sc, pts.so);
    this.setEnd(pts.ec, pts.eo);

    return this;
  }

  /**
   * @param {Function} pred
   * @return {Boolean}
   */
  isLeftEdgeOf(selector) {
    if (!Point.isLeftEdgePoint(this.getStartPoint())) {
      return false;
    }

    const node = dom.closest(this.sc, selector);
    return node && dom.isLeftEdgeOf(this.sc, node);
  }

  /**
   * Checks whether range is within a single container
   */
  isSingleContainer() {
    return this.startContainer === this.endContainer;
  }

  /**
   * Wrap inline nodes which children of body with paragraph
   *
   * @return {WrappedRange} - A new `WrappedRange` instance.
   */
  wrapBodyInlineWithPara() {
    if (dom.isBodyContainer(this.sc) && dom.isEmpty(this.sc)) {
      this.sc.innerHTML = dom.emptyPara;
      return create(this.sc.firstChild, 0, this.sc.firstChild, 0);
    }

    /**
     * [workaround] firefox often create range on not visible point. so normalize here.
     *  - firefox: |<p>text</p>|
     *  - chrome: <p>|text|</p>
     */
    const rng = this.normalize();
    if (dom.isParaInline(this.sc) || dom.isPara(this.sc)) {
      return rng;
    }

    // find inline top ancestor
    let topAncestor;
    if (!dom.isBlock(rng.sc)) {
      const ancestors = dom.parents(rng.sc, dom.isBlock);
      topAncestor = lists.last(ancestors);
      if (dom.isBlock(topAncestor)) {
        topAncestor = ancestors[ancestors.length - 2] || rng.sc.childNodes[rng.so];
        //console.log('wrapBodyInlineWithPara topAncestor', topAncestor);
      }
    } else {
      topAncestor = rng.sc.childNodes[rng.so > 0 ? rng.so - 1 : 0];
    }

    if (topAncestor) {
      // siblings not in paragraph
      let inlineSiblings = dom.prevSiblings(topAncestor, dom.isParaInline).reverse();
      inlineSiblings = inlineSiblings.concat(dom.nextSiblings(topAncestor.nextSibling, dom.isParaInline));

      // wrap with paragraph
      if (inlineSiblings.length) {
        const para = dom.wrap(lists.head(inlineSiblings), 'p');
        dom.appendChildNodes(para, lists.tail(inlineSiblings));
      }
    }

    return this.normalize();
  }

  /**
   * Insert html at current cursor
   */
  pasteHTML(markup) {
    markup = markup.trim();
    
    const contentsContainer = dom.create('div', null, markup);
    let childNodes = lists.from(contentsContainer.childNodes);

    // const rng = this.wrapBodyInlineWithPara().deleteContents();
    const rng = this;
    let reversed = false;

    if (rng.so >= 0) {
      childNodes = childNodes.reverse();
      reversed = true;
    }

    childNodes = childNodes.map(function(childNode) {
      return rng.insertNode(childNode, dom.isBlock(childNode));
    });

    if (reversed) {
      childNodes = childNodes.reverse();
    }

    return childNodes;
  }

  /**
   * Returns range for word before and (optionally) after cursor
   *
   * @param {Boolean} [forward] - Find after cursor also, default: false
   * @param {Object|boolean|null} [options] - Optional find word options.
   * @param {Boolean} [options.forward] - Find after cursor also, default: false.
   * @param {Boolean} [options.stopAtPunc] - Stop at punctuation char, default: false.
   * @param {Boolean} [options.trim] - Skip trailing space char, default: false.
   * @return {WrappedRange} - A new `WrappedRange` instance.
   */
  getWordRange(options) {
    let endPoint = this.getEndPoint();
    //const endOffset = endPoint.offset;
    const pred = makeCharPredicate(options);
    const forward = Type.isBoolean(options) ? options : (options?.forward === true);
    const trim = options?.trim === true;

    if (pred(endPoint)) {
      return this;
    }

    const startPoint = Point.prevPointUntil(endPoint, pred);

    if (forward) {
      endPoint = Point.nextPointUntil(endPoint, pred);
    }

    if (forward && trim && !Point.equals(this.getEndPoint(), endPoint)) {
      // Trim last space or punc
      const stopAtPunc = options?.stopAtPunc === true;
      const charType = Point.getCharType(endPoint);
      if (charType < 1 || (!stopAtPunc || charType === 1)) {
        // Walk back one point
        endPoint = Point.prevPoint(endPoint);
      }
    }

    return new WrappedRange(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset, //!trim ? endPoint.offset : Math.max(endPoint.offset - 1, endOffset)
    );
  }

  /**
   * Returns range for words before cursor
   *
   * @param {Boolean} [findAfter] - find after cursor, default: false
   * @return {WrappedRange} - A new `WrappedRange` instance.
   */
  getWordsRange(findAfter) {
    var endPoint = this.getEndPoint();

    const isNotTextPoint = (point) => {
      return Point.getCharType(point) === -1;
    };

    if (isNotTextPoint(endPoint)) {
      return this;
    }

    const startPoint = Point.prevPointUntil(endPoint, isNotTextPoint);

    if (findAfter) {
      endPoint = Point.nextPointUntil(endPoint, isNotTextPoint);
    }

    return new WrappedRange(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset
    );
  }

  /**
   * Returns range for words before cursor that match with a Regex
   *
   * example:
   *  range: 'hi @Peter Pan'
   *  regex: '/@[a-z ]+/i'
   *  return range: '@Peter Pan'
   *
   * @param {RegExp} [regex]
   * @return {WrappedRange|null} - A new `WrappedRange` instance or `null`.
   */
  getWordsMatchRange(regex) {
    const endPoint = this.getEndPoint();

    const startPoint = Point.prevPointUntil(endPoint, (point) => {
      if (Point.getCharType(point) === -1) {
        return true;
      }
      const rng = createFromPoints(point, endPoint);
      const result = regex.exec(rng.toString());
      return result && result.index === 0;
    });

    const rng = createFromPoints(startPoint, endPoint);

    const text = rng.toString();
    const result = regex.exec(text);

    if (result && result[0].length === text.length) {
      return rng;
    } else {
      return null;
    }
  }

  /**
   * Create offsetPath bookmark
   *
   * @param {Node} editable
   */
  createBookmark(editable) {
    return {
      s: {
        path: dom.makeOffsetPath(editable, this.sc),
        offset: this.so,
      },
      e: {
        path: dom.makeOffsetPath(editable, this.ec),
        offset: this.eo,
      },
    };
  }

  /**
   * Create offsetPath bookmark base on paragraph
   *
   * @param {Node[]} paras
   */
  createParaBookmark(paras) {
    return {
      s: {
        path: lists.tail(dom.makeOffsetPath(lists.head(paras), this.sc)),
        offset: this.so,
      },
      e: {
        path: lists.tail(dom.makeOffsetPath(lists.last(paras), this.ec)),
        offset: this.eo,
      },
    };
  }
}

/**
 * Data structure
 *  * BoundaryPoint: a point of dom tree
 *  * BoundaryPoints: two boundaryPoints corresponding to the start and the end of the Range
 *
 * See to http://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html#Level-2-Range-Position
 */
export default {
  create,
  createFromBodyElement,
  createFromSelection,
  createFromNode,
  createFromNodeBefore,
  createFromNodeAfter,
  createFromNodes,
  createFromBookmark,
  createFromParaBookmark,
  createFromNativeRange,
  createFromPoints,
  getWrappedRange,
  getNativeRange,
  isFullyContainedInNode
};
