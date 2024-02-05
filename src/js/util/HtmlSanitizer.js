import Type from '../core/Type';

const sanitizeHtmlSimple = (html) => {
  const regexTag = /<(\/?)(\b(?!!)[^>\s]*)(.*?)(\s*\/?>)/g;
  html = html.replace(regexTag, function(match, endSlash, name) {
    name = name.toUpperCase();
    const isEndOfInlineContainer = /^DIV|^TD|^TH|^P|^LI|^H[1-7]/.test(name) &&
                                 !!endSlash;
    const isBlockNode = /^BLOCKQUOTE|^TABLE|^TBODY|^TR|^HR|^UL|^OL/.test(name);

    return match + ((isEndOfInlineContainer || isBlockNode) ? '\n' : '');
  });
  return html.trim();
};

const sanitizeHtml = (context, html) => {
  const fn = context.options.callbacks.onSanitizeHtml;
  if (Type.isFunction(fn)) {
    html = fn.call(context, html, { sanitize: true, prettify: true });
    return html;
  } else {
    return sanitizeHtmlSimple(html);
  }
};

export default {
  sanitizeHtml
}
