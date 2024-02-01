import $ from 'jquery';
import Type from './Type';
import Obj from './Obj';
import Str from './Str';
import func from './func';
import lists from './lists';
import env from './env';
import schema from './schema';
import { contains } from 'underscore';

const beautifyOpts = {
  indent_size: 2,
  indent_with_tabs: true,
  indent_char: " ",
  max_preserve_newlines: "2",
  preserve_newlines: true,
  keep_array_indentation: false,
  break_chained_methods: false,
  indent_scripts: "normal",
  brace_style: "collapse",
  space_before_conditional: true,
  unescape_strings: false,
  jslint_happy: false,
  end_with_newline: false,
  wrap_line_length: "140",
  indent_inner_html: true,
  comma_first: false,
  e4x: false,
  indent_empty_lines: false
};

// #region Private utils

// Private
const getNode = (node) =>
  Type.isJquery(node) ? node.get(0) : node;

// Private
const isUpperNodeName = (str) => {
  const code = str.charCodeAt(0);
  return code >= 65 && code <= 90;
};

const getComputedStyle = (node, name) => {
  if (isElement(node)) {
    const win = node.ownerDocument.defaultView;
    if (win) {
      const computed = win.getComputedStyle(node, null);
      return computed ? computed.getPropertyValue(name) : null;
    }
  }
  return null;
};

// Private
const matchNodeName = (name) => {
  const upperCasedName = name.toUpperCase();

  return (node) =>
    Type.isAssigned(node) && (isUpperNodeName(node.nodeName) ? node.nodeName : node.nodeName.toUpperCase()) === upperCasedName;
};

// #endregion


// #region Matchers

const matchNodeNames = (names) => {
  if (Type.isString(names)) {
    names = Str.explode(names, ' ');
  }

  if (names.length === 0 || names === '*') {
    return func.ok;
  } else if (names.length == 1) {
    return matchNodeName(names[0]);
  }

  const upperCasedNames = names.map((s) => s.toUpperCase());

  return (node) => {
    if (node && node.nodeName) {
      const nodeName = isUpperNodeName(node.nodeName) ? node.nodeName : node.nodeName.toUpperCase();
      return lists.contains(upperCasedNames, nodeName);
    }

    return false;
  };
};

const matchSchemaMap = (map) => {
  return (node) =>
    node && Obj.has(map, node.nodeName)
};

const matchStyleValues = (name, values) => {
  const items = values.toLowerCase().split(' ');

  return (node) => {
    const styleValue = getComputedStyle(node, name);
    return styleValue && lists.contains(items, styleValue);
  };
};

const matchClass = (className) => {
  return (node) => {
    return node && $(node).hasClass(className);
  };
};

const matchAttribute = (attrName) => {
  return (node) => {
    return isElement(node) && node.hasAttribute(attrName);
  };
};

const matchAttributeValue = (attrName, attrValue) => {
  return (node) => {
    return isElement(node) && node.getAttribute(attrName) === attrValue;
  };
};

const matchContentEditableState = (value) => {
  return (node) => {
    if (isHTMLElement(node)) {
      if (node.contentEditable === value) {
        return true;
      }

      if (node.getAttribute('data-note-contenteditable') === value) {
        return true;
      }
    }

    return false;
  };
};

/**
 * Creates a callback if given selector is string or just returns the selector function.
 * 
 * @param {Function|string|Node} selector - The selector string, function or node to match. If string, `Node.matches()` will be called internally.
 * @param {Function} [defaultSelector] - The default function selector to use if `selector` is null or invalid.
 */
const matchSelector = (selector, defaultSelector) => {
  if (Type.isFunction(selector)) {
    return selector;
  }
  else if (isNode(selector)) {
    return func.eq(selector);
  }
  else if (Type.isString(selector)) {
    return selector.length ? (node) => node.matches && node.matches(selector) : defaultSelector;
  } 
  else {
    return defaultSelector;
  }
};

// #endregion


// #region Is*

// Private
const isNodeType = (type) => {
  return (node) => !!node && node.nodeType === type;
};

const isNode = node => Type.isNumber(node?.nodeType);
const isElement = isNodeType(1);
const isText = isNodeType(3);
const isCData = isNodeType(4);
const isPi = isNodeType(7);
const isComment = isNodeType(8);
const isDocument = isNodeType(9);
const isDocumentFragment = isNodeType(11);
const isSVGElement = node => isElement(node) && node.namespaceURI === 'http://www.w3.org/2000/svg';
const isHTMLElement = func.and(isElement, func.not(isSVGElement));

// Firefox can allow you to get a selection on a restricted node, such as file/number inputs. These nodes
// won't implement the Object prototype, so Object.getPrototypeOf() will return null or something similar.
const isRestrictedNode = (node) => !!node && !Object.getPrototypeOf(node);

const isBody = matchNodeName('BODY');
const isPre = matchNodeName('PRE');
const isLi = matchNodeName('LI');
const isTable = matchNodeName('TABLE');
const isData = matchNodeName('DATA');
const isHr = matchNodeName('HR');
const isListItem = matchNodeName('LI');
const isDetails = matchNodeName('DETAILS');
const isSummary = matchNodeName('SUMMARY');
const isBlockquote = matchNodeName('BLOCKQUOTE');
const isAnchor = matchNodeName('A');
const isDiv = matchNodeName('DIV');
const isSpan = matchNodeName('SPAN');
const isB = matchNodeName('B');
const isBR = matchNodeName('BR');
const isImg = matchNodeName('IMG');
const isFigure = matchNodeName('FIGURE');
const isTextarea = matchNodeName('TEXTAREA');

const isTextareaOrInput = matchNodeNames(['TEXTAREA', 'INPUT', 'SELECT']);
const isList = matchNodeNames(['UL', 'OL']);
const isCell = matchNodeNames(['TD', 'TH']);
const isCellOrRow = matchNodeNames(['TR', 'TD', 'TH']);
const isCellOrCaption = matchNodeNames(['TD', 'TH', 'CAPTION']);
const isMedia = matchNodeNames(['VIDEO', 'AUDIO', 'OBJECT', 'EMBED']);
const isHeading = matchSchemaMap(schema.getHeadingElements());
const isPara = (node) => !isEditableRoot(node) && Obj.has(schema.getTextBlockElements(), node.nodeName);
const isPurePara = (node) => isPara(node) && !isLi(node);
const isInline = (node) => schema.isInline(node.nodeName);
const isBlock = (node) => !schema.isInline(node.nodeName);
const isParaInline = (node) => isInline(node) && !!closest(node, isPara);
const isBodyInline = (node) => isInline(node) && !closest(node, isPara);
const isBodyContainer = (node) => isCell(node) || isBlockquote(node) || isEditableRoot(node);

const isBookmarkNode = func.and(matchNodeName('SPAN'), matchAttributeValue('data-note-type', 'bookmark'))
const isVoid = (node) => node && schema.isVoid(node.nodeName);
const isEmptyAnchor = (node) => isAnchor(node) && isEmpty(node);

const matches = (node, selector) => matchSelector(selector)(node);

// Perf
const isControlSizing = (node) => node?.classList && node.nodeName === 'DIV' && node.classList.contains('note-control-sizing');

/**
 * Checks whether node is given tag
 *
 * @param {Node} node
 * @param {String|Array} tagName - Either a single tag as string or an array of tag names to check
 */
const isTag = (node, tag) => matchNodeNames(tag)(node);

// #endregion


// #region ContentEditable

/**
 * Gets the root editable node.
 */
const getEditableRoot = (node) => $(node).closest('.note-editable')[0];

// Perf
const isEditableRoot = (node) => node?.classList && node.nodeName === 'DIV' && node.classList.contains('note-editable');

const isContentEditable = (node) => {
  if (node) {
    const scope = isElement(node) ? node : node.parentElement;
    return !!scope && scope.isContentEditable;
  }
  return false;
};

const getContentEditable = (node) => {
  if (node && isHTMLElement(node)) {
    // Check for fake content editable
    const contentEditable = node.getAttribute('data-note-contenteditable');
    if (contentEditable && contentEditable !== 'inherit') {
      return contentEditable;
    }

    // Check for real content editable
    return node.contentEditable !== 'inherit' ? node.contentEditable : null;
  } else {
    return null;
  }
};

const getContentEditableParent = (node) => {
  const root = getRoot();
  let state = null;

  for (let tempNode = node; tempNode && tempNode !== root; tempNode = tempNode.parentNode) {
    state = getContentEditable(tempNode);

    if (state !== null) {
      break;
    }
  }

  return state;
};

// #endregion


// #region Utils

/**
 * blank HTML for cursor position
 * - [workaround] old IE only works with &nbsp;
 * - [workaround] IE11 and other browser works with bogus br
 */
const blankHTML = env.isMSIE && env.browserVersion < 11 ? '&nbsp;' : '<br>';

const createText = (text) => document.createTextNode(text);

const create = (nodeName, attrs = null, html = null) => {
  const node = document.createElement(nodeName);
  
  if (Type.isObject(attrs)) {
    lists.each(attrs, (name) => {
      setAttr(node, name, attrs[name]);
    });
  }

  if (html) {
    if (!Type.isString(html) && html.nodeType) {
      node.appendChild(html);
    } 
    else if (Type.isString(html) && html.length) {
      node.innerHTML = html;
    }    
  }

  return node;
};


/**
 * Gets the value of an HTML attribute
 *
 * @param {any} node - an HTML DOM node or jQuery object
 * @param {String} name - the attribute name
 * @return {String|null}
 */
const getAttr = (node, name) => {
  node = getNode(node);
  if (node) {
    return node.getAttribute(name);
  }
  return null;
}

/**
 * Sets an HTML attribute
 *
 * @param {any} node - an HTML DOM node or jQuery object
 * @param {String} name - the attribute name
 * @param {String} value - the attribute value. If null or undefined, attribute will be removed.
 * @return {Boolean}
 */
const setAttr = (node, name, value) => {
  node = getNode(node);
  if (node) {
    if (!!value)
      node.setAttribute(name, value)
    else
      node.removeAttribute(name);
  }
}

/**
 * Returns the current style or runtime/computed value of an element.
 *
 * @method getStyle
 * @param {JQuery/Element} node HTML element or jQuery object to get style from.
 * @param {String} name Style name to return.
 * @param {Boolean} computed Get computed style?.
 * @return {String} Current style or computed style value of an element.
 */
const getStyle = (node, name, computed = false) => {
  if (computed) {
    return getComputedStyle(getNode(node), Str.camelCaseToHyphens(name));
  } else {
    return $(node).css(name);
  }
};

/**
 * Sets the CSS style value on a HTML element. The name can be a camelcase string or the CSS style name like background-color.
 */
const setStyle = (node, name, value) => {
  $(node).css(name, value);
};

/**
 * Sets multiple styles on the specified element(s).
 */
const setStyles = (node, styleMap) => {
  $(node).css(styleMap);
};

const hasClass = (node, name) => {
  return $(node).hasClass(name);
};

const addClass = (node, name) => {
  return $(node).addClass(name);
};

const removeClass = (node, name) => {
  return $(node).removeClass(name);
};

const toggleClass = (node, name, state) => {
  return $(node).toggleClass(name, state);
};

const parseStyle = (node) => {
  const result = {};
  for (let i = 0, len = node?.style?.length; i < len; i++) {
    const name = node.style[i];
    result[name] = node.style.getPropertyValue(name);
  }
  return result;
};

/**
 * Gets #text's text size or element's childNodes size
 */
const nodeLength = (node) => {
  if (isText(node)) {
    return node.nodeValue.length;
  } else if (node) {
    return node.childNodes.length;
  }
  return 0;
}

/**
 * Checks whether node is empty or not.
 */
const isEmpty = (node) => {
  // TODO: Implement Tiny's DOMUtils.isEmpty().
  const len = nodeLength(node);

  if (len === 0) {
    return true;
  } else if (!isText(node) && len === 1 && node.innerHTML === blankHTML) {
    // ex) <p><br></p>, <span><br></span>
    return true;
  } else if (lists.all(node.childNodes, isText) && node.innerHTML === '') {
    // ex) <p></p>, <span></span>
    return true;
  }
  return false;
}

/**
 * Checks whether deepest child node is empty or not.
 */
const deepestChildIsEmpty = (node) => {
  do {
    if (node.firstElementChild === null || node.firstElementChild.innerHTML === '') break;
  } while ((node = node.firstElementChild));
  return isEmpty(node);
}

/**
 * Check whether node2 is closest sibling of node1
 */
const isClosestSibling = (node1, node2) =>
  node1.nextSibling === node2 || node1.previousSibling === node2;


const isChildOf = (node, parent) => node === parent || parent.contains(node);

/**
 * Checks whether node is left edge of parent or not.
 *
 * @param {Node} node
 * @param {Node} parent
 */
const isLeftEdgeOf = (node, parent) => {
  while (node && node !== parent) {
    if (position(node) !== 0) {
      return false;
    }
    node = node.parentNode;
  }

  return true;
}

/**
 * Checks whether node is right edge of parent or not.
 *
 * @param {Node} node
 * @param {Node} parent
 */
const isRightEdgeOf = (node, parent) => {
  if (!parent) {
    return false;
  }
  while (node && node !== parent) {
    if (position(node) !== nodeLength(node.parentNode) - 1) {
      return false;
    }
    node = node.parentNode;
  }

  return true;
}

/**
 * Gets offset from parent.
 */
const position = (node, normalized) => {
  let idx = 0;

  if (node) {
    for (let lastNodeType = node.nodeType, tempNode = node.previousSibling; tempNode; tempNode = tempNode.previousSibling) {
      const nodeType = tempNode.nodeType;

      // Normalize text nodes
      if (normalized && isText(tempNode)) {
        if (nodeType === lastNodeType || !tempNode.data.length) {
          continue;
        }
      }
      idx++;
      lastNodeType = nodeType;
    }
  }

  return idx;
}

const hasChildren = (node) => {
  return !!(node && node.childNodes && node.childNodes.length);
}
  
const getRangeNode = (container, offset) => {
  if (isElement(container) && container.hasChildNodes()) {
    const childNodes = container.childNodes;
    const safeOffset = func.clamp(offset, 0, childNodes.length - 1);
    return childNodes[safeOffset];
  }
  else {
    return container;
  }
}

/**
 * @param {jQuery} $node
 * @param {Boolean} [stripLinebreaks] - default: false
 */
const value = ($node, stripLinebreaks) => {
  const val = isTextarea(getNode($node)) ? $node.val() : $node.html();
  if (stripLinebreaks) {
    return val.replace(/[\n\r]/g, '');
  }
  return val;
}

/**
 * @method html
 *
 * Get the HTML contents of node
 *
 * @param {jQuery} $node
 * @param {Boolean} [isNewlineOnBlock]
 */
const html = ($node, prettifyHtml) => {
  let markup = value($node);

  if (prettifyHtml) {
    if (typeof window.html_beautify !== 'undefined') {
      markup = window.html_beautify(markup, beautifyOpts);
    }
    else {
      const regexTag = /<(\/?)(\b(?!!)[^>\s]*)(.*?)(\s*\/?>)/g;
      markup = markup.replace(regexTag, function(match, endSlash, name) {
        name = name.toUpperCase();
        const isEndOfInlineContainer = /^DIV|^TD|^TH|^P|^LI|^H[1-7]/.test(name) &&
                                     !!endSlash;
        const isBlockNode = /^BLOCKQUOTE|^TABLE|^TBODY|^TR|^HR|^UL|^OL/.test(name);
  
        return match + ((isEndOfInlineContainer || isBlockNode) ? '\n' : '');
      });
      markup = markup.trim();
    }
  }

  return markup;
}

const posFromPlaceholder = (placeholder) => {
  const $placeholder = $(placeholder);
  const pos = $placeholder.offset();
  const height = $placeholder.outerHeight(true); // include margin

  return {
    left: pos.left,
    top: pos.top + height,
  };
}

const attachEvents = ($node, events) => {
  Object.keys(events).forEach(function(key) {
    $node.on(key, events[key]);
  });
}

const detachEvents = ($node, events) => {
  Object.keys(events).forEach(function(key) {
    $node.off(key, events[key]);
  });
}

/**
 * @method isCustomStyleTag
 * Assert if a node contains a "note-styletag" class,
 * which implies that's a custom-made style tag node
 *
 * @param {Node} an HTML DOM node
 */
const isCustomStyleTag = (node) => {
  return node && !isText(node) && lists.contains(node.classList, 'note-styletag');
}

// #endregion


// #region Traverse

const select = (node, selector) => {
  const elm = getNode(node);
  if (elm) {
    return elm.querySelectorAll ? lists.from(elm.querySelectorAll(selector)) : [];
  }
  return [];
};

/**
 * Gets the direct parent of given node but does not go beyond editor root.
 */
const parent = (node) => {
  const parentNode = node?.parentNode;
  if (!parentNode || isEditableRoot(parentNode)) {
    return null;
  }

  return parentNode;
};

/**
 * Finds closest parent that matches the given selector.
 *
 * @param {Function|String} selector - Selector function, string or node.
 */
const closest = (node, selector) => {
  node = getNode(node);
  if (node) {
    const pred = matchSelector(selector);
    while (node) {
      if (pred(node)) { return node; }
      node = parent(node);
    }
  }
  return null;
}

/**
 * Finds closest parent that has only a single child and matches the given selector.
 *
 * @param {Function|String} selector - Selector function or string.
 */
function closestSingleParent(node, selector) {
  node = parent(getNode(node));
  if (node) {
    const pred = matchSelector(selector);
    while (node) {
      if (nodeLength(node) !== 1) { break; }
      if (pred(node)) { return node; }
      node = parent(node);
    }
  }
  return null;
}

/**
 * Gets array of parent nodes until selector hit (including start and hit node).
 *
 * @param {Function|String} [selector] - Selector function or string.
 */
const parents = (node, selector) => {
  const pred = matchSelector(selector, func.fail);
  const parents = [];

  closest(node, (el) => {
    parents.push(el);
    return pred(el);
  });

  return parents;
}

/**
 * Gets array of parent nodes that match the given selector until 
 * optional rootSelector hit (including start and excluding root).
 *
 * @param {Function|String} [optional] selector - Selector function or string.
 * @param {Function|String} [optional] rootSelector - Selector function or string for the farthest root.
 */
const parentsWhile = (node, selector = null, rootSelector = null) => {
  const pred = matchSelector(selector, func.ok);
  const rootPred = matchSelector(rootSelector, func.fail);
  const parents = [];
  
  closest(node, (el) => {
    if (rootPred(el)) return false;
    if (pred(el)) parents.push(el);
    return true;
  });

  return parents;
}

/**
 * Finds farthest parent that matches the given selector.
 *
 * @param {Function|String} [optional] selector - Selector function or string.
 */
const farthestParent = (node, selector) => {
  const pred = matchSelector(selector);
  const nodes = parents(node);
  return lists.last(nodes.filter(pred));
}

/**
 * Find the common parent node for two nodes.
 */
const commonParent = (node1, node2) => {
  const nodes = parents(node1);
  for (let n = node2; n; n = parent(n)) {
    if (nodes.indexOf(n) > -1) return n;
  }
  return null;
}

/**
 * Gets array with prev sibling, node and next sibling.
 *
 * @param {Node} node - the center node.
 * @param {Function|String} [optional] selector - Selector function or string for the siblings.
 * @return {Node[]} - an array that contains 1-3 node items.
 */
const withClosestSiblings = (node, selector) => {
  const pred = matchSelector(selector, func.ok);
  const siblings = [];

  node = getNode(node);
  if (node) {
    if (node.previousSibling && pred(node.previousSibling)) {
      siblings.push(node.previousSibling);
    }
    siblings.push(node);
    if (node.nextSibling && pred(node.nextSibling)) {
      siblings.push(node.nextSibling);
    }
  }
  return siblings;
}

// Private
const siblings = (node, selector, next) => {
  const pred = matchSelector(selector, func.fail);
  const siblings = [];

  node = getNode(node);
  if (node) {
    while (node) {
      if (pred(node)) { break; }
      siblings.push(node);
      node = next ? node.nextSibling : node.previousSibling;
    }
  }
  return siblings;
}

/**
 * Gets array of previous sibling nodes until selector hit (including start and hit node).
 *
 * @param {Function|String} [optional] selector - Selector function or string.
 */
const prevSiblings = (node, selector) => siblings(node, selector, false);

/**
 * Gets array of next sibling nodes until selector hit (including start and hit node).
 *
 * @param {Function|String} [optional] selector - Selector function or string.
 */
const nextSiblings = (node, selector) => siblings(node, selector, true);

/**
 * Gets array of child nodes that match the given (optional) selector.
 *
 * @param {Function|String} [optional] selector - Selector function or string.
 * @param {bool} deep - If `true`, traverses all sub-children also.
 */
const children = (node, selector, deep = true) => {
  const pred = matchSelector(selector, func.ok);
  const nodes = [];

  node = getNode(node);
  if (node) {
    (function walk(current, d) {
      if (node !== current && pred(current)) {
        nodes.push(current);
      }
      
      if (d) {
        for (let idx = 0, len = current.childNodes.length; idx < len; idx++) {
          walk(current.childNodes[idx]);
        }
      }
    })(node, deep);
  }

  return nodes;
}

/*
* Gets the next text node index or 0 if not found.
*/
const getNextTextNode = (actual) => {
  actual = getNode(actual);
  if(!actual.nextSibling) return undefined;
  if(actual.parent !== actual.nextSibling.parent) return undefined;

  return isText(actual.nextSibling) 
    ? actual.nextSibling 
    : getNextTextNode(actual.nextSibling);
}

/**
 * Get offset path (array of offset) from parent.
 *
 * @param {Node} parent - parent node
 * @param {Node} node
 */
const makeOffsetPath = (parent, node) => {
  const nodes = parents(node, parent);
  return nodes.map(position).reverse();
}

/**
 * Gets element from offset path (array of offset).
 *
 * @param {Node} parent - parent node
 * @param {array} offsets - offset path
 */
function fromOffsetPath(parent, offsets) {
  let current = parent;
  for (let i = 0, len = offsets.length; i < len; i++) {
    if (current.childNodes.length <= offsets[i]) {
      current = current.childNodes[current.childNodes.length - 1];
    } else {
      current = current.childNodes[offsets[i]];
    }
  }
  return current;
}

const findPara = (node) => closest(node, isPara);

// #endregion


// #region Manipulation

/**
 * Wrap node with new tag.
 *
 * @param {Node} node
 * @param {Node} tagName of wrapper
 * @return {Node} - wrapper
 */
const wrap = (node, wrapperName) => {
  const parent = node.parentNode;
  const wrapper = $('<' + wrapperName + '>')[0];

  parent.insertBefore(wrapper, node);
  wrapper.appendChild(node);

  return wrapper;
}

/**
 * Unwrap node.
 *
 * @param {Node} node
 * @return {NodeList} - The unwrapped child nodes.
 */
const unwrap = (node) => {
  const parent = node.parentNode;
  const children = parent.childNodes;
  parent.replaceWith(...children);
  return children.length == 1 ? children.item(0) : node;
}

/**
 * Insert node after preceding
 *
 * @param {Node} node
 * @param {Node} preceding - predicate function
 */
const insertAfter = (node, preceding) => {
  const next = preceding.nextSibling;
  let parent = preceding.parentNode;
  if (next) {
    parent.insertBefore(node, next);
  } else {
    parent.appendChild(node);
  }
  return node;
}

/**
 * Append child elements to given node.
 *
 * @param {Node} node
 * @param {Collection} children
 */
const appendChildNodes = (node, children) => {
  lists.each(children, (child) => {
    // special case: appending a pure UL/OL to a LI element creates inaccessible LI element
    // e.g. press enter in last LI which has UL/OL-subelements
    // Therefore, if current node is LI element with no child nodes (text-node) and appending a list, add a br before
    if (isLi(node) && node.firstChild === null && isList(child)) {
      node.appendChild(create("br"));
    }
    node.appendChild(child);
  });
  return node;
}

/**
 * Remove node, (deep: remove children also?)
 *
 * @param {Node} node
 * @param {Boolean} deep
 */
const remove = (node, deep) => {
  if (!node || !node.parentNode) { return; }
  //if (node.removeNode) { return node.removeNode(deep); }

  const parent = node.parentNode;
  if (!deep) {
    const keptNodes = [];
    for (let i = 0, len = node.childNodes.length; i < len; i++) {
      const child = node.childNodes[i];
      if (isText(child) && child.length === 0) {
        // Delete anyway
        node.removeChild(child);
      }
      else {
        keptNodes.push(child);
      }
    }

    for (let i = 0, len = keptNodes.length; i < len; i++) {
      parent.insertBefore(keptNodes[i], node);
    }
  }

  parent.removeChild(node);
}

const removeWhile = (node, selector) => {
  const pred = matchSelector(selector);
  while (node) {
    if (isEditableRoot(node) || !pred(node)) {
      break;
    }
    const parent = node.parentNode;
    remove(node);
    node = parent;
  }
}

/**
 * Replaces the node `oldElm` with given node `newElm`.
 *
 * @param {Node} newElm - The new replacee.
 * @param {Node} oldElm - The node to replace.
 * @return {Node} - The replace (`newElm`)
 */
const replace = (newElm, oldElm, keepChildren) => {
  // Copy children
  if (keepChildren) {
    while (oldElm.firstChild) {
      newElm.appendChild(oldElm.firstChild);
    }
  }

  // Replace node
  oldElm.parentNode?.replaceChild(newElm, oldElm);
  return newElm;
}

/**
 * @method replace
 *
 * Returns a copy of node. If `deep` is true, the copy also includes the node's descendants.
 *
 * @param {Node} node - The node to clone.
 * @param {boolean} [deep] - Whether to copy also node's descendants.
 * @return {Node} - The new clone node
 */
const clone = (node, deep) => node.cloneNode(deep);

/**
 * @method rename
 *
 * Rename node with provided nodeName
 *
 * @param {Node} node
 * @param {String} nodeName
 * @return {Node} - Node
 */
const rename = (node, nodeName) => {
  if (!isElement(node) || node.nodeName.toUpperCase() === nodeName.toUpperCase()) {
    return node;
  }

  const newNode = create(nodeName);

  // Copy attributes
  [...node.attributes].map(({ name, value }) => {
    newNode.setAttribute(name, value);
  });

  return replace(newNode, node, true);
}

// #endregion


export default {
  /** @property {String} blank */
  blank: blankHTML,
  /** @property {String} emptyPara */
  emptyPara: `<p>${blankHTML}</p>`,
  matchSelector,
  matchNodeNames,
  matchClass,
  matchStyleValues,
  matchAttribute,
  matchContentEditableState,
  matches,
  getEditableRoot,
  isEditableRoot,
  isContentEditable,
  getContentEditable,
  getContentEditableParent,
  isControlSizing,
  isNode,
  isText,
  isElement,
  isBookmarkNode,
  isCData,
  isPi,
  isComment,
  isDocument,
  isDocumentFragment,
  isSVGElement,
  isHTMLElement,
  isRestrictedNode,
  isVoid,
  isTag,
  isPara,
  findPara,
  isPurePara,
  isHeading,
  isInline,
  isBlock,
  isBodyInline,
  isBody,
  isParaInline,
  isPre,
  isList,
  isTable,
  isData,
  isHr,
  isListItem,
  isDetails,
  isSummary,
  isCell,
  isCellOrRow,
  isCellOrCaption,
  isMedia,
  isBlockquote,
  isBodyContainer,
  isAnchor,
  isDiv,
  isLi,
  isBR,
  isSpan,
  isB,
  isImg,
  isFigure,
  isTextarea,
  isTextareaOrInput,
  isEmpty,
  isEmptyAnchor,
  isClosestSibling,
  deepestChildIsEmpty,
  withClosestSiblings,
  nodeLength,
  isLeftEdgeOf,
  isRightEdgeOf,
  select,
  closest,
  ancestor: closest, // Alias
  closestSingleParent,
  parents,
  parentsWhile,
  farthestParent,
  commonParent,
  prevSiblings,
  nextSiblings,
  children,
  isChildOf,
  wrap,
  unwrap,
  insertAfter,
  appendChildNodes,
  position,
  hasChildren,
  makeOffsetPath,
  fromOffsetPath,
  getRangeNode,
  getNextTextNode,
  create,
  createText,
  remove,
  removeWhile,
  clone,
  rename,
  replace,
  html,
  value,
  posFromPlaceholder,
  attachEvents,
  detachEvents,
  isCustomStyleTag,
  setAttr,
  getAttr,
  getStyle,
  setStyle,
  setStyles,
  hasClass,
  addClass,
  removeClass,
  toggleClass,
  parseStyle
};
