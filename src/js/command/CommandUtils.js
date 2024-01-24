import dom from '../core/dom';

const isInlineCommand = (command) => {
  // TODO: Implement isInlineCommand
  return true;
};

const isBlockCommand = (command) => {
  // TODO: Implement isBlockCommand
  return false;
};

const isWrappingBlockCommand = (command) => {
  return isBlockCommand(command) && command.wrapper === true;
};

const isNonWrappingBlockCommand = (command) => {
  return isBlockCommand(command) && command.wrapper !== true;
};

const isMixedCommand = (command) => {
  // TODO: Implement isMixedCommand
  return true;
};

const isEmptyTextNode = (node) => {
  return node && dom.isText(node) && node.length === 0;
};

const isValid = (parent, child) => {
  // TODO: Implement CommandUtils.isValid
  return true;
};

export default {
  isInlineCommand,
  isBlockCommand,
  isMixedCommand,
  isWrappingBlockCommand,
  isNonWrappingBlockCommand,
  isEmptyTextNode,
  isValid
}