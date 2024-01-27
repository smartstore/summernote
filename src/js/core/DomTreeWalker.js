/**
 * TreeWalker class enables you to walk the DOM in a linear manner.
 */
export default class DomTreeWalker {
  constructor(startNode, rootNode) {
    this.node = startNode;
    this.rootNode = rootNode;
    this.current = this.current.bind(this);
    this.next = this.next.bind(this);
    this.prev = this.prev.bind(this);
    this.prev2 = this.prev2.bind(this);
  }
  /**
   * Returns the current node.
   *
   * @method current
   * @return {Node/undefined} Current node where the walker is, or undefined if the walker has reached the end.
   */
  current() {
    return this.node;
  }
  /**
   * Walks to the next node in tree.
   *
   * @method next
   * @return {Node/undefined} Current node where the walker is after moving to the next node, or undefined if the walker has reached the end.
   */
  next(shallow) {
    this.node = this.findSibling(this.node, 'firstChild', 'nextSibling', shallow);
    return this.node;
  }
  /**
   * Walks to the previous node in tree.
   *
   * @method prev
   * @return {Node/undefined} Current node where the walker is after moving to the previous node, or undefined if the walker has reached the end.
   */
  prev(shallow) {
    this.node = this.findSibling(this.node, 'lastChild', 'previousSibling', shallow);
    return this.node;
  }
  prev2(shallow) {
    this.node = this.findPreviousNode(this.node, shallow);
    return this.node;
  }
  findSibling(node, startName, siblingName, shallow) {
    if (node) {
      // Walk into nodes if it has a start
      if (!shallow && node[startName]) {
        return node[startName];
      }
      // Return the sibling if it has one
      if (node !== this.rootNode) {
        let sibling = node[siblingName];
        if (sibling) {
          return sibling;
        }
        // Walk up the parents to look for siblings
        for (let parent = node.parentNode; parent && parent !== this.rootNode; parent = parent.parentNode) {
          sibling = parent[siblingName];
          if (sibling) {
            return sibling;
          }
        }
      }
    }
    return undefined;
  }
  findPreviousNode(node, shallow) {
    if (node) {
      const sibling = node.previousSibling;
      if (this.rootNode && sibling === this.rootNode) {
        return;
      }
      if (sibling) {
        if (!shallow) {
          // Walk down to the most distant child
          for (let child = sibling.lastChild; child; child = child.lastChild) {
            if (!child.lastChild) {
              return child;
            }
          }
        }
        return sibling;
      }
      const parent = node.parentNode;
      if (parent && parent !== this.rootNode) {
        return parent;
      }
    }
    return undefined;
  }
}