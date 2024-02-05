import Type from '../core/Type';
import func from '../core/func';
import lists from '../core/lists';
import dom from '../core/dom';
import range from '../core/range';
import Point from '../core/Point';

const win = window;

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

  // TODO: Ist das korrekt?
  return root;
};

// TODO: Implement Selection.getContent() ?
// TODO: Implement Selection.setContent() ?
export default class Selection {
  constructor(context) {
    this.context = context;
    this.selectedRange = null;
    this.explicitRange = null;
  }

  initialize(editor) {
    this.hasFocus = editor.hasFocus();

    const throttledHandler = func.throttle(e => {
      if (e.type === 'blur') {
        this.hasFocus = false;
      }
      if (e.type === 'focus') {
        this.hasFocus = true;
        this.editor.setLastRange();
      }
      else if (e.type !== 'summernote') {
        this.editor.setLastRange();
      }  
    }, 200);

    const events = ['keydown', 'keyup', 'mouseup', 'paste', 'focus', 'blur']
      .map(x => x + '.selection')
      .join(' ');
    editor.$editable.on(events, throttledHandler);

    const $note = this.context.layoutInfo.note;
    $note.on('summernote.change.selection', throttledHandler);
  }

  destroy() {
    this.editor.$editable.off('selection');
    this.context.layoutInfo.note.off('selection');
    this.context = null;
    this.selectedRange = null;
    this.explicitRange = null;
    win = null;
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

  isValidRange(rng) {
    // TODO: Implement Selection.isValidRange
    return true;
  }

  /**
   * Returns the current editor selection range.
   */
  getRange() {
    let rng;

    const tryCompareBoundaryPoints = (how, sourceRange, destinationRange) => {
      try {
        return sourceRange.compareBoundaryPoints(how, destinationRange);
      } catch (ex) {
        return -1;
      }
    };

    const editor = this.editor;

    if (Type.isAssigned(editor.bookmark) && !this.hasFocus) {
      rng = range.createFromBookmark(editor.bookmark);
      if (rng) {
        return rng;
      }
    }

    if (this.hasFocus) {
      try {
        const selection = this.nativeSelection;
        if (selection && !dom.isRestrictedNode(selection.anchorNode)) {
          if (selection.rangeCount > 0) {
            rng = range.createFromNativeRange(selection.getRangeAt(0));
          }
        }
      } catch {}
    }

    // No range found. Create one from root editable.
    if (!rng) {
      rng = range.createFromBodyElement(editor.editable.lastChild || editor.editable, true);
      if ($(rng.startContainer).closest('.note-editable').length === 0) {
        rng = range.createFromBodyElement(editor.editable);
      }
    }

    if (selectedRange && explicitRange) {
      if (tryCompareBoundaryPoints(rng.START_TO_START, rng, selectedRange) === 0 &&
        tryCompareBoundaryPoints(rng.END_TO_END, rng, selectedRange) === 0) {
        // Safari, Opera and Chrome only ever select text which causes the range to change.
        // This lets us use the originally set range if the selection hasn't been changed by the user.
        rng = explicitRange;
      } else {
        selectedRange = null;
        explicitRange = null;
      }
    }

    return rng;
  }

  /**
   * Changes the selection to the specified range.
   *
   * @method setRange
   * @param {WrappedRange|Range} rng Range to select.
   * @param {Boolean} [forward] Optional boolean if the selection is forwards or backwards.
   */
  setRange(rng, forward) {
    if (!this.isValidRange(rng)) {
      return;
    }

    const sel = this.nativeSelection;

    if (sel) {
      const nativeRange = rng.isWrapper ? range.getNativeRange(rng) : rng;
      const wrappedRange = rng.isWrapper ? rng : range.getWrappedRange(rng);

      explicitRange = wrappedRange;

      try {
        sel.removeAllRanges();
        sel.addRange(nativeRange);
      } catch (ex) {
        // IE might throw errors here if the editor is within a hidden container and selection is changed
      }

      // Forward is set to false and we have an extend function
      if (forward === false && sel.extend) {
        sel.collapse(rng.endContainer, rng.endOffset);
        sel.extend(rng.startContainer, rng.startOffset);
      }

      // adding range isn't always successful so we need to check range count otherwise an exception can occur
      selectedRange = sel.rangeCount > 0 ? wrappedRange : null;
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