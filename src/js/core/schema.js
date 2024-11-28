import $ from 'jquery';
import Str from './Str';
import Obj from './Obj';
import func from './func';
import lists from './lists';

const mapCache = {};
const makeMap = lists.makeMap, each = lists.each, explode = Str.explode;

const specialElements = {};

const makeSchema = () => {
  const transparentContent = 
    'a ins del canvas map';
  const blockContent = 
    'address blockquote div dl fieldset form h1 h2 h3 h4 h5 h6 hr menu ol p pre table ul ' +
    'center dir isindex noframes ' + 
    'article aside details dialog figure main header footer hgroup section nav ' + transparentContent;
  const phrasingContent = 
    'a abbr b bdo br button cite code del dfn em embed i iframe img input ins kbd ' +
    'label map noscript object q s samp script select small span strong sub sup ' +
    'audio canvas command datalist mark meter output picture progress time wbr video ruby bdi keygen svg ' +
    'acronym applet basefont big font strike tt textarea u var #text #comment';
  const flowContent = 
    [ blockContent, phrasingContent ].join(' ');

  const schema = {};
  
  const addElement = (name, children) => {
    schema[name] = {
      children: lists.makeMap(children)
    };
  };

  const add = (name, children = '') => {
    children = children?.trim();
    const childNames = children ? children.trim().split(' ') : [];
    const names = name.trim().split(' ');
    let ni = names.length;
    while (ni--) {
      addElement(names[ni], childNames);
    }
  };

  add('html', 'head body');
  add('head', 'base command link meta noscript script style title');
  add('body', flowContent);
  add('dd div address dt caption', flowContent);
  add('h1 h2 h3 h4 h5 h6 pre p abbr code var samp kbd sub sup i b u bdo span legend em strong small s cite dfn', phrasingContent);
  add('ol li', 'li');
  add('li blockquote', flowContent);
  add('dl', 'dt dd');
  add('a ins del iframe', flowContent);
  add('object', [ flowContent, 'param' ].join(' '));
  add('map', [ flowContent, 'area' ].join(' '));
  add('table', 'caption colgroup thead tfoot tbody tr');
  add('colgroup', 'col');
  add('tbody thead tfoot', 'tr');
  add('tr', 'td th');
  add('td th', flowContent);
  add('form', flowContent);
  add('fieldset', [ flowContent, 'legend' ].join(' '));
  add('label button q', phrasingContent);
  add('select', 'option optgroup');
  add('optgroup', 'option');
  add('menu', [ flowContent, 'li' ].join(' '));
  add('noscript', flowContent);
  add('wbr');
  add('ruby', [ phrasingContent, 'rt rp' ].join(' '));
  add('figcaption', flowContent);
  add('mark rt rp bdi', phrasingContent);
  add('summary', [ phrasingContent, 'h1 h2 h3 h4 h5 h6' ].join(' '));
  add('canvas', flowContent);
  add('video', [ flowContent, 'track source' ].join(' '));
  add('audio', [ flowContent, 'track source' ].join(' '));
  add('picture', 'img source');
  add('datalist', [ phrasingContent, 'option' ].join(' '));
  add('article section nav aside main header footer', flowContent);
  add('hgroup', 'h1 h2 h3 h4 h5 h6');
  add('figure', [ flowContent, 'figcaption' ].join(' '));
  add('time output progress meter', phrasingContent);
  add('dialog', flowContent);
  add('details', [ flowContent, 'summary' ].join(' '));

  // Video/audio elements cannot have nested children
  each([ schema.video, schema.audio ], (item) => {
    delete item.children.audio;
    delete item.children.video;
  });

  // Delete children of the same name from it's parent
  // For example: form can't have a child of the name form
  each('a form meter progress dfn'.split(' '), (name) => {
    if (schema[name]) {
      delete schema[name].children[name];
    }
  });

  // Caption can't have tables
  delete schema.caption.children.table;

  // Delete scripts by default due to possible XSS
  delete schema.script;

  // TODO: LI:s can only have value if parent is OL

  return schema;
};

const createMap = (defaultValue, extendWith) => {
  let value = makeMap(defaultValue, ' ', makeMap(defaultValue.toUpperCase(), ' '));
  return $.extend(value, extendWith);
};

// Creates an lookup table map object for the specified option or the default value
const createLookupTable = (option, defaultValue, extendWith) => {
  let newValue = mapCache[option];
  if (!newValue) {
    newValue = createMap(defaultValue, extendWith);
    mapCache[option] = newValue;
  }
  return newValue;
};

// Setup document schema
const schemaItems = makeSchema();
const children = {}; // e.g. { div: { p:{}, h1:{} } }
each(schemaItems, (element, name) => {
  children[name] = element.children;
});

// Setup map objects
const whitespaceElementsMap = createLookupTable(
  'whitespace_elements',
  'pre script noscript style textarea video audio iframe object code'
);
const selfClosingElementsMap = createLookupTable('self_closing_elements', 'colgroup dd dt li option p td tfoot th thead tr');
const voidElementsMap = createLookupTable('void_elements', 'area audio base basefont br col frame hr iframe img input isindex link meta param embed source video wbr track');
const boolAttrMap = createLookupTable('boolean_attributes', 'checked compact declare defer disabled ismap multiple nohref noresize ' +
  'noshade nowrap readonly selected autoplay loop controls allowfullscreen');

const nonEmptyOrMoveCaretBeforeOnEnter = 'td th iframe video audio object script code';
const nonEmptyElementsMap = createLookupTable('non_empty_elements', nonEmptyOrMoveCaretBeforeOnEnter + ' pre svg', voidElementsMap);
const moveCaretBeforeOnEnterElementsMap = createLookupTable('move_caret_before_on_enter_elements', nonEmptyOrMoveCaretBeforeOnEnter + ' table', voidElementsMap);

const headings = 'h1 h2 h3 h4 h5 h6';
const headingElementsMap = createLookupTable('heading_elements', headings);
const textBlockElementsMap = createLookupTable('text_block_elements', headings + ' p div li address pre form ' +
  'blockquote center dir fieldset header footer article section hgroup aside main nav figure');
//const textBlockElementsMap = createLookupTable('text_block_elements', headings + ' p div li');
const blockElementsMap = createLookupTable('block_elements', 'hr table tbody thead tfoot ' +
  'th tr td li ol ul caption dl dt dd noscript menu isindex option ' +
  'datalist select optgroup figcaption details summary html body multicol listing', textBlockElementsMap);
const textInlineElementsMap = createLookupTable('text_inline_elements', 'span strong b em i font s strike u var cite ' +
  'dfn code mark q sup sub samp');
const textRootBlockElementsMap = createLookupTable('text_root_block_elements', 'td th li dt dd figcaption caption details summary', textBlockElementsMap);

const transparentElementsMap = createLookupTable('transparent_elements', 'a ins del canvas map');

const wrapBlockElementsMap = createLookupTable('wrap_block_elements', 'pre ' + headings);

// See https://html.spec.whatwg.org/multipage/parsing.html#parsing-html-fragments
each(('script noscript iframe noframes noembed title style textarea xmp plaintext').split(' '), (name) => {
  specialElements[name] = new RegExp('<\/' + name + '[^>]*>', 'gi');
});

/**
 * Returns a map with heading elements.
 */
const getHeadingElements = func.constant(headingElementsMap);
/**
 * Returns a map with block elements.
 */
const getBlockElements = func.constant(blockElementsMap);
/**
 * Returns a map with boolean attributes.
 */
const getBoolAttrs = func.constant(boolAttrMap);
/**
 * Returns a map with text block elements. For example: <code>&#60;p&#62;</code>, <code>&#60;h1&#62;</code> to <code>&#60;h6&#62;</code>, <code>&#60;div&#62;</code> or <code>&#60;address&#62;</code>.
 */
const getTextBlockElements = func.constant(textBlockElementsMap);
const getTextRootBlockElements = func.constant(textRootBlockElementsMap);

/**
 * Returns a map of inline text format nodes. For example: <code>&#60;strong&#62;</code>, <code>&#60;span&#62;</code> or <code>&#60;ins&#62;</code>.
 */
const getTextInlineElements = func.constant(textInlineElementsMap);
/**
 * Returns a map with void elements. For example: <code>&#60;br&#62;</code> or <code>&#60;img&#62;</code>.
 */
const getVoidElements = func.constant(Object.seal(voidElementsMap));
/**
 * Returns a map with self closing tags. For example: <code>&#60;li&#62;</code>.
 */
const getSelfClosingElements = func.constant(selfClosingElementsMap);
/**
 * Returns a map with elements that should be treated as contents regardless if it has text
 * content in them or not. For example: <code>&#60;td&#62;</code>, <code>&#60;video&#62;</code> or <code>&#60;img&#62;</code>.
 */
const getNonEmptyElements = func.constant(nonEmptyElementsMap);
/**
 * Returns a map with elements that the caret should be moved in front of after enter is pressed.
 */
const getMoveCaretBeforeOnEnterElements = func.constant(moveCaretBeforeOnEnterElementsMap);
/**
 * Returns a map with elements where white space is to be preserved. For example: <code>&#60;pre&#62;</code> or <code>&#60;script&#62;</code>.
 */
const getWhitespaceElements = func.constant(whitespaceElementsMap);
/**
 * Returns a map with elements that should be treated as transparent.
 *
 * @method getTransparentElements
 * @return {Object} Name/value lookup map for special elements.
 */
const getTransparentElements = func.constant(transparentElementsMap);
const getWrapBlockElements = func.constant(wrapBlockElementsMap);
/**
 * Returns a map with special elements. These are elements that needs to be parsed
 * in a special way such as script, style, textarea etc. The map object values
 * are regexps used to find the end of the element.
 */
const getSpecialElements = func.constant(Object.seal(specialElements));

/**
 * Returns true/false if the specified element and it's child is valid or not
 * according to the schema.
 *
 * @method isValidChild
 * @param {String} name Element name to check for.
 * @param {String} child Element child to verify.
 * @return {Boolean} True/false if the element is a valid child of the specified parent.
 */
const isValidChild = (name, child) => {
  const parent = children[name.toLowerCase()];
  // Treat missing entries as valid.
  return !!(!parent || parent[child.toLowerCase()]);
}

const isBlock = (name) => Obj.has(blockElementsMap, name);

// Check if name starts with # to detect non-element node names like #text and #comment
const isInline = (name) => !Str.startsWith(name, '#') && !Obj.has(blockElementsMap, name);

const isWrapper = (name) => Obj.has(wrapBlockElementsMap, name) || isInline(name);
const isVoid = (name) => Obj.has(voidElementsMap, name);

const isTransparentElementName = (name) => Obj.has(getTransparentElements(), name);
const isTransparentElement = (node) => dom.isElement(node) && isTransparentElementName(node.nodeName);

export default {
  getHeadingElements,
  getBlockElements,
  getVoidElements,
  getTextBlockElements,
  getTextInlineElements,
  getTextRootBlockElements,
  getBoolAttrs,
  getSelfClosingElements,
  getNonEmptyElements,
  getMoveCaretBeforeOnEnterElements,
  getWhitespaceElements,
  getTransparentElements,
  getWrapBlockElements,
  getSpecialElements,
  isValidChild,
  isBlock,
  isInline,
  isWrapper,
  isVoid,
  isTransparentElementName,
  isTransparentElement
};