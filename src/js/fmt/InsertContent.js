import Type from '../core/Type';
import range from '../core/range';

const ensureLocalRange = (editor, rng) => {
  if (Type.isRange(rng)) {
    if (!rng.equals(editor.selection.getRange())) {
      editor.selection.setRange(rng);
    }
  }
}

const insertHtml = (element, editor, rng = null) => {
  ensureLocalRange(editor, rng);
  const tags = [...editor.options.serializableElements, ...editor.options.atomicElements];
  if (tags.length && element?.querySelector(tags.join(','))) {
    // execCommand can insert unupgraded custom elements. Import a fragment into
    // the active document instead so native custom-element lifecycle runs.
    const document = editor.editable.ownerDocument;
    const template = document.createElement('template');
    template.innerHTML = element.innerHTML;
    const fragment = document.importNode(template.content, true);
    const last = fragment.lastChild;
    const selectedRange = range.getNativeRange(editor.selection.getRange());
    selectedRange.deleteContents();
    selectedRange.insertNode(fragment);
    if (last) selectedRange.setStartAfter(last);
    selectedRange.collapse(true);
    return range.createFromNativeRange(selectedRange);
  }
  return document.execCommand('insertHTML', false, element?.innerHTML);
}

const insertText = (text, editor, rng = null) => {
  ensureLocalRange(editor, rng);
  return document.execCommand('insertText', false, text);
}

export default {
  insertHtml,
  insertText
}