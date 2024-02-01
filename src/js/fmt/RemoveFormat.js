import Type from '../core/Type';
import Str from '../core/Str';
import Obj from '../core/Obj';
import Convert from '../core/Convert';
import lists from '../core/lists';
import dom from '../core/dom';
import schema from '../core/schema';
import range from '../core/range';
import FormatUtils from './FormatUtils';
import MatchFormat from './MatchFormat';
import CaretFormat from './CaretFormat';
import MergeFormats from './MergeFormats';
import ListItemFormat from './ListItemFormat';

const each = lists.each;
const isEq = FormatUtils.isEq;

const isChildOfInlineParent = (node, parent) => dom.isChildOf(node, parent) && node !== parent && !dom.isBlock(parent);

// TODO: Implement getContainer

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
  // TODO: Complete RemoveFormat.wrapWithSiblings()
  if (next) {
    // Insert.before(start, wrapper);
    // Insert.prepend(wrapper, start);
  } else {
    // Insert.after(start, wrapper);
    // Insert.append(wrapper, start);
  }

  return wrapper.dom;
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
    if (parentNode === dom.getEditableRoot(node)) {
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

  dom.remove(node, true);
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
    removeEmptyStyleAttributeIfNeeded(dom, elm);
  }
};

const removeListStyleFormats = (editor, name, vars) => {
  if (name === 'removeformat') {
    each(ListItemFormat.getPartiallySelectedListItems(editor.selection), (li) => {
      each(ListItemFormat.listItemStyles, (name) => dom.setStyle(li, name, ''));
      removeEmptyStyleAttributeIfNeeded(li);
    });
  } else {
    ListItemFormat.getExpandedListItemFormat(editor.formatter, name).each((liFmt) => {
      each(ListItemFormat.getPartiallySelectedListItems(editor.selection), (li) => removeStyles(li, liFmt, vars, null));
    });
  }
};

const removeFormat = (editor, name, vars, node, similar) => {
  // ...
};

const removeNodeFormat = (editor, format, vars, node, compareNode) => {
  // ...
};

export default {
  removeFormat,
  removeNodeFormat
};