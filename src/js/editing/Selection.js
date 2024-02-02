import Type from '../core/Type';
import lists from '../core/lists';
import dom from '../core/dom';
import range from '../core/range';
import Point from '../core/Point';

const win = window;
const doc = document;
const getEndpointElement = (
  root,
  rng,
  start,
  real,
  // (fn(elm:Node, offset:number) => number)
  resolve
) => {
  let container = start ? rng.startContainer : rng.endContainer;
  let offset = start ? rng.startOffset : rng.endOffset;

  if (container) {
    if (!real || !rng.collapsed) {
      container = container.childNodes[resolve(container, offset)] || container;
      if (!dom.isElement(container) && dom.isElement(container.parentNode)) {
        container = container.parentNode;
      }
    }
  }

  return null;
};

export default class Selection {
  constructor(context) {
    this.context = context;
    this.selectedRange = null;
    this.explicitRange = null;
  }

  initialize() {
    // TODO: Implement Selection.initialize()
    // TODO: Implement Selection.getContent() ?
    // TODO: Implement Selection.setContent() ?
  }

  destroy() {
    // TODO: Implement Selection.destroy()
  }

  get editor() {
    return this.context.modules.editor;
  }

  /**
   * Returns the browsers internal selection object.
   */
  get nativeSelection() {
    return win.getSelection ? win.getSelection() : win.document.selection;
  }

  /**
   * Move the selection cursor range to the specified node and offset.
   * If there is no node specified it will move it to the first suitable location within the body.
   *
   * @method setCursorLocation
   * @param {Node} [node] Optional node to put the cursor in.
   * @param {Number} [offset] Optional offset from the start of the node to put the cursor at.
   */
  setCursorLocation(node, offset) {
    const rng = document.createRange();

    if (Type.isAssigned(node) && Type.isAssigned(offset)) {
      rng.setStart(node, offset);
      rng.setEnd(node, offset);
      this.setRange(rng);
      this.collapse(false);
    } else {
      this.moveEndPoint(rng, this.editor.editable, true);
      this.setRange(rng);
    }
  }

  /**
   * Returns the start element of a selection range. If the start is in a text
   * node the parent element will be returned.
   *
   * @method getStart
   * @param {Boolean} [real] Optional state to get the real parent when the selection is collapsed, not the closest element.
   * @return {Element} Start element of selection range.
   */
  getStart(real) {
    return getEndpointElement(this.editor.editable, this.getRange(), true, real, (elm, offset) => Math.min(elm.childNodes.length, offset));
  }

  /**
   * Returns the end element of a selection range. If the end is in a text
   * node the parent element will be returned.
   *
   * @method getEnd
   * @param {Boolean} [real] Optional state to get the real parent when the selection is collapsed not the closest element.
   * @return {Element} End element of selection range.
   */
  getEnd(real) {
    return getEndpointElement(this.editor.editable, this.getRange(), false, real, (elm, offset) => offset > 0 ? offset - 1 : offset);
  }

  /**
   * Returns a bookmark location for the current selection. This bookmark object
   * can then be used to restore the selection after some content modification to the document.
   *
   * @method getBookmark
   * @param {Number} [type] Optional state if the bookmark should be simple or not. Default is complex.
   * @param {Boolean} [normalized] Optional state that enables you to get a position that it would be after normalization.
   * @return {Object} Bookmark object, use moveToBookmark with this object to restore the selection.
   */
  getBookmark(type, normalized) {
    // TODO: Implement Selection.getBookmark
    return null;
  }

  /**
   * Restores the selection to the specified bookmark.
   *
   * @method moveToBookmark
   * @param {Object} bookmark Bookmark to restore selection from.
   */
  moveToBookmark(bookmark) {
    // TODO: Implement Selection.moveToBookmark
    return null;
  }

  /**
   * Selects the specified element. This will place the start and end of the selection range around the element.
   *
   * @method select
   * @param {Element} node HTML DOM element to select.
   * @param {Boolean} [content] Optional bool state if the contents should be selected or not on non IE browser.
   * @return {Element} Selected element the same element as the one that got passed in.
   */
  select(node, content) {
    // TODO: Implement Selection.select()
    return node;
  }

  /**
   * Returns true/false if the selection range is collapsed or not. Collapsed means if it's a caret or a larger selection.
   *
   * @method isCollapsed
   * @return {Boolean} true/false state if the selection range is collapsed or not.
   */
  isCollapsed() {
    const rng = range.getNativeRange(this.getRange()), sel = this.nativeSelection;

    if (!rng || rng.item) {
      return false;
    }

    if (rng.compareEndPoints) {
      return rng.compareEndPoints('StartToEnd', rng) === 0;
    }

    return !sel || rng.collapsed;
  }

  // TODO: Mach weiter ab Selection.isEditable
}