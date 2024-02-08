import dom from '../core/dom';
import schema from '../core/schema';
import DomTreeWalker from './DomTreeWalker';

const toPoint = (node, offset) => {
  return { node: node, offset: offset };
};

const findParent = (node, rootNode, predicate) => {
  let currentNode = node;
  while (currentNode && currentNode !== rootNode) {
    if (predicate(currentNode)) {
      return currentNode;
    }

    currentNode = currentNode.parentNode;
  }

  return null;
};

const hasParent = (node, rootNode, predicate) =>
  findParent(node, rootNode, predicate) !== null;

const hasParentWithName = (node, rootNode, name) =>
  hasParent(node, rootNode, (node) => node.nodeName === name);


const hasBrBeforeAfter = (node, left) => {
  const parentNode = node.parentNode;
  if (parentNode) {
    const walker = new DomTreeWalker(node, dom.closest(parentNode, dom.isBlock) || dom.getEditableRoot(node));

    let currentNode;
    while ((currentNode = walker[left ? 'prev' : 'next']())) {
      if (dom.isBR(currentNode)) {
        return true;
      }
    }
  }

  return false;
};

const isPrevNode = (node, name) =>
  node.previousSibling?.nodeName === name;

// Walks the dom left/right to find a suitable text node to move the endpoint into
// It will only walk within the current parent block or body and will stop if it hits a block or a BR/IMG
const findTextNodeRelative = (isAfterNode, collapsed, left, startNode) => {
  const body = dom.getEditableRoot(startNode);
  const nonEmptyElementsMap = schema.getNonEmptyElements();
  const parentNode = startNode.parentNode;
  let lastInlineElement;
  let node;

  if (!parentNode) {
    return null;
  }

  const parentBlockContainer = dom.closest(parentNode, dom.isBlock) || body;

  // Lean left before the BR element if it's the only BR within a block element. Gecko bug: #6680
  // This: <p><br>|</p> becomes <p>|<br></p>
  if (left && dom.isBR(startNode) && isAfterNode && dom.isEmpty(parentBlockContainer)) {
    return toPoint(parentNode, dom.position(startNode));
  }

  // Walk left until we hit a text node we can move to or a block/br/img
  const walker = new DomTreeWalker(startNode, parentBlockContainer);
  while ((node = walker[left ? 'prev' : 'next']())) {
    // Break if we hit a non content editable node
    if (!dom.isContentEditable(node)) {
      return null;
    }

    // Found text node that has a length
    if (dom.isText(node) && node.data.length > 0) {
      if (!hasParentWithName(node, body, 'A')) {
        return toPoint(node, left ? node.data.length : 0);
      }

      return null;
    }

    // Break if we find a block or a BR/IMG/INPUT etc
    if (dom.isBlock(node) || nonEmptyElementsMap[node.nodeName.toLowerCase()]) {
      return null;
    }

    lastInlineElement = node;
  }

  if (dom.isComment(lastInlineElement)) {
    return null;
  }

  // Only fetch the last inline element when in caret mode for now
  if (collapsed && lastInlineElement) {
    return toPoint(lastInlineElement, 0);
  }

  return null;
};

const normalizeEndPoint = (collapsed, start, rng) => {
  const body = dom.getEditableRoot(rng.startContainer);
  let node;
  let normalized = false;

  let container = start ? rng.startContainer : rng.endContainer;
  let offset = start ? rng.startOffset : rng.endOffset;
  const isAfterNode = dom.isElement(container) && offset === container.childNodes.length;
  const nonEmptyElementsMap = schema.getNonEmptyElements();
  let directionLeft = start;

  if (dom.isElement(container) && offset > container.childNodes.length - 1) {
    directionLeft = false;
  }

  // If the container is a document move it to the body element
  if (dom.isDocument(container)) {
    container = body;
    offset = 0;
  }

  // If the container is body try move it into the closest text node or position
  if (container === body) {
    // If start is before/after a image, table etc
    if (directionLeft) {
      node = container.childNodes[offset > 0 ? offset - 1 : 0];
      if (node) {
        if (nonEmptyElementsMap[node.nodeName] || dom.isTable(node)) {
          return null;
        }
      }
    }
    
    // Resolve the index
    if (container.hasChildNodes()) {
      offset = Math.min(!directionLeft && offset > 0 ? offset - 1 : offset, container.childNodes.length - 1);
      container = container.childNodes[offset];
      offset = dom.isText(container) && isAfterNode ? container.data.length : 0;

      // Don't normalize non collapsed selections like <p>[a</p><table></table>]
      if (!collapsed && container === body.lastChild && dom.isTable(container)) {
        return null;
      }

      if (dom.isDetails(container)) {
        return null;
      }

      // Don't walk into elements that doesn't have any child nodes like a IMG
      if (container.hasChildNodes() && !dom.isTable(container)) {
        // Walk the DOM to find a text node to place the caret at or a BR
        node = container;
        const walker = new DomTreeWalker(container, body);

        do {
          if (!dom.isContentEditable(node)) {
            normalized = false;
            break;
          }

          // Found a text node use that position
          if (dom.isText(node) && node.data.length > 0) {
            offset = directionLeft ? 0 : node.data.length;
            container = node;
            normalized = true;
            break;
          }

          // Found a BR/IMG/PRE element that we can place the caret before
          if (nonEmptyElementsMap[node.nodeName.toLowerCase()] && !dom.isCellOrCaption(node)) {
            offset = dom.position(node);
            container = node.parentNode;

            // Put caret after image and pre tag when moving the end point
            if (!directionLeft) {
              offset++;
            }

            normalized = true;
            break;
          }
        } while ((node = (directionLeft ? walker.next() : walker.prev())));
      }
    }
  }

  // Lean the caret to the left if possible
  if (collapsed) {
    // So this: <b>x</b><i>|x</i>
    // Becomes: <b>x|</b><i>x</i>
    // Seems that only gecko has issues with this
    if (dom.isText(container) && offset === 0) {
      const textNode = findTextNodeRelative(isAfterNode, collapsed, true, container);
      if (textNode) {
        container = textNode.node;
        offset = textNode.offset;
        normalized = true;
      }
    }

    // Lean left into empty inline elements when the caret is before a BR
    // So this: <i><b></b><i>|<br></i>
    // Becomes: <i><b>|</b><i><br></i>
    // Seems that only gecko has issues with this.
    // Special edge case for <p><a>x</a>|<br></p> since we don't want <p><a>x|</a><br></p>
    if (dom.isElement(container)) {
      node = container.childNodes[offset];

      // Offset is after the containers last child
      // then use the previous child for normalization
      if (!node) {
        node = container.childNodes[offset - 1];
      }

      if (node && dom.isBR(node) && !isPrevNode(node, 'A') &&
        !hasBrBeforeAfter(node, false) && !hasBrBeforeAfter(node, true)) {
        const textNode = findTextNodeRelative(isAfterNode, collapsed, true, node);
        if (textNode) {
          container = textNode.node;
          offset = textNode.offset;
          normalized = true;
        }
      }
    }
  }

  // Lean the start of the selection right if possible
  // So this: x[<b>x]</b>
  // Becomes: x<b>[x]</b>
  if (directionLeft && !collapsed && dom.isText(container) && offset === container.data.length) {
    const textNode = findTextNodeRelative(isAfterNode, collapsed, false, container);
    if (textNode) {
      container = textNode.node;
      offset = textNode.offset;
      normalized = true;
    }
  }

  return normalized && container ? toPoint(container, offset) : null;
};

const normalize = (rng) => {
  const collapsed = rng.collapsed, normRng = rng.cloneRange();
  const startPos = rng.getStartPoint();

  let endpoint = normalizeEndPoint(collapsed, true, normRng);
  if (endpoint) {
    // Do not move the caret to previous line
    //if (!collapsed /*|| !CaretPosition.isAbove(startPos, endpoint)*/) {
      normRng.setStart(endpoint.node, endpoint.offset);
    //}    
  }

  endpoint = normalizeEndPoint(collapsed, true, normRng);
  if (endpoint) {
    // Do not move the caret to previous line
    //if (!collapsed /*|| !CaretPosition.isAbove(startPos, endpoint)*/) {
      normRng.setStart(endpoint.node, endpoint.offset);
    //}    
  }

  if (!collapsed) {
    endpoint = normalizeEndPoint(collapsed, false, normRng);
    if (endpoint) {
      normRng.setEnd(endpoint.node, endpoint.offset);
    }
  }

  // If it was collapsed then make sure it still is
  if (collapsed) {
    normRng.collapse(true);
  }
  
  return rng.equals(normRng) ? null : normRng;
};

export {
  normalize
};
