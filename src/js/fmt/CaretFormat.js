
const setup = (editor) => {
  // ...
};

const applyCaretFormat = (editor, name, vars) => {
  // ...
};

const removeCaretFormat = (editor, name, vars, similar) => {
  // ...
};

const replaceWithCaretFormat = (targetNode, formatNodes) => {
  // ...
};

const createCaretFormatAtStart = (rng, formatNodes) => {
  // ...
};

const isFormatElement = (editor, element) => {
  // ...
};

const isFormatCaret = (editor, element) => {
  // ...
};

export default {
  setup,
  applyCaretFormat,
  removeCaretFormat,
  replaceWithCaretFormat,
  createCaretFormatAtStart,
  isFormatElement,
  isFormatCaret
};