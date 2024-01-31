
const mergeTextDecorationsAndColor = (format, vars, node) => {
  // ...
};

const mergeBackgroundColorAndFontSize = (format, vars, node) => {
  // ...
};

const mergeSubSup = (format, vars, node) => {
  // ...
};

const mergeWithChildren = (editor, formatList, vars, node) => {
  // ...
};

const mergeWithParents = (editor, format, name, vars, node) => {
  // ...
};

const mergeSiblings = (editor, format, vars, node) => {
  // ...
};

export default {
  mergeWithChildren,
  mergeTextDecorationsAndColor,
  mergeBackgroundColorAndFontSize,
  mergeSubSup,
  mergeSiblings,
  mergeWithParents
};