
import Type from '../core/Type';
import lists from '../core/lists';
import dom from '../core/dom';
import Point from '../core/Point';
import schema from '../core/schema';
import range from '../core/range';
import NodeComparer from '../util/NodeComparer';
import DomTreeWalker from '../util/DomTreeWalker';
import FormatUtils from './FormatUtils';
import MatchFormat from './MatchFormat';
import CaretFormat from './CaretFormat';
import MergeFormats from './MergeFormats';
import ListItemFormat from './ListItemFormat';
import Str from '../core/Str';

const CARET_ID = '_note_caret';
const ZWSP = Point.ZERO_WIDTH_NBSP_CHAR;
const NBSP = '\u00A0';

const importNode = (ownerDocument, node) => {
  return ownerDocument.importNode(node, true);
};

const findFirstTextNode = (node) => {
  if (node) {
    const walker = new DomTreeWalker(node, node);

    for (let tempNode = walker.current(); tempNode; tempNode = walker.next()) {
      if (dom.isText(tempNode)) {
        return tempNode;
      }
    }
  }

  return null;
};

const createCaretContainer = (fill) => {
  const caretContainer = dom.create('span', {
    // style: 'color:red',
    'id': CARET_ID,
    'data-note-bogus': '1',
    'data-note-type': 'format-caret'
  });

  if (fill) {
    dom.append(caretContainer, document.createTextNode(ZWSP));
  }

  return caretContainer;
};

const trimZwspFromCaretContainer = (caretContainerNode) => {
  const textNode = findFirstTextNode(caretContainerNode);
  if (textNode && textNode.data.charAt(0) === ZWSP) {
    textNode.deleteData(0, 1);
  }

  return textNode;
};
const removeCaretContainerNode = (editor, node, moveCaret) => {
  const selection = editor.selection;

  if (FormatUtils.isCaretContainerEmpty(node)) {
    // TODO: Impl DeleteElement.deleteElement
    //DeleteElement.deleteElement(editor, false, node, moveCaret, true);
  } else {
    const rng = selection.getRange();
    const block = dom.closest(node, dom.isBlock);

    // Store the current selection offsets
    const startContainer = rng.startContainer;
    const startOffset = rng.startOffset;
    const endContainer = rng.endContainer;
    const endOffset = rng.endOffset;

    const textNode = trimZwspFromCaretContainer(node);
    dom.remove(node, false);

    // Restore the selection after unwrapping the node and removing the zwsp
    if (startContainer === textNode && startOffset > 0) {
      rng.setStart(textNode, startOffset - 1);
    }

    if (endContainer === textNode && endOffset > 0) {
      rng.setEnd(textNode, endOffset - 1);
    }

    if (block && dom.isEmpty(block)) {
      // TODO: Impl PaddingBr.fillWithPaddingBr
      //PaddingBr.fillWithPaddingBr(block);
    }

    selection.setRange(rng);
  }
};

// Removes the caret container for the specified node or all on the current document
const removeCaretContainer = (editor, node, moveCaret) => {
  const selection = editor.selection;
  if (!node) {
    node = FormatUtils.getParentCaretContainer(editor.editable, selection.getStart());

    if (!node) {
      while ((node = document.getElementById(CARET_ID))) {
        removeCaretContainerNode(editor, node, moveCaret);
      }
    }
  } else {
    removeCaretContainerNode(editor, node, moveCaret);
  }
};

const insertCaretContainerNode = (caretContainer, formatNode) => {
  const block = dom.closest(formatNode, FormatUtils.isTextBlock);

  if (block && dom.isEmpty(block)) {
    // Replace formatNode with caretContainer when removing format from empty block like <p><b>|</b></p>
    formatNode.parentNode?.replaceChild(caretContainer, formatNode);
  } else {
    // TODO: Impl PaddingBr.removeTrailingBr()
    //PaddingBr.removeTrailingBr(formatNode);
    if (dom.isEmpty(formatNode)) {
      // TODO: Reimpl dom.isEmpty
      formatNode.parentNode?.replaceChild(caretContainer, formatNode);
    } else {
      dom.insertAfter(formatNode, caretContainer);
    }
  }
};

const appendNode = (parentNode, node) => {
  parentNode.appendChild(node);
  return node;
}

const insertFormatNodesIntoCaretContainer = (formatNodes, caretContainer) => {
  const innerMostFormatNode = lists.foldr(formatNodes, (parentNode, formatNode) => {
    return appendNode(parentNode, formatNode.cloneNode(false));
  }, caretContainer);

  const doc = innerMostFormatNode.ownerDocument ?? document;
  return appendNode(innerMostFormatNode, document.createTextNode(ZWSP));
};

const cleanFormatNode = (editor, caretContainer, formatNode, name, vars, similar) => {
  const formatter = editor.formatter;

  // Find all formats present on the format node
  const validFormats = lists.filter(Obj.keys(formatter.get()), (formatName) => formatName !== name && !Str.contains(formatName, 'removeformat'));
  const matchedFormats = MatchFormat.matchAllOnNode(editor, formatNode, validFormats);
  // Filter out any matched formats that are 'visually' equivalent to the 'name' format since they are not unique formats on the node
  const uniqueFormats = lists.filter(matchedFormats, (fmtName) => !FormatUtils.areSimilarFormats(editor, fmtName, name));

  // If more than one format is present, then there's additional formats that should be retained. So clone the node,
  // remove the format and then return cleaned format node
  if (uniqueFormats.length > 0) {
    const clonedFormatNode = formatNode.cloneNode(false);
    caretContainer.appendChild(clonedFormatNode);
    formatter.remove(name, vars, clonedFormatNode, similar);
    dom.remove(clonedFormatNode, true);
    return clonedFormatNode;
  } else {
    return null;
  }
};

const applyCaretFormat = (editor, name, vars) => {
  let caretContainer;
  const selection = editor.selection;

  const formatList = editor.formatter.get(name);
  if (!formatList) {
    return;
  }

  const collapsedRng = selection.getRange();
  // let offset = selectionRng.startOffset;
  // const container = selectionRng.startContainer;
  // const text = container.nodeValue;

  // Get bookmark of caret position
  // TODO: Bookmarking geht nicht
  const bookmark = selection.createBookmark(true);

  // Expand the range to the closest word and split it at those points
  const wordRange = collapsedRng
    .getWordRange({ forward: true, stopAtPunc: true, trim: true })
    .splitText();

  // Apply the format to the range
  editor.formatter.apply(name, vars, wordRange);

  // Move selection back to caret position
  selection.moveToBookmark(bookmark);

  //caretContainer = FormatUtils.getParentCaretContainer(editor.editable, selection.getStart());

  // // Expand to word if caret is in the middle of a text node and the char before/after is a alpha numeric character
  // const wordcharRegex = /[^\s\u00a0\u00ad\u200b\ufeff]/;
  // if (text && offset > 0 && offset < text.length &&
  //   wordcharRegex.test(text.charAt(offset)) && wordcharRegex.test(text.charAt(offset - 1))) {
  //   // Get bookmark of caret position
  //   const bookmark = selection.getBookmark();

  //   // Collapse bookmark range (WebKit)
  //   collapsedRng.collapse(true);

  //   // Expand the range to the closest word and split it at those points
  //   let rng = ExpandRange.expandRng(editor.dom, collapsedRng, formatList);
  //   rng = SplitRange.split(rng);

  //   // Apply the format to the range
  //   editor.formatter.apply(name, vars, rng);

  //   // Move selection back to caret position
  //   selection.moveToBookmark(bookmark);
  // } else {
  //   let textNode = caretContainer ? findFirstTextNode(caretContainer) : null;

  //   if (!caretContainer || textNode?.data !== ZWSP) {
  //     // Need to import the node into the document on IE or we get a lovely WrongDocument exception
  //     caretContainer = importNode(editor.getDoc(), createCaretContainer(true).dom);
  //     textNode = caretContainer.firstChild as Text;

  //     collapsedRng.insertNode(caretContainer);
  //     offset = 1;

  //     editor.formatter.apply(name, vars, caretContainer);
  //   } else {
  //     editor.formatter.apply(name, vars, caretContainer);
  //   }

  //   // Move selection to text node
  //   selection.setCursorLocation(textNode, offset);
  //}
};

const removeCaretFormat = (editor, name, vars, similar) => {
  const selection = editor.selection;
  let hasContentAfter = false;

  const formatList = editor.formatter.get(name);
  if (!formatList) {
    return;
  }

  const rng = selection.getRange();
  const container = rng.startContainer;
  const offset = rng.startOffset;
  let node = container;

  if (dom.isText(container)) {
    if (offset !== container.data.length) {
      hasContentAfter = true;
    }

    node = node.parentNode;
  }

  const parents = [];
  let formatNode;
  while (node) {
    if (MatchFormat.matchNode(editor, node, name, vars, similar)) {
      formatNode = node;
      break;
    }

    if (node.nextSibling) {
      hasContentAfter = true;
    }

    parents.push(node);
    node = node.parentNode;
  }

  // Node doesn't have the specified format
  if (!formatNode) {
    return;
  }

  if (hasContentAfter) {
    // Get bookmark of caret position
    // TODO: Bookmarking geht nicht
    const bookmark = selection.createBookmark(true);

    // Expand the range to the closest word and split it at those points
    const wordRange = rng
      .getWordRange({ forward: true, stopAtPunc: true, trim: true })
      .splitText();

    // Remove the format from the range
    editor.formatter.remove(name, vars, wordRange, similar);

    // Move selection back to caret position
    selection.moveToBookmark(bookmark);
  }
  else { // !hasContentAfter
    // TODO: Impl !hasContentAfter
  }
};

const disableCaretContainer = (editor, keyCode, moveCaret) => {
  const selection = editor.selection, root = editor.editable;

  removeCaretContainer(editor, null, moveCaret);

  // Remove caret container if it's empty
  if ((keyCode === 8 || keyCode === 46) && selection.isCollapsed() && selection.getStart().innerHTML === ZWSP) {
    removeCaretContainer(editor, FormatUtils.getParentCaretContainer(root, selection.getStart()), true);
  }

  // Remove caret container on keydown and it's left/right arrow keys
  if (keyCode === 37 || keyCode === 39) {
    removeCaretContainer(editor, FormatUtils.getParentCaretContainer(root, selection.getStart()), true);
  }
};

const endsWithNbsp = (element) => dom.isText(element) && Str.endsWith(element.data, NBSP);

const setup = (context) => {
  $(context.layoutInfo.editable).on('mouseup keydown', (e) => {
    const editor = context.modules.editor;
    disableCaretContainer(editor, e.keyCode, endsWithNbsp(editor.selection.getRange().endContainer));
  });
};

export default {
  setup,
  applyCaretFormat,
  removeCaretFormat
};