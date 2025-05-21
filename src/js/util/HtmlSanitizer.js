import Type from '../core/Type';
import dom from '../core/dom';

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

const purifyInternal = (rootNode, options, flags) => {
  if (!Type.isArray(flags)) flags = [];
  const purifyTags = flags.includes('tag');
  const purifyAttrs = flags.includes('attr');
  const purifyIFrame = flags.includes('iframe');
  const removeFormatting = flags.includes('format');

  if (purifyTags) {
    // Remove forbidden tags
    let forbidTags = options.forbidTags || [];
    forbidTags.forEach(tag => {
      let elements = rootNode.getElementsByTagName(tag);
      for (let i = elements.length - 1; i >= 0; i--) {
        elements[i].parentNode.removeChild(elements[i]);
      }
    });
  }

  if (purifyIFrame) {
      const whitelist = (options.trustIFrameHosts || []).concat(options.trustIFrameHostsBase || []);
      const iframes = rootNode.getElementsByTagName('iframe');
      for (let i = iframes.length - 1; i >= 0; i--) {
        const iframe = iframes[i];

        const attrs = Array.from(iframe.attributes).filter(attr => attr.name.toLowerCase() === 'src');
        if (attrs.length > 1) {
          // Remove if src attribute is duplicated
          iframe.parentNode.removeChild(iframe);
          continue;
        }

        const src = attrs[0]?.value || '';
        if (src) {
          // Pass if src is trusted
          let trusted = false;
          for (const host of whitelist) {
            const pattern = new RegExp(
              '^(https?:)?\/\/' +
              host.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'),
              'i'
            );

            if (pattern.test(src)) {
              trusted = true;
              break;
            }
          }
          if (!trusted) {
            iframe.parentNode.removeChild(iframe);
          }
        }
      }
  }

  if (purifyAttrs || removeFormatting) {
    const forbidAttrs = options.forbidAttrs || [];
    const formatAttrs = new Map((options.formatAttrs || []).map(x => [x, false]));
    const allowEmptyAttrs = new Map((options.allowEmptyAttrs || []).map(x => [x, false]));
    const allElements = rootNode.getElementsByTagName('*');

    for (let i = 0; i < allElements.length; i++) {
      let element = allElements[i];

      let attributes = element.attributes;
      for (let a = attributes.length - 1; a >= 0; a--) {
        let attr = attributes[a];
        let forbidden = false;

        if (purifyAttrs) {
          for (let forbidAttr of forbidAttrs) {
            forbidden = Type.isRegExp(forbidAttr) ? forbidAttr.test(attr.name) : attr.name === forbidAttr;
            if (forbidden) {
              element.removeAttribute(attr.name);
              break;
            }
          }
        }

        if (!forbidden) {
          // Check whether the attribute is a format attribute
          if (removeFormatting) {
            if (formatAttrs.has(attr.name)) {
              element.removeAttribute(attr.name);
              continue;
            }
          }

          // Check whether the attribute is empty
          if (purifyAttrs && !attr.value && !allowEmptyAttrs.has(attr.name)) {
            element.removeAttribute(attr.name);
            continue;
          }
        }
      }
    }
  }

  return rootNode;
}

const prettify = (context, html) => {
  const fn = context.options.callbacks.onPrettifyHtml;
  if (Type.isFunction(fn)) {
    return fn.call(context, html);
  } 
  else {
    return prettifyInternal(html);
  }
};

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

export default {
  prettify,
  purify
}
