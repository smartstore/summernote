import $ from 'jquery';
import func from '../core/func';
import lists from '../core/lists';
import range from '../core/range';
import dom from '../core/dom';

export default class Style {
  constructor(context) {
    this.options = context.options;
  }

  /**
   * @method jQueryCSS
   *
   * [workaround] for old jQuery
   * passing an array of style properties to .css()
   * will result in an object of property-value pairs.
   * (compability with version < 1.9)
   *
   * @private
   * @param  {jQuery} $obj
   * @param  {Array} propertyNames - An array of one or more CSS properties.
   * @return {Object}
   */
  jQueryCSS($obj, propertyNames) {
    const result = {};
    $.each(propertyNames, (idx, propertyName) => {
      result[propertyName] = $obj.css(propertyName);
    });
    return result;
  }

  /**
   * returns style object from node
   *
   * @param {jQuery} $node
   * @return {Object}
   */
  fromNode($node) {
    const properties = ['font-size', 'text-align', 'list-style-type', 'line-height'];
    const styleInfo = this.jQueryCSS($node, properties) || {};

    const fontSize = $node[0].style.fontSize || styleInfo['font-size'];

    styleInfo['font-size'] = parseInt(fontSize, 10);
    styleInfo['font-size-unit'] = fontSize.match(/[a-z%]+$/);

    return styleInfo;
  }

  /**
   * paragraph level style
   *
   * @param {WrappedRange} rng
   * @param {Object} styleInfo
   */
  stylePara(rng, styleInfo) {
    $.each(rng.nodes(dom.isPara, {
      includeAncestor: true,
    }), (idx, para) => {
      $(para).css(styleInfo);
    });
  }

  /**
   * insert and returns styleNodes on range.
   *
   * @param {WrappedRange} rng
   * @param {Object} [options] - options for styleNodes
   * @param {String} [options.nodeName] - default: `SPAN`
   * @param {Boolean} [options.expandClosestSibling] - default: `false`
   * @param {Boolean} [options.onlyPartialContains] - default: `false`
   * @return {Node[]}
   */
  styleNodes(rng, options) {
    rng = rng.splitText();

    const nodeName = (options && options.nodeName) || 'SPAN';
    const expandClosestSibling = !!(options && options.expandClosestSibling);
    const onlyPartialContains = !!(options && options.onlyPartialContains);

    if (rng.isCollapsed()) {
      return [rng.insertNode(dom.create(nodeName))];
    }

    let pred = dom.makePredByNodeName(nodeName);
    const nodes = rng.nodes(dom.isText, {
      fullyContains: true,
    }).map((text) => {
      return dom.singleChildAncestor(text, pred) || dom.wrap(text, nodeName);
    });

    if (expandClosestSibling) {
      if (onlyPartialContains) {
        const nodesInRange = rng.nodes();
        // compose with partial contains predication
        pred = func.and(pred, (node) => {
          return lists.contains(nodesInRange, node);
        });
      }

      return nodes.map((node) => {
        const siblings = dom.withClosestSiblings(node, pred);
        const head = lists.head(siblings);
        const tails = lists.tail(siblings);
        $.each(tails, (idx, elem) => {
          dom.appendChildNodes(head, elem.childNodes);
          dom.remove(elem);
        });
        return lists.head(siblings);
      });
    } else {
      return nodes;
    }
  }

  /**
   * get current style on cursor
   *
   * @param {WrappedRange} rng
   * @return {Object} - object contains style properties.
   */
  current(rng) {
    const $cont = $(!dom.isElement(rng.sc) ? rng.sc.parentNode : rng.sc);
    let styleInfo = this.fromNode($cont);

    // document.queryCommandState for toggle state
    // [workaround] prevent Firefox nsresult: "0x80004005 (NS_ERROR_FAILURE)"
    try {
      styleInfo = $.extend(styleInfo, {
        'font-bold': document.queryCommandState('bold') ? 'bold' : 'normal',
        'font-italic': document.queryCommandState('italic') ? 'italic' : 'normal',
        'font-underline': document.queryCommandState('underline') ? 'underline' : 'normal',
        'font-subscript': document.queryCommandState('subscript') ? 'subscript' : 'normal',
        'font-superscript': document.queryCommandState('superscript') ? 'superscript' : 'normal',
        'font-strikethrough': document.queryCommandState('strikethrough') ? 'strikethrough' : 'normal',
        //'font-family': document.queryCommandValue('fontname') || styleInfo['font-family'],
      });
    } catch (e) {
      // eslint-disable-next-line
    }

    const node = rng.commonAncestor();
    const ancestors = dom.listAncestor(node, dom.isBlock);
    styleInfo = $.extend(styleInfo, {
      'font-bold': this.queryStyleCommand('bold', ancestors) ? 'bold' : 'normal',
      'font-italic': this.queryStyleCommand('italic', ancestors) ? 'italic' : 'normal',
      'font-underline': this.queryStyleCommand('underline', ancestors) ? 'underline' : 'normal',
      'font-strikethrough': this.queryStyleCommand('strikethrough', ancestors) ? 'strikethrough' : 'normal',
      'font-subscript': this.queryStyleCommand('subscript', ancestors) ? 'subscript' : 'normal',
      'font-superscript': this.queryStyleCommand('superscript', ancestors) ? 'superscript' : 'normal',
      'font-code': this.queryStyleCommand('code', ancestors) ? 'code' : 'normal',
      'font-family': this.queryStyleCommand('fontname', ancestors)?.styleMatch
    });

    // list-style-type to list-style(unordered, ordered)
    if (!rng.isOnList()) {
      styleInfo['list-style'] = 'none';
    } else {
      const orderedTypes = ['circle', 'disc', 'disc-leading-zero', 'square'];
      const isUnordered = orderedTypes.indexOf(styleInfo['list-style-type']) > -1;
      styleInfo['list-style'] = isUnordered ? 'unordered' : 'ordered';
    }

    const para = dom.ancestor(rng.sc, dom.isPara);
    if (para && para.style['line-height']) {
      styleInfo['line-height'] = para.style.lineHeight;
    } else {
      const lineHeight = parseInt(styleInfo['line-height'], 10) / parseInt(styleInfo['font-size'], 10);
      styleInfo['line-height'] = lineHeight.toFixed(1);
    }

    styleInfo.anchor = rng.isOnAnchor() && dom.ancestor(rng.sc, dom.isAnchor);
    styleInfo.ancestors = dom.listAncestor(rng.sc, dom.isEditable);
    styleInfo.range = rng;

    return styleInfo;
  }

  /**
   * Queries a style command by name.
   * @param {String} commandName
   * @param {null|Array} ancestors - Array of ancestor nodes to walk up. If null, ancestors are resolved from the current selection range.
   * @return {null|boolean|Object}
   */
  queryStyleCommand(commandName, ancestors = null) {
    // TODO: Add "Default" to FontName and FontSize tools (to remove font-family)
    const command = this.options.commands[commandName];
    if (!command) {
      console.error(`The command ${commandName} does not exist. Add a command object to the options.commands list.`);
      return null;
    }

    if (!ancestors) {
      let rng = range.create();
      if (rng) {
        rng = rng.normalize();
        const node = !dom.isElement(rng.sc) ? rng.sc.parentNode : rng.sc;
        ancestors = dom.listAncestor(node, dom.isBlock);
      }
      else {
        return null;
      }
    }

    let match;

    for (var i = 0; i < ancestors.length; i++) {
      match = this.matchesCommand(ancestors[i], command);
      if (match) {
        break;
      }
    }

    return match;
  }

  matchesCommand(node, command) {
    // TODO: handle variants
    if (!command || !node || node.nodeType != 1) {
      // Allow only element nodes
      return false;
    }

    const result = {};

    // Check tag name(s)
    if (command.tag && dom.isTag(node, command.tag)) {
      result.tagMatch = node.tagName;
    }

    // Check inline style
    // TODO: handle command.tagOrStyle
    // TODO: Implement styleInvert
    if (command.style /*&& (command.tagOrStyle || !tagMatch)*/) {
      const value = node.style.getPropertyValue(command.style);
      if (value) {
        if (command.styleMatch) {
          if (func.matches(command.styleMatch, value)) {
            result.styleMatch = value;
          }
        }
        else {
          // No styleMatch means: match any value (e.g. for font-family)
          result.styleMatch = value;
        }
      }
    }

    // Check class name(s)
    // TODO: handle command.tagOrStyle
    // TODO: Implement classInvert
    // TODO: handle inclusive/exclusive classes
    if (command.classMatch) {
      const classList = node.classList;

      if (classList.length) {
        if (command.masterClass && !classList.contains(command.masterClass)) {
          // Match classes only if the master class (if provided) is present in node (e.g.: .alert for .alert-[variant})
          const isPattern = command.classMatch instanceof RegExp || (command.variants?.length && command.classMatch.indexOf('*') > -1);
          const classMatches = [];
  
          // Enumerate all current node classes
          for (const value of node.classList.values()) {
            if (func.matches(command.classMatch, value)) {
              // Add matched class to the result list
              classMatches.push(value);
    
              // Exit on first hit if classMatch is string and does not contain * and we have no variants
              if (!isPattern) {
                break;
              }
            }
          }
    
          if (classMatches.length) {
            result.classMatch = classMatches;
          }
        }
      }

    }
    
    if ($.isEmptyObject(result)) {
      // No match, return false for proper checks
      return false;
    }

    result.node = node;
    result.command = command;
    return result;
  }
}
