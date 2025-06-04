import Type from '../core/Type';

const ensureLocalRange = (editor, rng) => {
  if (Type.isRange(rng)) {
    if (!rng.equals(editor.selection.getRange())) {
      editor.selection.setRange(rng);
    }
  }
}

const insertHtml = (element, editor, rng = null) => {
  ensureLocalRange(editor, rng);
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