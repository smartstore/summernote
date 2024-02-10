import Type from '../core/Type';
import func from '../core/func';
import lists from '../core/lists';
import dom from '../core/dom';
import range from '../core/range';
import DomTreeWalker from '../util/DomTreeWalker';

let win = window;

const createRootRange = (editor) => {
  let rng = range.create(editor.editable);
  if ($(rng.sc).closest('.note-editable').length === 0) {
    rng = range.createFromBodyElement(editor.editable);
  }
  return rng;
};

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

  return container || root;
};

export default class Selection {
  constructor(context) {
    this.context = context;
    // e.g. selected image with handler
    this.selectedControl = null;
    // The last range that was set explicitly via setRange()
    this.explicitRange = null;
    // The last range that was set explicitly via setRange() AND was successfully selected.
    this.selectedRange = null;
    // The last range that was set explicitly via setRange(), 
    // OR the range that was remembered on 'keydown', 'keyup', 'mouseup', 'paste', 'focus' events
    // so that after a blur, we know what the last selected range was.
    this.bookmark = null;
  }

  initialize(editor) {
    this.hasFocus = editor.hasFocus();
    this.testMode = false;

    const createBookmarkFromSelection = () => {
      const sel = this.nativeSelection;
      let rng;
      if (sel.rangeCount > 0) {
        rng = range.createFromNativeRange(sel.getRangeAt(0));
      } else {
        rng = createRootRange(this.editor);
      }

      return rng;
    };

    const throttledHandler = func.throttle(e => {
      if (e.type === 'blur') {
        this.hasFocus = false;
      }
      if (e.type === 'focus') {
        this.hasFocus = true;
        this.bookmark = createBookmarkFromSelection();
      }
      else if (e.type !== 'summernote') {
        this.bookmark = createBookmarkFromSelection();
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
    this.bookmark = null;
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

  /**
   * Checks whether the given range is completely within the boundaries of the root editable.
   */
  isValidRange(rng) {
    const isValidObj = rng && (rng.isWrapper || rng instanceof Range);
    if (!isValidObj) return false;

    const root = this.editor.editable;
    return range.isFullyContainedInNode(rng, root);
  }

  /**
   * Collapse the selection to start or end of range.
   *
   * @method collapse
   * @param {Boolean} toStart Optional boolean state if to collapse to end or not. Defaults to false.
   */
  collapse(toStart) {
    const rng = this.getRange();
    rng.collapse(!!toStart);
    this.setRange(rng);
  };

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

    if (Type.isAssigned(this.bookmark) && !this.hasFocus) {
      // Get the last saved range if not in focus
      return this.bookmark;
    }

    if (this.testMode) {
      rng = this.bookmark || this.selectedRange || this.explicitRange;
    }

    if (!rng && this.hasFocus) {
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
      rng = createRootRange(editor);
    }

    if (this.selectedRange && this.explicitRange) {
      if (tryCompareBoundaryPoints(rng.START_TO_START, rng, this.selectedRange) === 0 &&
        tryCompareBoundaryPoints(rng.END_TO_END, rng, this.selectedRange) === 0) {
        // Safari, Opera and Chrome only ever select text which causes the range to change.
        // This lets us use the originally set range if the selection hasn't been changed by the user.
        rng = this.explicitRange;
      } else {
        this.selectedRange = null;
        this.explicitRange = null;
        this.bookmark = null;
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
      if (!rng.isWrapper) {
        rng = range.getWrappedRange(rng);
      }

      this.explicitRange = rng;
      this.bookmark = rng;

      try {
        sel.removeAllRanges();
        sel.addRange(range.getNativeRange(rng));
      } catch (ex) {
        // IE might throw errors here if the editor is within a hidden container and selection is changed
      }

      // Forward is set to false and we have an extend function
      if (forward === false && sel.extend) {
        sel.collapse(rng.endContainer, rng.endOffset);
        sel.extend(rng.startContainer, rng.startOffset);
      }

      // adding range isn't always successful so we need to check range count otherwise an exception can occur
      this.selectedRange = sel.rangeCount > 0 ? rng : null;
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
   * Sets the current selection to the specified DOM element.
   *
   * @method setNode
   * @param {Element} elm Element to set as the contents of the selection.
   * @return {Element} Returns the element that got passed in.
   */
  setNode(elm) {
    // TODO: Implement Selection.setNode()
    return elm;
  }

  /**
   * Returns the currently selected element or the common ancestor element for both start and end of the selection.
   *
   * @method getNode
   * @return {Element} Currently selected element or common ancestor element.
   */
  getNode() {
    const rng = this.getRange();
    const root = this.editor.$editable;
    // Range maybe lost after the editor is made visible again
    if (!rng) {
      return root;
    }

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
          startContainer = dom.skipEmptyTextNodes(startContainer.nextSibling, true);
        } else {
          startContainer = startContainer.parentNode;
        }

        if (endOffset === 0) {
          endContainer = dom.skipEmptyTextNodes(endContainer.previousSibling, false);
        } else {
          endContainer = endContainer.parentNode;
        }

        if (startContainer && startContainer === endContainer) {
          node = startContainer;
        }
      }
    }

    const elm = dom.isText(node) ? node.parentNode : node;
    return dom.isHTMLElement(elm) ? elm : root;
  }

  getSelectedBlocks(startElm = null, endElm = null) {
    const rng = this.getRange();
    const selectedBlocks = [];

    const root = this.editor.editable;
    const start = dom.closest(startElm || this.getStart(rng.collapsed, rng), dom.isBlock);
    const end = dom.closest(endElm || this.getEnd(rng.collapsed, rng), dom.isBlock);
  
    if (start && start !== root) {
      selectedBlocks.push(start);
    }
  
    if (start && end && start !== end) {
      let node;
  
      const walker = new DomTreeWalker(start, root);
      while ((node = walker.next()) && node !== end) {
        if (dom.isBlock(node)) {
          selectedBlocks.push(node);
        }
      }
    }
  
    if (end && start !== end && end !== root) {
      selectedBlocks.push(end);
    }
  
    return selectedBlocks;
  }

  /**
   * Returns the selected contents as plain text.
   *
   * @method getContent
   * @return {String} Selected text contents.
   */
  getTextContent() {
    let rng = this.getRange();
    // if range is on anchor, expand range with anchor.
    if (rng.isOnAnchor()) {
      rng = range.createFromNode(dom.closest(rng.startContainer, dom.isAnchor));
    }

    return rng.toString();     
  }

  /**
   * Returns the selected contents as HTML.
   *
   * @method getContent
   * @return {String} Selected HTML contents.
   */
  getHtmlContent() {
    // TODO: Perform cleanup in Selection.getContent() before returning content.
    let rng = this.getRange();
    var container = rng.commonAncestorContainer.parentNode.cloneNode(false);
    container.appendChild( rng.cloneContents() );
    return container.innerHTML;
  }

  /**
   * Pastes given text or HTML content to the the current selection. If any contents is selected it will be replaced
   * with the contents passed in to this function. If there is no selection the contents will be inserted
   * where the caret is placed in the editor/page.
   *
   * @method setContent
   * @param {String} content HTML contents to set.
   * @return {Node[]} The inserted nodes.
   */
  pasteContent(content) {
    // TODO: Make this better: SetSelectionContent.setContent()
    if (!content || this.editor.isLimited(content.length)) {
      return;
    }

    content = this.context.invoke('codeview.purify', content.trim());
    
    const rng = this.getRange();
    const container = dom.create('div', null, content); // $('<div></div>').html(content)[0];
    let childNodes = lists.from(container.childNodes);
    
    let reversed = false;

    if (rng.so >= 0) {
      childNodes = childNodes.reverse();
      reversed = true;
    }

    childNodes = childNodes.map(node => {
      //console.log('pasteContent childNodes.map', node.nodeName, dom.isBlock(node), dom.isData(node));
      return rng.insertNode(node, true /* dom.isBlock(node) || dom.isData(node)*/);
    });

    if (reversed) {
      childNodes = childNodes.reverse();
    }

    this.setRange(range.createFromNodeAfter(lists.last(childNodes)));
    return childNodes;
  }

  /**
   * Returns the start element of a selection range. If the start is in a text
   * node the parent element will be returned.
   *
   * @method getStart
   * @param {Boolean} [real] Optional state to get the real parent when the selection is collapsed, not the closest element.
   * @return {Element} Start element of selection range.
   */
  getStart(real, rng = null) {
    return getEndpointElement(this.editor.editable, rng || this.getRange(), true, real, (elm, offset) => Math.min(elm.childNodes.length, offset));
  }

  /**
   * Returns the end element of a selection range. If the end is in a text
   * node the parent element will be returned.
   *
   * @method getEnd
   * @param {Boolean} [real] Optional state to get the real parent when the selection is collapsed not the closest element.
   * @return {Element} End element of selection range.
   */
  getEnd(real, rng = null) {
    return getEndpointElement(this.editor.editable, rng || this.getRange(), false, real, (elm, offset) => offset > 0 ? offset - 1 : offset);
  }

  /**
   * Returns a bookmark location for the current selection. This bookmark object
   * can then be used to restore the selection after some content modification to the document.
   *
   * @method createBookmark
   * @return {Object} Bookmark object, use moveToBookmark with this object to restore the selection.
   */
  createBookmark() {
    return this.getRange().createBookmark(this.editor.editable);
  }

  /**
   * Returns a paragraph bookmark location for the current selection. This bookmark object
   * can then be used to restore the selection after some content modification to the document.
   *
   * @method createParaBookmark
   * @param {Node[]} paras
   * @return {Object} Bookmark object, use moveToBookmark with this object to restore the selection.
   */
  createParaBookmark(paras) {
    return this.getRange().createParaBookmark(paras);
  }

  /**
   * Restores the selection to the specified bookmark.
   *
   * @method moveToBookmark
   * @param {Object} bookmark Bookmark to restore selection from.
   */
  moveToBookmark(bookmark) {
    let rng;
    if (this.isValidRange(bookmark)) {
      rng = bookmark;
    } else if (bookmark.s && bookmark.e) {
      rng = range.createFromBookmark(this.editor.editable, bookmark);
      if (!this.isValidRange(rng)) {
        rng = null;
      }
    }

    if (rng) {
      this.setRange(rng);
      rng.scrollIntoView(this.editor.editable);
    }   
  }

  /**
   * Saves the bookmark location for the given range. This bookmark
   * can then be used to restore the selection after some content modification to the document.
   */
  setBookmark(rng) {
    if (this.isValidRange(rng)) {
      rng = range.getWrappedRange(rng);
      this.bookmark = rng;
    } else {
      // Create a new range at the end of the document
      this.bookmark = createRootRange(this.editor);
    }
  }

  /**
   * Tries to restore the last saved range bookmark (if any).
   * Then sets focus to editor.
   */
  restoreBookmark() {
    if (this.bookmark) {
      this.setRange(this.bookmark);
      this.editor.focus();
    }
  }

  /**
   * Selects the specified element. This will place the start and end of the selection range around the element.
   *
   * @method select
   * @param {Node} node HTML DOM element to select.
   * @return {Node} Returns the element that got passed in.
   */
  select(node) {
    if (dom.isChildOf(node, this.editor.editable, true)) {
      const rng = range.createFromNode(node);
      this.setRange(rng);
    }
    return node;
  }

  /**
   * Sets the current selection to the specified DOM element.
   *
   * @method setNode
   * @param {Element} elm Element to set as the contents of the selection.
   * @return {Element} Returns the element that got passed in.
   */
  setNode(elm) {
    const content = dom.outerHtml(elm);
    this.pasteContent(content);
    return elm;
  }

  /**
   * Returns true/false if the selection range is collapsed or not. Collapsed means if it's a caret or a larger selection.
   *
   * @method isCollapsed
   * @return {Boolean} true/false state if the selection range is collapsed or not.
   */
  isCollapsed() {
    const rng = this.getRange();
    if (!rng) {
      return false;
    }

    return rng.collapsed;
  }

  /**
   * Checks if the current selection’s start and end containers are editable within their parent’s contexts.
   */
  isEditable() {
    const rng = this.getRange();
    if (rng.collapsed) {
      return dom.isContentEditable(rng.startContainer);
    } else {
      return dom.isContentEditable(rng.startContainer) && dom.isContentEditable(rng.endContainer);
    }
  }

  /**
   * Moves the scrollbar to start container (sc) of current range.
   */
  scrollIntoView() {
    this.getRange().scrollIntoView(this.editor.editable);
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

  isForward() {
    const sel = this.nativeSelection;

    const anchorNode = sel?.anchorNode;
    const focusNode = sel?.focusNode;

    // No support for selection direction then always return true
    if (!sel || !anchorNode || !focusNode || dom.isRestrictedNode(anchorNode) || dom.isRestrictedNode(focusNode)) {
      return true;
    }

    const anchorRange = document.createRange();
    const focusRange = document.createRange();

    try {
      anchorRange.setStart(anchorNode, sel.anchorOffset);
      anchorRange.collapse(true);

      focusRange.setStart(focusNode, sel.focusOffset);
      focusRange.collapse(true);
    } catch (e) {
      // Safari can generate an invalid selection and error. Silently handle it and default to forward.
      // See https://bugs.webkit.org/show_bug.cgi?id=230594.
      return true;
    }

    return anchorRange.compareBoundaryPoints(anchorRange.START_TO_START, focusRange) <= 0;   
  }

  normalize() {
    const rng = this.getRange();
    const sel = this.nativeSelection;

    if (sel.rangeCount > 0) {
      const normRng = rng.normalize();
      this.setRange(normRng, this.isForward());
      return normRng;
    }

    return rng;    
  }
}