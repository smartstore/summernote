import $ from 'jquery';
import Str from '../core/Str';
import Obj from '../core/Obj';
import Type from '../core/Type';
import func from '../core/func';
import lists from '../core/lists';
import schema from '../core/schema';
import range from '../core/range';
import dom from '../core/dom';
import MatchFormat from './MatchFormat';
import FormatUtils from './FormatUtils';

const each = Tools.each;

const canFormatBR = (command, node, parentName) => {
  // TODO: implement canFormatBR
  return false;
};

const applyStyles = (elm, format, vars) => {
  each(format.styles, (value, name) => {
    dom.setStyle(elm, name, FormatUtils.replaceVars(value, vars));
  });

  // // Needed for the WebKit span spam bug
  // // TODO: Remove this once WebKit/Blink fixes this
  // if (format.styles) {
  //   const styleVal = dom.getAttr(elm, 'style');

  //   if (styleVal) {
  //     dom.setAttrib(elm, 'data-note-style', styleVal);
  //   }
  // }
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
    FormatUtils.isWrappingBlockCommand(command) && MatchFormat.matchNode(command, node);

  const canRenameBlock = (node, parentName, isEditableDescendant) => {
      const isValidBlockCommandForNode =
        FormatUtils.isNonWrappingBlockCommand(command) &&Zwsp
        false /*FormatUtils.isTextBlock(ed.schema, node)*/ &&
        FormatUtils.isValid(parentName, wrapName);
      return isEditableDescendant && isValidBlockCommandForNode;
  };

  const canWrapNode = (node, parentName, isEditableDescendant, isWrappableNoneditableElm) => {
    return true;
    const nodeName = node.nodeName.toLowerCase();
    const isValidWrapNode =
      FormatUtils.isValid(wrapName, nodeName) &&
      FormatUtils.isValid(parentName, wrapName);
    // If it is not node specific, it means that it was not passed into 'CommandController.apply` and is within the editor selection
    const isZwsp = !nodeSpecific && dom.isText(node) && false /*Zwsp.isZwsp(node.data)*/; // TODO: Implement Zwsp.isZwsp
    const isCaret = false; /* isCaretNode(node) */;
    const isCorrectFormatForNode = !FormatUtils.isInlineCommand(command) || !dom.isBlock(node);
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
        if (FormatUtils.isBlockCommand(command)) {
          dom.remove(node, true);
        }
        return;
      }

      if (isMatchingWrappingBlock(node)) {
        currentWrapElm = null;
        return;
      }

      if (canRenameBlock(node, parentName, isEditableDescendant)) {
        const elm = dom.replace(node, wrapName);
        applyCommandToElement(elm);
        newWrappers.push(elm);
        currentWrapElm = null;
        return;
      }

      // TODO: Implement FormatUtils.isSelectorFormat()
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
        if (!FormatUtils.isEmptyTextNode(node) && !dom.isBookmarkNode(node)) {
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

    if (FormatUtils.isInlineCommand(command) || FormatUtils.isBlockCommand(command) && command.tag) {
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

const applyFormat = (command, rng, variant = null) => {
  const isCollapsed = rng.isCollapsed();

  if (isCollapsed) {
    // Applying a command to a collapsed selection will do nothing. Find the word around the cursor.
    rng = rng.getWordRange(true);
  }

  rng = rng.splitText();

  // // Make predicate for matchesCommand function
  // let pred = (node) => MatchFormat.matchNode(command, node);
  applyRangeStyle(command, rng, true);
};

export default {
  applyFormat
}