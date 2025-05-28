import Type from '../core/Type';
import dom from '../core/dom';

/**
 * Removes nodes matching configurable rules from a DOM element.
 * @param {HTMLElement} rootElement - Root element to clean.
 * @param {Array<string|RegExp|Function>} rules - Rules for removal:
 *   - String: Exact tag name (case-insensitive, e.g., 'o:p').
 *   - RegExp: Tests against tagName (e.g., /^[ov]:/).
 *   - Function: Takes a node, returns boolean (e.g., (node) => node.tagName === 'SCRIPT').
 * @returns {Array<HTMLElement>} - Removed nodes.
 */
const removeNodesByRules = (rootNode, rules = [], onAcceptNode = null) => {
  const nodesToRemove = [];

  const shouldRemoveNode = (node) => {
    return rules.some(rule => {
      if (Type.isArray(rule)) {
        // Array of tags (e.g., ['script', 'style', ...])
        return dom.isTag(node, rule);
      }
      else if (Type.isRegExp(rule)) {
        // Regex test against tagName (e.g., /^[ov]:/)
        return rule.test(node.tagName);
      } 
      else {
        // Custom selector (string or function)
        return dom.matches(node, rule);
      }
    });
  }

  // Collect all nodes to remove (sorted deepest first)
  const walker = document.createTreeWalker(
    rootNode,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT,
    // Custom filter: Skip descendants of nodes marked for removal
    { acceptNode(_) { return NodeFilter.FILTER_ACCEPT; }},
    false
  );

  /**
   * Moves walker to the next node after the subtree.
   * @param {Node} node - Node whose subtree to skip.
   * @param {TreeWalker} walker - TreeWalker instance.
   * @returns {Node} - New currentNode for the walker.
   */
  const skipSubtree = (node) => {
    while (node && !node.nextSibling) {
        if (node === walker.root) {
            // We've reached the root - stop traversal completely
            return null;
        }
        node = node.parentNode;
    }
    return node?.nextSibling ?? null;
  }

  /**
   * Jumps to the last child (if exists) or skips the subtree.
   * @param {Node} node - Node to start from.
   * @param {TreeWalker} walker - TreeWalker instance.
   * @returns {Node} - New currentNode for the walker.
   */
  const lastChildOrSkip = (node) => {
    return node.lastChild ?? skipSubtree(node) ?? node;
  }

  const markForRemoval = (node) => {
      nodesToRemove.push(node);
      if (dom.isElement(node)) {
        // Skip all descendants of this node
        walker.currentNode = lastChildOrSkip(node, walker);
      }
  }

  let currentNode;
  while ((currentNode = walker.nextNode())) {
    if (rules.length && shouldRemoveNode(currentNode)) {
      markForRemoval(currentNode);
    }
    else if (Type.isFunction(onAcceptNode)) {
      // Call custom accept node function
      if (!onAcceptNode.call(currentNode, currentNode)) {
        // If the node is not accepted for any other reason, remove it (e.g., untrusted src)
        markForRemoval(currentNode);
      }
    }
  }

  // Remove nodes (including all children)
  nodesToRemove.forEach(node => {
    node.parentNode?.removeChild(node);
  });

  return nodesToRemove;
}

const hasTrustedSrc = (node, trustedHosts) => {
  const attrs = Array.from(node.attributes).filter(attr => attr.name.toLowerCase() === 'src');
  if (attrs.length > 1) {
    // Don't trust if src attribute is duplicated
    return false;
  }

  const src = attrs[0]?.value || '';
  if (src) {
    // Pass if src is trusted
    for (const host of trustedHosts) {
      const pattern = new RegExp(
        '^(https?:)?\/\/' +
        host.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'),
        'i'
      );

      if (pattern.test(src)) {
        return true;
      }
    }

    return false;
  }

  return true;
}

const removeAttributesByRules = (element, attrOptions) => {
  const purifyAttrs = attrOptions.purifyAttrs;
  const removeFormatting = attrOptions.removeFormatting;
  const forbidAttrs = attrOptions.forbidAttrs;
  const formatAttrs = attrOptions.formatAttrs;
  const allowEmptyAttrs = attrOptions.allowEmptyAttrs;

  const attributes = element.attributes;
  const attrsToRemove = [];

  for (let a = attributes.length - 1; a >= 0; a--) {
    let attr = attributes[a];
    let forbidden = false;

    // Check whether the attribute is a format attribute
    if (removeFormatting && formatAttrs.has(attr.name)) {
        attrsToRemove.push(attr);
        continue;
    }

    if (purifyAttrs) {
      for (let forbidAttr of forbidAttrs) {
        if (Type.isRegExp(forbidAttr)) {
          forbidden = forbidAttr.test(attr.name);
        }
        else if (Type.isFunction(forbidAttr)) {
          forbidden = forbidAttr.call(attr, attr);
        }
        else if (Type.isString(forbidAttr)) {
          forbidden = attr.name === forbidAttr;
        }

        if (forbidden) {
          attrsToRemove.push(attr);
          break;
        }
      }
    }

    if (!forbidden) {
      // Check whether the attribute is empty
      if (purifyAttrs && !attr.value && !allowEmptyAttrs.has(attr.name)) {
        attrsToRemove.push(attr);
        continue;
      }
    }
  }

  attrsToRemove.forEach(a => element.removeAttributeNode(a));
  return attrsToRemove;
}

const purifyInternal = (rootNode, options, flags) => {
  if (!Type.isArray(flags)) flags = [];
  const purifyNodes = flags.includes('node');
  const purifyAttrs = flags.includes('attr');
  const purifySrc = flags.includes('src');
  const removeFormatting = flags.includes('format');

  const forbidAttrs = options.forbidAttrs || [];
  const formatAttrs = new Map((options.formatAttrs || []).map(x => [x, false]));
  const allowEmptyAttrs = new Map((options.allowEmptyAttrs || []).map(x => [x, false]));
  const unwrapTags = options.unwrapTags || [];

  const attrOptions = { 
    purifyAttrs,
    removeFormatting,
    forbidAttrs,
    formatAttrs,
    allowEmptyAttrs
  };
  
  const trustedHosts = purifySrc ? (options.trustHosts || []).concat(options.trustHostsBase || []) : [];
  const nodeRules = purifyNodes ? options.forbidNodes || [] : [];
  const nodesToUnwrap = [];

  // Remove forbidden nodes
  removeNodesByRules(rootNode, nodeRules, (acceptedNode) => {
    if (trustedHosts.length && dom.isTag(acceptedNode, 'iframe')) {
      if (!hasTrustedSrc(acceptedNode, trustedHosts)) {
        // Remove untrusted iframe
        return false;
      }
    }

    if ((purifyAttrs || removeFormatting) && dom.isElement(acceptedNode)) {
      const removedAttrs = removeAttributesByRules(acceptedNode, attrOptions);
      if (removedAttrs.length && acceptedNode.attributes.length === 0 && dom.isTag(acceptedNode, unwrapTags)) {
        // // If all attributes are removed (and ONLY then), unwrap the node
        // console.debug('Unwrapping node:', acceptedNode);
        // nodesToUnwrap.push(acceptedNode);
      }
    }

    return true;
  });

  if (nodesToUnwrap.length) {
    // Unwrap nodes that have no attributes left
    nodesToUnwrap.forEach(node => {
      dom.unwrap(node);
    });
  }

  return rootNode;
}

const purify = (context, htmlOrNode, flags) => {
  if (Type.isString(flags)) {
    // Never pass original array
    flags = [... context.options.purifyHtml?.flags[flags] || []];
  }
  else if (!Type.isArray(flags)) {
    flags = [];
  }

  const fn = context.options.callbacks.onPurifyHtml;
  if (Type.isFunction(fn)) {
    return fn.call(context, htmlOrNode, flags);
  } 
  else {
    const tempRoot = Type.isElement(htmlOrNode) ? htmlOrNode : dom.create('div', null, htmlOrNode);
    const options = context.options.purifyHtml || {};
    return purifyInternal(tempRoot, options, flags);
  }
};



const prettifyInternal = (html) => {
  const regexTag = /<(\/?)(\b(?!!)[^>\s]*)(.*?)(\s*\/?>)/g;
  html = html.replace(regexTag, function(match, endSlash, name) {
    name = name.toUpperCase();
    const isEndOfInlineContainer = /^DIV|^TD|^TH|^P|^LI|^H[1-7]/.test(name) && !!endSlash;
    const isBlockNode = /^BLOCKQUOTE|^TABLE|^TBODY|^TR|^HR|^UL|^OL/.test(name);

    return match + ((isEndOfInlineContainer || isBlockNode) ? '\n' : '');
  });
  return html.trim();
};

const prettify = (context, html) => {
  const fn = context.options.callbacks.onPrettifyHtml;
  if (Type.isFunction(fn)) {
    return fn.call(context, html);
  } 
  else {
    return prettifyInternal(html);
  }
};

export default {
  prettify,
  purify
}
