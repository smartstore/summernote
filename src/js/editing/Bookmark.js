import func from '../core/func';
import lists from '../core/lists';
import dom from '../core/dom';
import range from '../core/range';

const isValidTextNode = (node) => dom.isText(node) && node.data.length > 0;

const createBookmarkSpan = (id, filled) => {
  const args = { 'data-note-type': 'bookmark', id: id, 'style': 'overflow:hidden;line-height:0px' };
  return filled ? dom.create('span', args, '&#xFEFF;') : dom.create('span', args);
};

const findIndex = (editable, name, element) => {
  let count = 0;

  lists.each(dom.select(editable, name), (node) => {
    if (node.getAttribute('data-note-bogus') === 'all') {
      return;
    } else if (node === element) {
      return false;
    } else {
      count++;
      return;
    }
  });

  return count;
};

const moveEndPoint = (rng, start) => {
  let container = start ? rng.startContainer : rng.endContainer;
  let offset = start ? rng.startOffset : rng.endOffset;

  // normalize Table Cell selection
  if (dom.isElement(container) && container.nodeName === 'TR') {
    const childNodes = container.childNodes;
    container = childNodes[Math.min(start ? offset : offset - 1, childNodes.length - 1)];
    if (container) {
      offset = start ? 0 : container.childNodes.length;
      if (start) {
        rng.setStart(container, offset);
      } else {
        rng.setEnd(container, offset);
      }
    }
  }
};

const normalizeTableCellSelection = (rng) => {
  moveEndPoint(rng, true);
  moveEndPoint(rng, false);
  return rng;
};

const addBogus = (node) => {
  // Adds a bogus BR element for empty block elements
  if (dom.isElement(node) && dom.isBlock(node) && !node.innerHTML) {
    node.innerHTML = '<br data-note-bogus="1" />';
  }

  return node;
};

const restoreEndPoint = (suffix, bookmark) => {
  const marker = document.getElementById(bookmark.id + '_' + suffix);
  const markerParent = marker?.parentNode;
  const keep = bookmark.keep;

  if (marker && markerParent) {
    let container;
    let offset;

    if (suffix === 'start') {
      if (!keep) {
        container = markerParent;
        offset = dom.position(marker);
      } else {
        if (marker.hasChildNodes()) {
          container = marker.firstChild;
          offset = 1;
        } else if (isValidTextNode(marker.nextSibling)) {
          container = marker.nextSibling;
          offset = 0;
        } else if (isValidTextNode(marker.previousSibling)) {
          container = marker.previousSibling;
          offset = marker.previousSibling.data.length;
        } else {
          container = markerParent;
          offset = dom.position(marker) + 1;
        }
      }
    } else {
      if (!keep) {
        container = markerParent;
        offset = dom.position(marker);
      } else {
        if (marker.hasChildNodes()) {
          container = marker.firstChild;
          offset = 1;
        } else if (isValidTextNode(marker.previousSibling)) {
          container = marker.previousSibling;
          offset = marker.previousSibling.data.length;
        } else {
          container = markerParent;
          offset = dom.position(marker);
        }
      }
    }

    if (!keep) {
      const prev = marker.previousSibling;
      const next = marker.nextSibling;

      // Remove all marker text nodes
      lists.each(marker.childNodes, (node) => {
        if (dom.isText(node)) {
          node.data = node.data.replace(/\uFEFF/g, '');
        }
      });

      // Remove marker but keep children if for example contents where inserted into the marker
      // Also remove duplicated instances of the marker for example by a
      // split operation or by WebKit auto split on paste feature
      let otherMarker;
      while ((otherMarker = document.getElementById(bookmark.id + '_' + suffix))) {
        dom.remove(otherMarker, false);
      }

      // If siblings are text nodes then merge them
      if (dom.isText(next) && dom.isText(prev)) {
        const idx = prev.data.length;
        prev.appendData(next.data);
        dom.remove(next, true);

        container = prev;
        offset = idx;
      }
    }

    return { node: container, offset: offset };
  } else {
    return null;
  }
};

const trimEmptyTextNode = (node) => {
  if (dom.isText(node) && node.data.length === 0) {
    dom.remove(node, true);
  }
};

const insertNode = (rng, node) => {
  range.getNativeRange(rng).insertNode(node);
  trimEmptyTextNode(node.previousSibling);
  trimEmptyTextNode(node.nextSibling);
};

const insertFragment = (rng, frag) => {
  const firstChild = frag.firstChild;
  const lastChild = frag.lastChild;

  range.getNativeRange(rng).insertNode(frag);

  trimEmptyTextNode(firstChild?.previousSibling);
  trimEmptyTextNode(lastChild?.nextSibling);
};

// Wrapper to Range.insertNode which removes any empty text nodes created in the process.
// Doesn't merge adjacent text nodes - this is according to the DOM spec.
const rangeInsertNode = (rng, node) => {
  if (dom.isDocumentFragment(node)) {
    insertFragment(rng, node);
  } else {
    insertNode(rng, node);
  }
};

const getPersistentBookmark = (selection, filled) => {
  let rng = selection.getRange();
  const id = func.uniqueId('note_');
  const collapsed = rng.collapsed;
  const element = selection.getNode();
  const name = element.nodeName;
  const forward = selection.isForward();

  if (name === 'IMG') {
    return { name, index: findIndex(selection.editor.editable, name, element) };
  }

  const rng2 = normalizeTableCellSelection(rng.cloneRange());

  // Insert end marker
  if (!collapsed) {
    rng2.collapse(false);
    const endBookmarkNode = createBookmarkSpan(id + '_end', filled);
    rangeInsertNode(rng2, endBookmarkNode);
  }

  rng = normalizeTableCellSelection(rng);
  rng.collapse(true);
  const startBookmarkNode = createBookmarkSpan(id + '_start', filled);

  rangeInsertNode(rng, startBookmarkNode);

  selection.moveToBookmark({ id, keep: true, forward });

  return { id, forward };
};

const resolvePersistentBookmark = (bookmark) => {
  const startPos = restoreEndPoint('start', bookmark);
  const endPos = restoreEndPoint('end', bookmark) || startPos;

  if (startPos && endPos) {
    const rng = range.create(addBogus(startPos.node), startPos.offset, addBogus(endPos.node), endPos.offset);
    return { range: rng, forward: bookmark.forward === true };
  }
  
  return null;
};

export default {
  moveEndPoint,
  getPersistentBookmark,
  resolvePersistentBookmark
}

