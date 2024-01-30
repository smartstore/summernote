import $ from 'jquery';
import func from '../core/func';
import lists from '../core/lists';
import range from '../core/range';
import dom from '../core/dom';
import MatchCommand from './MatchCommand';
import CommandUtils from './CommandUtils';

const canFormatBR = (command, node, parentName) => {
  // TODO: implement canFormatBR
  return false;
};

const applyStyles = (elm, command, variant = null) => {
  // TODO: implement applyStyles
};

const applyCommandToElement = (elm, command) => {
  // TODO: implement applyCommandToElement (setElementFormat)
};

const createWrapElement = (wrapName = null) => {
  if (wrapName) {
    const wrapElm = dom.create(wrapName);
    applyCommandToElement(wrapElm);
    return wrapElm;
  } else {
    return null;
  }
};

const applyRangeStyle = (command, rng, nodeSpecific) => {
  const newWrappers = [];
  let contentEditable = true;
  
  // Setup wrapper element
  const wrapName = 'strong'; // TODO: get preferred tag name
  const wrapElm = createWrapElement(wrapName);

  const isMatchingWrappingBlock = (node) =>
    CommandUtils.isWrappingBlockCommand(command) && MatchCommand.matchNode(command, node);

  const canRenameBlock = (node, parentName, isEditableDescendant) => {
      const isValidBlockCommandForNode =
        CommandUtils.isNonWrappingBlockCommand(command) &&Zwsp
        false /*CommandUtils.isTextBlock(ed.schema, node)*/ &&
        CommandUtils.isValid(parentName, wrapName);
      return isEditableDescendant && isValidBlockCommandForNode;
  };

  const canWrapNode = (node, parentName, isEditableDescendant, isWrappableNoneditableElm) => {
    return true;
    const nodeName = node.nodeName.toLowerCase();
    const isValidWrapNode =
      CommandUtils.isValid(wrapName, nodeName) &&
      CommandUtils.isValid(parentName, wrapName);
    // If it is not node specific, it means that it was not passed into 'CommandController.apply` and is within the editor selection
    const isZwsp = !nodeSpecific && dom.isText(node) && false /*Zwsp.isZwsp(node.data)*/; // TODO: Implement Zwsp.isZwsp
    const isCaret = false; /* isCaretNode(node) */;
    const isCorrectFormatForNode = !CommandUtils.isInlineCommand(command) || !dom.isBlock(node);
    return (isEditableDescendant || isWrappableNoneditableElm) && isValidWrapNode && !isZwsp && !isCaret && isCorrectFormatForNode;
  };

  rng.walk((nodes) => {
    let currentWrapElm;

    const process = (node) => {
      let hasContentEditableState = false;
      let lastContentEditable = contentEditable;
      let isWrappableNoneditableElm = false;
      const parentNode = node.parentNode;
      const parentName = parentNode.nodeName.toLowerCase();

      // Node has a contentEditable value
      // TODO: implement dom.getContentEditable(node)
      const contentEditableValue = 'true'; // dom.getContentEditable(node);
      if (contentEditableValue) {
        lastContentEditable = contentEditable;
        contentEditable = contentEditableValue === 'true';
        // Unless the noneditable element is wrappable, we don't want to wrap the container, only it's editable children
        hasContentEditableState = true;
        // TODO: implement isWrappableNoneditable
        isWrappableNoneditableElm = false; // FormatUtils.isWrappableNoneditable(ed, node);
      }
      const isEditableDescendant = contentEditable && !hasContentEditableState;

      // Stop wrapping on br elements except when valid
      if (dom.isBR(node) && !canFormatBR(command, node, parentName)) {
        currentWrapElm = null;
        // Remove any br elements when we wrap things
        if (CommandUtils.isBlockCommand(command)) {
          dom.remove(node, true);
        }
        return;
      }

      if (isMatchingWrappingBlock(node)) {
        currentWrapElm = null;
        return;
      }

      if (canRenameBlock(node, parentName, isEditableDescendant)) {
        const elm = dom.rename(node, wrapName);
        applyCommandToElement(elm);
        newWrappers.push(elm);
        currentWrapElm = null;
        return;
      }

      // TODO: Implement CommandUtils.isSelectorFormat()
      // ...

      if (wrapElm && canWrapNode(node, parentName, isEditableDescendant, isWrappableNoneditableElm)) {
        // Start wrapping
        if (!currentWrapElm) {
          // Wrap the node
          currentWrapElm = wrapElm.cloneNode(false);
          parentNode.insertBefore(currentWrapElm, node);
          newWrappers.push(currentWrapElm);
        }

        // Wrappable noneditable element has been handled so go back to previous state
        if (isWrappableNoneditableElm && hasContentEditableState) {
          contentEditable = lastContentEditable;
        }

        currentWrapElm.appendChild(node);
      }
      else {
        // Start a new wrapper for possible children
        currentWrapElm = null;

        lists.from(node.childNodes).forEach(process);

        if (hasContentEditableState) {
          contentEditable = lastContentEditable; // Restore last contentEditable state from stack
        }

        // End the last wrapper
        currentWrapElm = null;
      }
    }

    nodes.forEach(process);
  });

  // Apply formats to links as well to get the color of the underline to change as well
  if (command.links) {
    // TODO: Implement command.links
  }

  // Cleanup
  newWrappers.forEach((node) => {
    const getChildCount = (node) => {
      let count = 0;

      lists.from(node.childNodes).forEach((node) => {
        if (!CommandUtils.isEmptyTextNode(node) && !dom.isBookmarkNode(node)) {
          count++;
        }
      });

      return count;
    };   

    const mergeStyles = (node) => {
      // Check if a child was found and of the same type as the current node
      // TODO: Implement mergeStyles
      // ...
    };

    const childCount = getChildCount(node);

    // Remove empty nodes but only if there is multiple wrappers and they are not block
    // elements so never remove single <h1></h1> since that would remove the
    // current empty block element where the caret is at
    if ((newWrappers.length > 1 || !dom.isBlock(node)) && childCount === 0) {
      dom.remove(node, false);
      return;
    }

    if (CommandUtils.isInlineCommand(command) || CommandUtils.isBlockCommand(command) && command.tag) {
      // Merges the current node with it's children of similar type to reduce the number of elements
      if (!command.exact && childCount === 1) {
        node = mergeStyles(node);
      }

      // TODO: Implement MergeCommands
      // MergeFormats.mergeWithChildren(ed, formatList, vars, node);
      // MergeFormats.mergeWithParents(ed, format, name, vars, node);
      // MergeFormats.mergeBackgroundColorAndFontSize(dom, format, vars, node);
      // MergeFormats.mergeTextDecorationsAndColor(dom, format, vars, node);
      // MergeFormats.mergeSubSup(dom, format, vars, node);
      // MergeFormats.mergeSiblings(ed, format, vars, node);
    }
  });
};

const apply = (command, rng, variant = null) => {
  const isCollapsed = rng.isCollapsed();

  if (isCollapsed) {
    // Applying a command to a collapsed selection will do nothing. Find the word around the cursor.
    rng = rng.getWordRange(true);
  }

  rng = rng.splitText();

  // // Make predicate for matchesCommand function
  // let pred = (node) => MatchCommand.matchNode(command, node);
  applyRangeStyle(command, rng, true);
};

export default {
  apply
}