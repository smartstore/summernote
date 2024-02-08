import lists from '../core/lists';
import dom from '../core/dom';
import NodeComparer from '../util/NodeComparer';
import FormatUtils from './FormatUtils';
import MatchFormat from './MatchFormat';
import RemoveFormat from './RemoveFormat';

const each = lists.each;

const isElementNode = (node) =>
  FormatUtils.isElementNode(node) && !FormatUtils.isCaretNode(node);

const unwrapEmptySpan = (node) => {
  if (node.nodeName === 'SPAN' && node.attributes.length === 0) {
    dom.remove(node, true);
  }
};

const hasStyle = (name) => (node) => {
  return !!(node && FormatUtils.getStyle(node, name));
}

const applyStyle = (name, value) => (node) => {
  dom.setStyle(node, name, value);

  if (node.getAttribute('style') === '') {
    node.removeAttribute('style');
  }

  unwrapEmptySpan(node);
};

const processChildElements = (node, filter, process) => {
  each(node.childNodes, (node) => {
    if (isElementNode(node)) {
      if (filter(node)) {
        process(node);
      }
      if (node.hasChildNodes()) {
        processChildElements(node, filter, process);
      }
    }
  });
};

const clearChildStyles = (format, node) => {
  if (format.clear_child_styles) {
    const selector = format.links ? '*:not(a)' : '*';
    each(dom.select(selector, node), (childNode) => {
      if (isElementNode(childNode) && dom.isContentEditable(childNode)) {
        each(format.styles, (_value, name) => {
          dom.setStyle(childNode, name, '');
        });
      }
    });
  }
};



const mergeTextDecorationsAndColor = (format, vars, node) => {
  const processTextDecorationsAndColor = n => {
    if (dom.isHTMLElement(n) && dom.isElement(n.parentNode) && dom.isContentEditable(n)) {
      const parentTextDecoration = FormatUtils.getTextDecoration(n.parentNode);
      if (dom.getStyle(n, 'color') && parentTextDecoration) {
        dom.setStyle(n, 'text-decoration', parentTextDecoration);
      } else if (dom.getStyle(n, 'text-decoration') === parentTextDecoration) {
        dom.setStyle(n, 'text-decoration', null);
      }
    }
  };

  // Colored nodes should be underlined so that the color of the underline matches the text color.
  if (format.styles && (format.styles.color || format.styles.textDecoration)) {
    lists.walk(node, processTextDecorationsAndColor, 'childNodes');
    processTextDecorationsAndColor(node);
  }
};

const mergeBackgroundColorAndFontSize = (format, vars, node) => {
  // Nodes with font-size should have their own background color as well to fit the line-height
  if (format.styles && format.styles.backgroundColor) {
    const hasFontSize = hasStyle('fontSize');
    processChildElements(node,
      (elm) => hasFontSize(elm) && dom.isContentEditable(elm),
      applyStyle('backgroundColor', FormatUtils.replaceVars(format.styles.backgroundColor, vars))
    );
  }
};

const mergeSubSup = (format, vars, node) => {
  // Remove font size on all descendants of a sub/sup and remove the inverse elements
  if (FormatUtils.isInlineFormat(format) && (format.inline === 'sub' || format.inline === 'sup')) {
    const hasFontSize = hasStyle('fontSize');
    processChildElements(node,
      (elm) => hasFontSize(elm) && dom.isContentEditable(elm),
      applyStyle('fontSize', '')
    );

    const inverseTagDescendants = lists.filter(dom.select(format.inline === 'sup' ? 'sub' : 'sup', node), dom.isContentEditable);
    each(inverseTagDescendants, n => dom.remove(n, true));
  }
};

const mergeWithChildren = (editor, formatList, vars, node) => {
  // Remove/merge children
  // Note: RemoveFormat.removeFormat will not remove formatting from noneditable nodes
  each(formatList, (format) => {
    // Merge all children of similar type will move styles from child to parent
    // this: <span style="color:red"><b><span style="color:red; font-size:10px">text</span></b></span>
    // will become: <span style="color:red"><b><span style="font-size:10px">text</span></b></span>
    if (FormatUtils.isInlineFormat(format)) {
      each(dom.select(format.inline, node), (child) => {
        if (isElementNode(child)) {
          RemoveFormat.removeNodeFormat(editor, format, vars, child, format.exact ? child : null);
        }
      });
    }

    clearChildStyles(format, node);
  });
};

const mergeWithParents = (editor, format, name, vars, node) => {
  // Remove format if direct parent already has the same format
  // Note: RemoveFormat.removeFormat will not remove formatting from noneditable nodes
  const parentNode = node.parentNode;
  if (MatchFormat.matchNode(editor, parentNode, name, vars)) {
    if (RemoveFormat.removeNodeFormat(editor, format, vars, node)) {
      return;
    }
  }

  // Remove format if any ancestor already has the same format
  if (format.merge_with_parents && parentNode) {
    dom.closest(parentNode, (parent) => {
      if (MatchFormat.matchNode(editor, parent, name, vars)) {
        RemoveFormat.removeNodeFormat(editor, format, vars, node);
        return true;
      } else {
        return false;
      }
    });
  }
};

const mergeSiblings = (format, vars, node) => {
  // Merge next and previous siblings if they are similar <b>text</b><b>text</b> becomes <b>texttext</b>
  // Note: mergeSiblingNodes attempts to not merge sibilings if they are noneditable
  if (node && format.merge_siblings !== false) {
    // Previous sibling
    const newNode = mergeSiblingsNodes(FormatUtils.getNonWhiteSpaceSibling(node), node) ?? node;
    // Next sibling
    mergeSiblingsNodes(newNode, FormatUtils.getNonWhiteSpaceSibling(newNode, true));
  }
};

const mergeSiblingsNodes = (prev, next) => {
  const isPrevEditable = dom.isHTMLElement(prev) && dom.isContentEditable(prev);
  const isNextEditable = dom.isHTMLElement(next) && dom.isContentEditable(next);

  // Check if next/prev exists and that they are elements
  if (isPrevEditable && isNextEditable) {
    // If previous sibling is empty then jump over it
    const prevSibling = findElementSibling(prev, 'previousSibling');
    const nextSibling = findElementSibling(next, 'nextSibling');
    
    // Compare next and previous nodes
    if (NodeComparer.compare(prevSibling, nextSibling)) {
      // Append nodes between
      for (let sibling = prevSibling.nextSibling; sibling && sibling !== nextSibling;) {
        const tmpSibling = sibling;
        sibling = sibling.nextSibling;
        prevSibling.appendChild(tmpSibling);
      }

      dom.remove(nextSibling);

      each(nextSibling.childNodes, (node) => {
        prevSibling.appendChild(node);
      });

      return prevSibling;
    }
  }

  return next;
};

const findElementSibling = (node, siblingName) => {
  for (let sibling = node; sibling; sibling = sibling[siblingName]) {
    if (dom.isText(sibling) && sibling.data) {
      return node;
    }

    if (dom.isElement(sibling) && !dom.isBookmarkNode(sibling)) {
      return sibling;
    }
  }

  return node;
};

export default {
  mergeWithChildren,
  mergeTextDecorationsAndColor,
  mergeBackgroundColorAndFontSize,
  mergeSubSup,
  mergeSiblings,
  mergeWithParents
};