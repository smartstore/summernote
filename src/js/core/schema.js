import $ from 'jquery';
import func from './func';
import lists from './lists';

const mapCache = {};
const makeMap = lists.makeMap, each = lists.each, explode = lists.explode;

const createMap = (defaultValue, extendWith) => {
  let value = makeMap(defaultValue, ' ', makeMap(defaultValue.toUpperCase(), ' '));
  return $.extend(value, extendWith);
};

export const getTextRootBlockElements = (schema) =>
  createMap(
    'td th li dt dd figcaption caption details summary',
    schema.getTextBlockElements()
  );

const compileElementMap = (value, mode) => {
  if (value) {
    const styles = {};
    if (func.isString(value)) {
      value = { '*': value };
    }
    each(value, (value, key) => {
      styles[key] = styles[key.toUpperCase()] = mode === 'map' ? makeMap(value, /[, ]/) : explode(value, /[, ]/);
    });
    return styles;
  } else {
    return undefined;
  }
};

const Schema = (options = {}) => {
  const elements = {};
  const children = {};
  let patternElements = [];
  const customElementsMap = {};
  const specialElements = {};

  // Creates an lookup table map object for the specified option or the default value
  const createLookupTable = (option, defaultValue, extendWith) => {
    const value = options[option];
    if (!value) {
      let newValue = mapCache[option];
      if (!newValue) {
        newValue = createMap(defaultValue, extendWith);
        mapCache[option] = newValue;
      }
      return newValue;
    } else {
      return makeMap(value, /[, ]/, makeMap(value.toUpperCase(), /[, ]/));
    }
  };

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
  const textBlockElementsMap = createLookupTable('text_block_elements', headings + ' p div address pre form ' +
    'blockquote center dir fieldset header footer article section hgroup aside main nav figure');
  const blockElementsMap = createLookupTable('block_elements', 'hr table tbody thead tfoot ' +
    'th tr td li ol ul caption dl dt dd noscript menu isindex option ' +
    'datalist select optgroup figcaption details summary html body multicol listing', textBlockElementsMap);
  const textInlineElementsMap = createLookupTable('text_inline_elements', 'span strong b em i font s strike u var cite ' +
    'dfn code mark q sup sub samp');

  const transparentElementsMap = createLookupTable('transparent_elements', 'a ins del canvas map');

  const wrapBlockElementsMap = createLookupTable('wrap_block_elements', 'pre ' + headings);

  // See https://html.spec.whatwg.org/multipage/parsing.html#parsing-html-fragments
  each(('script noscript iframe noframes noembed title style textarea xmp plaintext').split(' '), (name) => {
    specialElements[name] = new RegExp('<\/' + name + '[^>]*>', 'gi');
  });

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
   */
  const isValidChild = (name, child) => {
    // TODO: Implement schema.isValidChild
    return true;
  }

  /**
   * Returns true/false if the specified element name and optional attribute is
   * valid according to the schema.
   *
   * @method isValid
   * @param {String} name Name of element to check.
   * @param {String} attr Optional attribute name to check for.
   */
  const isValid = (name, attr = null) => {
    // TODO: Implement schema.isValid
    return true;
  }

  const isBlock = (name) => func.has(blockElementsMap, name);

  // Check if name starts with # to detect non-element node names like #text and #comment
  const isInline = (name) => !func.startsWith(name, '#') && isValid(name) && !isBlock(name);

  const isWrapper = (name) => func.has(wrapBlockElementsMap, name) || isInline(name);

  return {
    getBlockElements,
    getVoidElements,
    getTextBlockElements,
    getTextInlineElements,
    getBoolAttrs,
    getSelfClosingElements,
    getNonEmptyElements,
    getMoveCaretBeforeOnEnterElements,
    getWhitespaceElements,
    getTransparentElements,
    getWrapBlockElements,
    getSpecialElements,
    isValidChild,
    isValid,
    isBlock,
    isInline,
    isWrapper
  };
}

export default Schema;