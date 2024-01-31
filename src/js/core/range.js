import $ from 'jquery';
import func from './func';
import lists from './lists';
import dom from './dom';
import Point from './Point';

const makeIsOn = (selector) => {
  const pred = dom.matchSelector(selector);
  return function() {
    const ancestor = dom.closest(this.sc, pred);
    return !!ancestor && (ancestor === dom.closest(this.ec, pred));
  };
};

// Judge whether range is on editable or not
const isOnEditable = makeIsOn(dom.isEditableRoot);
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
  return new WrappedRange(nativeRange);
};

/**
 * Create a `WrappedRange` object from boundary points.
 *
 * @param {Node} [sc] - start container
 * @param {Number} [so] - start offset
 * @param {Node} [ec] - end container
 * @param {Number} [eo] - end offset
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

    const rng = document.createRange();
    rng.setStart(sc, so);
    rng.setEnd(ec, eo);
  
    return createFromNativeRange(rng);
  }

  let rng = createFromSelection();

  if (!rng && len === 1) {
    let bodyElement = arguments[0];
    if (dom.isEditableRoot(bodyElement)) {
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
    return create(startPoint.node, startPoint.offset);
  } else {
    return create(startPoint.node, startPoint.offset, endPoint.node, endPoint.offset);
  }
};

/**
 * Create a `WrappedRange` object from the current browser selection.
 *
 * @return {WrappedRange}
 */
const createFromSelection = () => {
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  } else if (dom.isBody(selection.anchorNode)) {
    // Firefox: returns entire body as range on initialization.
    // We won't ever need it.
    return null;
  }

  return new WrappedRange(selection.getRangeAt(0));
};

const createFromBodyElement = (bodyElement, isCollapsedToStart = false) => {
  var wrappedRange = createFromNode(bodyElement);
  return wrappedRange.collapse(isCollapsedToStart);
};

/**
 * Create a `WrappedRange` object from a DOM node.
 *
 * @return {WrappedRange}
 */
const createFromNode = (node) => {
  let sc = node;
  let so = 0;
  let ec = node;
  let eo = dom.nodeLength(ec);

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

  return create(sc, so, ec, eo);
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
 * Create a `WrappedRange` object from a bookmark.
 *
 * @return {WrappedRange}
 */
const createFromBookmark = (editable, bookmark) => {
  const sc = dom.fromOffsetPath(editable, bookmark.s.path);
  const so = bookmark.s.offset;
  const ec = dom.fromOffsetPath(editable, bookmark.e.path);
  const eo = bookmark.e.offset;
  return create(sc, so, ec, eo);
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
  return create(sc, so, ec, eo);
};

const skipEmptyTextNodes = (node, forwards) => {
  const orig = node;
  while (node && dom.isText(node) && node.length === 0) {
    node = forwards ? node.nextSibling : node.previousSibling;
  }
  return node || orig;  
}

/**
 * Wrapped Range
 *
 * @constructor
 * @param {Range} nativeRange - The native `Range` object instance to wrap.
 */
class WrappedRange {
  constructor(nativeRange) {
    this._rng = nativeRange;

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

  clone() {
    return createFromNativeRange(this._rng.cloneRange());
  }

  /**
   * Gets underlying native `Range` object
   */
  get nativeRange() {
    return this._rng;
  }

  get sc() {
    return this._rng.startContainer;
  }

  get so() {
    return this._rng.startOffset;
  }
  set so(value) {
    return this._rng.setStart(this._rng.startContainer, value);
  }

  get ec() {
    return this._rng.endContainer;
  }

  get eo() {
    return this._rng.endOffset;
  }
  set eo(value) {
    return this._rng.setEnd(this._rng.endContainer, value);
  }

  getPoints() {
    return {
      sc: this.sc,
      so: this.so,
      ec: this.ec,
      eo: this.eo,
    };
  }

  getStartPoint() {
    return {
      node: this.sc,
      offset: this.so,
    };
  }

  getEndPoint() {
    return {
      node: this.ec,
      offset: this.eo,
    };
  }

  walk(callback) {
    const startOffset = this.so;
    const startContainer = dom.getRangeNode(this.sc, startOffset);
    const endOffset = this.eo;
    const endContainer = dom.getRangeNode(this.ec, endOffset - 1);

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
    const rng = this._rng;
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
    if (container.scrollTop + height < this.sc.offsetTop) {
      container.scrollTop += Math.abs(container.scrollTop + height - this.sc.offsetTop);
    }

    return this;
  }

  /**
   * Normalizes the range by finding the closest best suitable caret location.
   *
   * @return {WrappedRange} - Current instance for chaining.
   */
  normalize() {
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
    const startPoint = this.isCollapsed() ? endPoint : getVisiblePoint(this.getStartPoint(), true);

    this.setStart(startPoint.node, startPoint.offset);
    this.setEnd(endPoint.node, endPoint.offset);

    return this;
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
   * Gets commonAncestor of range
   * @return {Element} - commonAncestor
   */
  commonAncestor() {
    return this._rng.commonAncestorContainer;
  }

  /**
   * Gets expanded range by selector
   *
   * @param {Function|String|Node} selector - Selector function, string or node.
   * @return {WrappedRange}
   */
  expand(selector) {
    const pred = dom.matchSelector(selector);
    const startAncestor = dom.closest(this.sc, pred);
    const endAncestor = dom.closest(this.ec, pred);

    if (!startAncestor && !endAncestor) {
      return create(this.sc, this.so, this.ec, this.eo);
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
   * Collapses the Range to one of its boundary points.
   * 
   * @param {Boolean} toStart
   * @return {WrappedRange}
   */
  collapse(toStart) {
    this._rng.collapse(toStart);
    return this;
  }

  /**
   * Sets the start position of a `Range`.
   * 
   * @param {Node} startNode
   * @param {Number} startOffset
   * @return {WrappedRange}
   */
  setStart(startNode, startOffset) {
    this._rng.setStart(startNode, startOffset);
    return this;
  }

  /**
   * Sets the end position of a `Range`.
   * 
   * @param {Node} endNode
   * @param {Number} endOffset
   * @return {WrappedRange}
   */
  setEnd(endNode, endOffset) {
    this._rng.setEnd(endNode, endOffset);
    return this;
  }

  getNode(root) {
    const rng = this._rng;
    const startOffset = rng.startOffset;
    const endOffset = rng.endOffset;
    let startContainer = rng.startContainer;
    let endContainer = rng.endContainer;
    let node = rng.commonAncestorContainer;

    // Handle selection a image or other control like element such as anchors
    if (!rng.collapsed) {
      if (startContainer === endContainer) {
        if (endOffset - startOffset < 2) {
          if (startContainer.hasChildNodes()) {
            node = startContainer.childNodes[startOffset];
          }
        }
      }

      // If the anchor node is a element instead of a text node then return this element
      // if (isWebKit && sel.anchorNode && sel.anchorNode.nodeType == 1)
      // return anchorNode.childNodes[sel.anchorOffset];

      // Handle cases where the selection is immediately wrapped around a node and return that node instead of it's parent.
      // This happens when you double click an underlined word in FireFox.
      if (dom.isText(startContainer) && dom.isText(endContainer)) {
        if (startContainer.length === startOffset) {
          startContainer = skipEmptyTextNodes(startContainer.nextSibling, true);
        } else {
          startContainer = startContainer.parentNode;
        }

        if (endOffset === 0) {
          endContainer = skipEmptyTextNodes(endContainer.previousSibling, false);
        } else {
          endContainer = endContainer.parentNode;
        }

        if (startContainer && startContainer === endContainer) {
          node = startContainer;
        }
      }
    }

    const elm = dom.isText(node) ? node.parentNode : node;
    return dom.isHTMLElement(elm) ? elm : root || dom.getEditableRoot(elm);
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
   * Delete contents on range
   * @return {WrappedRange}
   */
  deleteContents() {
    this._rng.deleteContents();
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
    return this.sc === this.ec;
  }

  /**
   * Checks whether range is collapsed
   */
  isCollapsed() {
    return this._rng.collapsed;
  }

  /**
   * Checks if the current range’s start and end containers are editable within their parent’s contexts.
   */
  isEditable() {
    const rng = this._rng;
    if (rng.collapsed) {
      return dom.isContentEditable(rng.startContainer);
    } else {
      return dom.isContentEditable(rng.startContainer) && dom.isContentEditable(rng.endContainer);
    }
  }

  /**
   * Wrap inline nodes which children of body with paragraph
   *
   * @return {WrappedRange}
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
    if (dom.isInline(rng.sc)) {
      const ancestors = dom.parents(rng.sc, func.not(dom.isInline));
      topAncestor = lists.last(ancestors);
      if (!dom.isInline(topAncestor)) {
        topAncestor = ancestors[ancestors.length - 2] || rng.sc.childNodes[rng.so];
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
   * Insert node at current cursor
   *
   * @param {Node} node
   * @param {Boolean} doNotInsertPara - default is false, removes added <p> that's added if true
   * @return {Node}
   */
  insertNode(node, doNotInsertPara = false) {
    let rng = this;

    if (dom.isText(node) || dom.isInline(node)) {
      rng = this.wrapBodyInlineWithPara().deleteContents();
    }

    const info = Point.splitPoint(rng.getStartPoint(), dom.isInline(node));
    if (info.rightNode) {
      info.rightNode.parentNode.insertBefore(node, info.rightNode);
      if (dom.isEmpty(info.rightNode) && (doNotInsertPara || dom.isPara(node))) {
        info.rightNode.parentNode.removeChild(info.rightNode);
      }
    } else {
      info.container.appendChild(node);
    }

    return node;
  }

  /**
   * Insert html at current cursor
   */
  pasteHTML(markup) {
    markup = markup.trim();

    const contentsContainer = $('<div></div>').html(markup)[0];
    let childNodes = lists.from(contentsContainer.childNodes);

    // const rng = this.wrapBodyInlineWithPara().deleteContents();
    const rng = this;
    let reversed = false;

    if (rng.so >= 0) {
      childNodes = childNodes.reverse();
      reversed = true;
    }

    childNodes = childNodes.map(function(childNode) {
      return rng.insertNode(childNode, !dom.isInline(childNode));
    });

    if (reversed) {
      childNodes = childNodes.reverse();
    }

    return childNodes;
  }

  /**
   * Returns text in range
   *
   * @return {String}
   */
  toString() {
    return this.nativeRange.toString();
  }

  /**
   * Returns range for word before and (optionally) after cursor
   *
   * @param {Boolean} [findAfter] - Find after cursor also, default: false
   * @return {WrappedRange}
   */
  getWordRange(findAfter) {
    let endPoint = this.getEndPoint();
    const endOffset = endPoint.offset;
    
    if (!Point.isCharPoint(endPoint)) {
      return this;
    }

    const startPoint = Point.prevPointUntil(endPoint, function(point) {
      return !Point.isCharPoint(point);
    });

    if (findAfter) {
      endPoint = Point.nextPointUntil(endPoint, function(point) {
        return !Point.isCharPoint(point);
      });
    }

    this.setStart(startPoint.node, startPoint.offset);
    this.setEnd(endPoint.node, Math.max(endPoint.offset - 1, endOffset));

    return this;
  }

  /**
   * Returns range for words before cursor
   *
   * @param {Boolean} [findAfter] - find after cursor, default: false
   * @return {WrappedRange}
   */
  getWordsRange(findAfter) {
    var endPoint = this.getEndPoint();

    var isNotTextPoint = function(point) {
      return !Point.isCharPoint(point) && !Point.isSpacePoint(point);
    };

    if (isNotTextPoint(endPoint)) {
      return this;
    }

    var startPoint = Point.prevPointUntil(endPoint, isNotTextPoint);

    if (findAfter) {
      endPoint = Point.nextPointUntil(endPoint, isNotTextPoint);
    }

    this.setStart(startPoint.node, startPoint.offset);
    this.setEnd(endPoint.node, endPoint.offset);

    return this;
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
   * @return {WrappedRange|null}
   */
  getWordsMatchRange(regex) {
    var endPoint = this.getEndPoint();

    var startPoint = Point.prevPointUntil(endPoint, function(point) {
      if (!Point.isCharPoint(point) && !Point.isSpacePoint(point)) {
        return true;
      }
      var rng = createFromPoints(point, endPoint);
      var result = regex.exec(rng.toString());
      return result && result.index === 0;
    });

    var rng = createFromPoints(startPoint, endPoint);

    var text = rng.toString();
    var result = regex.exec(text);

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
  bookmark(editable) {
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
  paraBookmark(paras) {
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

  /**
   * getClientRects
   * @return {Rect[]}
   */
  getClientRects() {
    return this.nativeRange.getClientRects();
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
  createFromBookmark,
  createFromParaBookmark,
  createFromNativeRange,
  createFromPoints
};
