import Type from '../core/Type';
import lists from '../core/lists';
import dom from '../core/dom';
import schema from '../core/schema';
import range from '../core/range';
import NodeComparer from '../util/NodeComparer';
import DomTreeWalker from '../util/DomTreeWalker';
import FormatUtils from './FormatUtils';
import MatchFormat from './MatchFormat';
import CaretFormat from './CaretFormat';
import MergeFormats from './MergeFormats';
//import ListItemFormat from './ListItemFormat';

const NOTE_ATTR_RE = /^(src|href|style)$/;
const each = lists.each;
const isEq = FormatUtils.isEq;

const isChildOfInlineParent = (node, parent) => dom.isChildOf(node, parent) && node !== parent && !dom.isBlock(parent);

const getContainer = (ed, rng, start) => {
  let container = rng[start ? 'startContainer' : 'endContainer'];
  let offset = rng[start ? 'startOffset' : 'endOffset'];

  if (dom.isElement(container)) {
    const lastIdx = container.childNodes.length - 1;

    if (!start && offset) {
      offset--;
    }

    container = container.childNodes[offset > lastIdx ? lastIdx : offset];
  }

  // If start text node is excluded then walk to the next node
  if (dom.isText(container) && start && offset >= container.data.length) {
    container = new DomTreeWalker(container, ed.editable).next() || container;
  }

  // If end text node is excluded then walk to the previous node
  if (dom.isText(container) && !start && offset === 0) {
    container = new DomTreeWalker(container, ed.editable).prev() || container;
  }

  return container;
};

const normalizeTableSelection = (node, start) => {
  const prop = start ? 'firstChild' : 'lastChild';
  const childNode = node[prop];
  if (dom.isCellOrRow(node) && childNode) {
    if (node.nodeName === 'TR') {
      return childNode[prop] || childNode;
    } else {
      return childNode;
    }
  }

  return node;
};

const wrap = (node, name, attrs) => {
  const wrapper = dom.create(name, attrs);
  node.parentNode?.insertBefore(wrapper, node);
  wrapper.appendChild(node);

  return wrapper;
};

const wrapWithSiblings = (node, next, name, attrs = null) => {
  const start = node;
  const wrapper = dom.create(name, attrs);
  const siblings = lists.tail((next ? dom.nextSiblings(start) : dom.prevSiblings(start)));

  each(siblings, x => wrapper.appendChild(x));
  if (next) {
    dom.insertBefore(start, wrapper);
    dom.prepend(wrapper, start);
  } else {
    dom.insertAfter(start, wrapper);
    dom.append(wrapper, start);
  }

  return wrapper;
};

const isColorFormatAndAnchor = (node, format) => format.links && node.nodeName === 'A';

/**
 * Removes the node and wraps it's children in paragraphs before doing so or
 * appends BR elements to the beginning/end of the block element if forcedRootBlocks is disabled.
 *
 * If the div in the node below gets removed:
 *  text<div>text</div>text
 *
 * Output becomes:
 *  text<div><br />text<br /></div>text
 *
 * So when the div is removed the result is:
 *  text<br />text<br />text
 *
 * @private
 * @param {Node} node Node to remove + apply BR/P elements to.
 * @param {Object} format Format rule.
 * @return {Node} Input node.
 */
const removeNode = (ed, node, format) => {
  const parentNode = node.parentNode;
  let rootBlockElm = null;
  const forcedRootBlock = 'p';

  if (FormatUtils.isBlockFormat(format)) {
    // Wrap the block in a forcedRootBlock if we are at the root of document
    if (parentNode === ed.editable) {
      if (!format.list_block || !isEq(node, format.list_block)) {
        each(node.childNodes, (node) => {
          if (FormatUtils.isValid(forcedRootBlock, node.nodeName.toLowerCase())) {
            if (!rootBlockElm) {
              rootBlockElm = wrap(node, forcedRootBlock);
            } else {
              rootBlockElm.appendChild(node);
            }
          } else {
            rootBlockElm = null;
          }
        });
      }
    }
  }

  // Never remove nodes that aren't the specified inline element if a selector is specified too
  if (FormatUtils.isMixedFormat(format) && !isEq(format.inline, node)) {
    return;
  }

  dom.remove(node, false);
};

// Attributes or styles can be either an array of names or an object containing name/value pairs
const processFormatAttrOrStyle = (name, value, vars) => {
  // Indexed array
  if (Type.isNumber(name)) {
    return {
      name: value,
      value: null
    };
  } else {
    return {
      name,
      value: FormatUtils.replaceVars(value, vars)
    };
  }
};

const removeEmptyStyleAttributeIfNeeded = (elm) => {
  if (dom.getAttr(elm, 'style') === '') {
    elm.removeAttribute('style');
  }
};

const removeStyles = (elm, format, vars, compareNode) => {
  let stylesModified = false;

  each(format.styles, (value, name) => {
    const { name: styleName, value: styleValue } = processFormatAttrOrStyle(name, value, vars);
    const normalizedStyleValue = FormatUtils.normalizeStyleValue(styleValue, styleName);

    if (format.remove_similar || Type.isNull(styleValue) || !dom.isElement(compareNode) || isEq(FormatUtils.getStyle(compareNode, styleName), normalizedStyleValue)) {
      dom.setStyle(elm, styleName, '');
    }

    stylesModified = true;
  });

  if (stylesModified) {
    removeEmptyStyleAttributeIfNeeded(elm);
  }
};

const removeListStyleFormats = (editor, name, vars) => {
  if (name === 'removeformat') {
    each(ListItemFormat.getPartiallySelectedListItems(editor.selection), (li) => {
      each(ListItemFormat.listItemStyles, (name) => dom.setStyle(li, name, ''));
      removeEmptyStyleAttributeIfNeeded(li);
    });
  } else {
    const liFmt = ListItemFormat.getExpandedListItemFormat(editor.formatter, name);
    if (liFmt) {
      each(ListItemFormat.getPartiallySelectedListItems(editor.selection), (li) => removeStyles(li, liFmt, vars, null));
    }
  }
};

const removeNodeFormatInternal = (ed, format, vars, node, compareNode) => {
  // Root level block transparents should get converted into regular text blocks
  if (FormatUtils.isInlineFormat(format) && schema.isTransparentElementName(format.inline) && node.parentElement === ed.editable) {
    removeNode(ed, node, format);
    return { removed: true };
  }

  // Check if node is noneditable and can have the format removed from it
  if (node && dom.getContentEditableParent(node) === 'false') {
    return { keep: true };
  }

  // Check if node matches format
  if (node && !MatchFormat.matchName(node, format) && !isColorFormatAndAnchor(node, format)) {
    return { keep: true };
  }

  // "matchName" will made sure we're dealing with an element, so cast as one
  const elm = node;

  // Applies to styling elements like strong, em, i, u, etc. so that if they have styling attributes, the attributes can be kept but the styling element is removed
  const preserveAttributes = format.preserve_attributes;
  if (FormatUtils.isInlineFormat(format) && format.remove === 'all' && Type.isArray(preserveAttributes)) {
    // Remove all attributes except for the attributes specified in preserve_attributes
    const attrsToPreserve = lists.filter(elm.attributes, (attr) => lists.contains(preserveAttributes, attr.name.toLowerCase()));
    dom.removeAllAttrs(elm);
    each(attrsToPreserve, (attr) => dom.setAttr(elm, attr.name, attr.value));
    // Note: If there are no attributes left, the element will be removed as normal at the end of the function
    if (attrsToPreserve.length > 0) {
      // Convert inline element to span if necessary
      return { rename: 'span' };
    }
  }

  // Should we compare with format attribs and styles
  if (format.remove !== 'all') {
    removeStyles(elm, format, vars, compareNode);

    // Remove attributes
    each(format.attributes, (value, name) => {
      const { name: attrName, value: attrValue } = processFormatAttrOrStyle(name, value, vars);

      if (format.remove_similar || Type.isNull(attrValue) || !dom.isElement(compareNode) || isEq(dom.getAttr(compareNode, attrName), attrValue)) {
        // Keep internal classes
        if (attrName === 'class') {
          const currentValue = dom.getAttr(elm, attrName);

          if (currentValue) {
            // Build new class value where everything is removed except the internal prefixed classes
            let valueOut = '';
            each(currentValue.split(/\s+/), (cls) => {
              if (/note\-\w+/.test(cls)) {
                valueOut += (valueOut ? ' ' : '') + cls;
              }
            });

            // We got some internal classes left
            if (valueOut) {
              dom.setAttr(elm, attrName, valueOut);
              return;
            }
          }
        }

        // Remove note prefixed attributes (must clean before short circuit operations)
        if (NOTE_ATTR_RE.test(attrName)) {
          elm.removeAttribute('data-note-' + attrName);
        }

        // keep style="list-style-type: none" on <li>s
        if (attrName === 'style' && dom.matchNodeNames([ 'li' ])(elm) && dom.getStyle(elm, 'list-style-type') === 'none') {
          elm.removeAttribute(attrName);
          dom.setStyle(elm, 'list-style-type', 'none');
          return;
        }

        elm.removeAttribute(attrName);
      }
    });

    // Remove classes
    each(format.classes, (value) => {
      value = FormatUtils.replaceVars(value, vars);

      if (!dom.isElement(compareNode) || dom.hasClass(compareNode, value)) {
        dom.removeClass(elm, value);
      }
    });

    // Check for non internal attributes
    const attrs = elm.attributes;
    for (let i = 0; i < attrs.length; i++) {
      const attrName = attrs[i].nodeName;
      if (!NodeComparer.isAttributeInternal(attrName)) {
        return { keep: true };
      }
    }
  }

  // Remove the inline child if it's empty for example <b> or <span>
  if (format.remove !== 'none') {
    removeNode(ed, elm, format);
    return { removed: true };
  }

  return { keep: true };
};

const findFormatRoot = (editor, container, name, vars, similar) => {
  let formatRoot;

  if (container.parentNode) {
    // Find format root
    each(dom.parents(container.parentNode).reverse(), (parent) => {
      // Find format root element
      if (!formatRoot && dom.isElement(parent) && parent.id !== '_start' && parent.id !== '_end') {
        // Is the node matching the format we are looking for
        const format = MatchFormat.matchNode(editor, parent, name, vars, similar);
        if (format && format.split !== false) {
          formatRoot = parent;
        }
      }
    });
  }

  return formatRoot;
};

const removeNodeFormatFromClone = (editor, format, vars, clone) => {
  const result = removeNodeFormatInternal(editor, format, vars, clone, clone);
  if (result.keep) {
    return clone;
  }
  else if (result.rename) {
    // To rename a node, it needs to be a child of another node
    const fragment = dom.createFragment();
    fragment.appendChild(clone);
    // If renaming we are guaranteed this is a Element, so cast
    return dom.rename(clone, result.rename);
  }

  return null;
};

const wrapAndSplit = (
  editor,
  formatList,
  formatRoot,
  container,
  target,
  split,
  format,
  vars
) => {
  let lastClone;
  let firstClone;

  // Format root found then clone formats and split it
  if (formatRoot) {
    const formatRootParent = formatRoot.parentNode;
    for (let parent = container.parentNode; parent && parent !== formatRootParent; parent = parent.parentNode) {
      let clone = dom.clone(parent, false);

      for (let i = 0; i < formatList.length; i++) {
        clone = removeNodeFormatFromClone(editor, formatList[i], vars, clone);
        if (clone === null) {
          break;
        }
      }

      // Build wrapper node
      if (clone) {
        if (lastClone) {
          clone.appendChild(lastClone);
        }

        if (!firstClone) {
          firstClone = clone;
        }

        lastClone = clone;
      }
    }

    // Never split block elements if the format is mixed
    if (split && (!format.mixed || !dom.isBlock(formatRoot))) {
      container = FormatUtils.splitNode(formatRoot, container) ?? container;
    }

    // Wrap container in cloned formats
    if (lastClone && firstClone) {
      target.parentNode?.insertBefore(lastClone, target);
      firstClone.appendChild(target);

      // After splitting the nodes may match with other siblings so we need to attempt to merge them
      // Note: We can't use MergeFormats, as that'd create a circular dependency
      if (FormatUtils.isInlineFormat(format)) {
        MergeFormats.mergeSiblings(format, vars, lastClone);
      }
    }
  }

  return container;
};

const removeFormatInternal = (ed, name, vars, node, similar) => {
  const formatList = ed.formatter.get(name);
  const format = formatList[0];
  const selection = ed.selection;

  const splitToFormatRoot = (container) => {
    const formatRoot = findFormatRoot(ed, container, name, vars, similar);
    return wrapAndSplit(ed, formatList, formatRoot, container, container, true, format, vars);
  };

  // Make sure to only check for bookmarks created here (eg _start or _end)
  // as there maybe nested bookmarks
  const isRemoveBookmarkNode = (node) =>
    dom.isBookmarkNode(node) && dom.isElement(node) && (node.id === '_start' || node.id === '_end');

  const removeFormatOnNode = (node) =>
    lists.exists(formatList, (fmt) => removeNodeFormat(ed, fmt, vars, node, node));

  // Merges the styles for each node
  const process = (node) => {
    // Grab the children first since the nodelist might be changed
    const children = lists.from(node.childNodes);

    // Process current node
    const removed = removeFormatOnNode(node);

    // Include the parent if using an expanded selector format and no match was found for the current node
    const currentNodeMatches = removed || lists.exists(formatList, (f) => MatchFormat.matchName(node, f));
    const parentNode = node.parentNode;
    if (!currentNodeMatches && Type.isAssigned(parentNode) && FormatUtils.shouldExpandToSelector(format)) {
      removeFormatOnNode(parentNode);
    }

    // Process the children
    if (format.deep) {
      if (children.length) {
        for (let i = 0; i < children.length; i++) {
          process(children[i]);
        }
      }
    }

    // Note: Assists with cleaning up any stray text decorations that may been applied when text decorations
    // and text colors were merged together from an applied format
    // Remove child span if it only contains text-decoration and a parent node also has the same text decoration.
    const textDecorations = [ 'underline', 'line-through', 'overline' ];
    lists.each(textDecorations, (decoration) => {
      if (dom.isElement(node) && dom.getStyle(node, 'text-decoration') === decoration &&
        node.parentNode && FormatUtils.getTextDecoration(node.parentNode) === decoration) {
        removeNodeFormat(ed, {
          deep: false,
          exact: true,
          inline: 'span',
          styles: {
            textDecoration: decoration
          }
        }, undefined, node);
      }
    });
  };

  const unwrap = (start) => {
    const node = document.getElementById(start ? '_start' : '_end');
    if (node) {
      let out = node[start ? 'firstChild' : 'lastChild'];

      // If the end is placed within the start the result will be removed
      // So this checks if the out node is a bookmark node if it is it
      // checks for another more suitable node
      if (isRemoveBookmarkNode(out)) {
        out = out[start ? 'firstChild' : 'lastChild'];
      }

      // Since dom.remove removes empty text nodes then we need to try to find a better node
      if (dom.isText(out) && out.data.length === 0) {
        out = start ? node.previousSibling || node.nextSibling : node.nextSibling || node.previousSibling;
      }

      dom.remove(node, false);

      return out;
    } else {
      return null;
    }
  };

  const removeRngStyle = (rng) => {
    let startContainer;
    let endContainer;

    let expandedRng = FormatUtils.expandRng(rng, formatList);

    if (format.split) {
      // Split text nodes
      expandedRng = expandedRng.splitText(expandedRng);

      startContainer = getContainer(ed, expandedRng, true);
      endContainer = getContainer(ed, expandedRng);

      if (startContainer !== endContainer) {
        // WebKit will render the table incorrectly if we wrap a TH or TD in a SPAN
        // so let's see if we can use the first/last child instead
        // This will happen if you triple click a table cell and use remove formatting
        startContainer = normalizeTableSelection(startContainer, true);
        endContainer = normalizeTableSelection(endContainer, false);

        // Wrap and split if nested
        if (isChildOfInlineParent(startContainer, endContainer)) {
          const marker = startContainer.firstChild || startContainer;
          splitToFormatRoot(wrapWithSiblings(marker, true, 'span', { 'id': '_start', 'data-note-type': 'bookmark' }));
          unwrap(true);
          return;
        }

        // Wrap and split if nested
        if (isChildOfInlineParent(endContainer, startContainer)) {
          const marker = endContainer.lastChild || endContainer;
          splitToFormatRoot(wrapWithSiblings(marker, false, 'span', { 'id': '_end', 'data-note-type': 'bookmark' }));
          unwrap(false);
          return;
        }

        // Wrap start/end nodes in span element since these might be cloned/moved
        startContainer = wrap(startContainer, 'span', { 'id': '_start', 'data-note-type': 'bookmark' });
        endContainer = wrap(endContainer, 'span', { 'id': '_end', 'data-note-type': 'bookmark' });

        // Split start/end and anything in between
        let newRng = document.createRange();
        newRng.setStartAfter(startContainer);
        newRng.setEndBefore(endContainer);
        newRng = range.getWrappedRange(newRng);

        newRng.walk(nodes => {
          each(nodes, (n) => {
            if (!dom.isBookmarkNode(n) && !dom.isBookmarkNode(n.parentNode)) {
              splitToFormatRoot(n);
            }
          });
        });

        splitToFormatRoot(startContainer);
        splitToFormatRoot(endContainer);

        // Unwrap start/end to get real elements again
        // Note that the return value should always be a node since it's wrapped above
        startContainer = unwrap(true);
        endContainer = unwrap();
      } else {
        startContainer = endContainer = splitToFormatRoot(startContainer);
      }
      
      // Update range positions since they might have changed after the split operations
      expandedRng.setStart(startContainer?.parentNode || startContainer, dom.position(startContainer));
      expandedRng.setEnd(endContainer?.parentNode || endContainer, dom.position(endContainer) + 1);
    }

    // Remove items between start/end
    expandedRng.walk(nodes => {
      each(nodes, process);
    });
  };

  // Handle node
  if (node) {
    if (FormatUtils.isNode(node)) {
      const rng = document.createRange();
      rng.setStartBefore(node);
      rng.setEndAfter(node);
      removeRngStyle(range.getWrappedRange(rng));
    } else {
      removeRngStyle(node);
    }
    return;
  }

  let rng = selection.getRange();
  if (!selection.isCollapsed() || !FormatUtils.isInlineFormat(format) || rng.isOnCell()) {
    //rng = rng.splitText();

    // Remove formatting while preserving visible selection
    FormatUtils.preserveSelection(ed, rng,
      () => removeRngStyle(rng)
    );

    //// TODO: Implement moveToStart for above FormatUtils.preserveSelection? This one:...
    //// Before trying to move the start of the selection, check if start element still has formatting then we are at: "<b>text|</b>text"
    //// and need to move the start into the next text node
    // (startNode) => FormatUtils.isInlineFormat(format) && MatchFormat.match(ed, name, vars, startNode)

    // // Apply while preserving visible selection
    // FormatUtils.preserveSelection(editor, rng, () => {
    //   const expandedRng = FormatUtils.expandRng(rng, formatList);
    //   applyRngStyle(expandedRng, false);
    // });

    FormatUtils.afterFormat(ed);
  } else {
    CaretFormat.removeCaretFormat(ed, name, vars, similar);
  }

  removeListStyleFormats(ed, name, vars);
};

const removeFormat = (editor, name, vars, node, similar) => {
  if (node || editor.selection.isEditable()) {
    removeFormatInternal(editor, name, vars, node, similar);
  }
};

/**
 * Removes the specified format for the specified node. It will also remove the node if it doesn't have
 * any attributes if the format specifies it to do so.
 *
 * @private
 * @param {Object} format Format object with items to remove from node.
 * @param {Object} vars Name/value object with variables to apply to format.
 * @param {Node} node Node to remove the format styles on.
 * @param {Node} compareNode Optional compare node, if specified the styles will be compared to that node.
 * @return {Boolean} True/false if the node was removed or not.
 */
const removeNodeFormat = (editor, format, vars, node, compareNode) => {
  const result = removeNodeFormatInternal(editor, format, vars, node, compareNode);
  if (result.keep) {
    return false;
  }
  else if (result.rename) {
    // If renaming we are guaranteed this is a Element, so cast
    dom.rename(node, newName);
    return true;
  }

  return true;
};

export default {
  removeFormat,
  removeNodeFormat
};