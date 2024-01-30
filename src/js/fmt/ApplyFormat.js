import $ from 'jquery';
import Str from '../core/Str';
import Obj from '../core/Obj';
import Type from '../core/Type';
import func from '../core/func';
import lists from '../core/lists';
import schema from '../core/schema';
import range from '../core/range';
import dom from '../core/dom';
import * as MatchFormat from './MatchFormat';
import FormatUtils from './FormatUtils';

const each = lists.each;

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

const applyFormatAction = (editor, name, vars = null, node = null) => {
  const formatList = editor.formatter.get(name);
  const format = formatList[0];
  const rng = editor.getLastRange();
  const isCollapsed = !node && ed.selection.isCollapsed();

  const setElementFormat = (elm, fmt) => {
    if (Type.isFunction(fmt.onformat)) {
      fmt.onformat(elm, fmt, vars, node);
    }

    applyStyles(elm, fmt, vars);

    each(fmt.attributes, (value, name) => {
      dom.setAttr(elm, name, FormatUtils.replaceVars(value, vars));
    });

    each(fmt.classes, (value) => {
      const newValue = FormatUtils.replaceVars(value, vars);

      if (!dom.hasClass(elm, newValue)) {
        dom.addClass(elm, newValue);
      }
    });
  };

  const applyNodeStyle = (formatList, node) => {
    let found = false;

    // Look for matching formats
    each(formatList, (format) => {
      if (!FormatUtils.isSelectorFormat(format)) {
        return false;
      }

      //// TODO: Implement dom.getContentEditable() ?
      // // Check if the node is noneditable and if the format can override noneditable node
      // if (dom.getContentEditable(node) === 'false' && !format.ceFalseOverride) {
      //   return true;
      // }

      // Check collapsed state if it exists
      if (Type.isAssigned(format.collapsed) && format.collapsed !== isCollapsed) {
        return true;
      }

      if (dom.matches(node, format.selector) && !isCaretNode(node)) {
        setElementFormat(node, format);
        found = true;
        return false;
      }

      return true;
    });

    return found;
  };

  const createWrapElement = (wrapName) => {
    if (Type.isString(wrapName)) {
      const wrapElm = dom.create(wrapName);
      setElementFormat(wrapElm);
      return wrapElm;
    } else {
      return null;
    }
  };

  const applyRangeStyle = (rng, nodeSpecific) => {
    const newWrappers = [];
    let contentEditable = true;
    
    // Setup wrapper element
    const wrapName = format.inline || format.block;
    const wrapElm = createWrapElement(wrapName);
  
    const isMatchingWrappingBlock = (node) =>
      FormatUtils.isWrappingBlockFormat(format) && MatchFormat.matchNode(editor, node, name, vars);
  
    const canRenameBlock = (node, parentName, isEditableDescendant) => {
        const isValidBlockCommandForNode =
          FormatUtils.isNonWrappingBlockFormat(format) &&
          FormatUtils.isTextBlock(node) &&
          FormatUtils.isValid(parentName, wrapName);
        return isEditableDescendant && isValidBlockCommandForNode;
    };
  
    const canWrapNode = (node, parentName, isEditableDescendant, isWrappableNoneditableElm) => {
      const nodeName = node.nodeName.toLowerCase();
      const isValidWrapNode =
        FormatUtils.isValid(wrapName, nodeName) &&
        FormatUtils.isValid(parentName, wrapName);
      // If it is not node specific, it means that it was not passed into 'CommandController.apply` and is within the editor selection
      const isZwsp = !nodeSpecific && dom.isText(node) && Point.isZwsp(node.data);
      const isCaret = isCaretNode(node);
      const isCorrectFormatForNode = !FormatUtils.isInlineFormat(format) || !dom.isBlock(node);
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
        const contentEditableValue = dom.getContentEditable(node);
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
        if (dom.isBR(node) && !canFormatBR(format, node, parentName)) {
          currentWrapElm = null;
          // Remove any br elements when we wrap things
          if (FormatUtils.isBlockFormat(format)) {
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
          setElementFormat(elm);
          newWrappers.push(elm);
          currentWrapElm = null;
          return;
        }
  
        if (FormatUtils.isSelectorFormat(format)) {
          let found = applyNodeStyle(formatList, node);

          // Include the parent if using an expanded selector format and no match was found for the current node
          if (!found && Type.isAssigned(parentNode) && FormatUtils.shouldExpandToSelector(format)) {
            found = applyNodeStyle(formatList, parentNode);
          }

          // Continue processing if a selector match wasn't found and a inline element is defined
          if (!FormatUtils.isInlineFormat(format) || found) {
            currentWrapElm = null;
            return;
          }
        }
  
        if (Type.isAssigned(wrapElm) && canWrapNode(node, parentName, isEditableDescendant, isWrappableNoneditableElm)) {
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
  
          each(lists.from(node.childNodes), process);
  
          if (hasContentEditableState) {
            contentEditable = lastContentEditable; // Restore last contentEditable state from stack
          }
  
          // End the last wrapper
          currentWrapElm = null;
        }
      }
  
      each(nodes, process);
    });
  
    // Apply formats to links as well to get the color of the underline to change as well
    if (format.links === true) {
      Arr.each(newWrappers, (node) => {
        const process = (node) => {
          if (node.nodeName === 'A') {
            setElementFormat(node, format);
          }

          each(lists.from(node.childNodes), process);
        };

        process(node);
      });
    }
  
    // Cleanup
    newWrappers.forEach((node) => {
      const getChildCount = (node) => {
        let count = 0;

        each(node.childNodes, node => {
          if (!FormatUtils.isEmptyTextNode(node) && !dom.isBookmarkNode(node)) {
            count++;
          }         
        });
  
        return count;
      };   
  
      const mergeStyles = (node) => {
        // TODO: Implement ApplyFormat.mergeStyles()
        return node;
        // // Check if a child was found and of the same type as the current node
        // const childElement = lists.find(node.childNodes, FormatUtils.isElementNode)
        //   .filter((child) => dom.getContentEditable(child) !== 'false' && MatchFormat.matchName(child, format));
        // return childElement.map(child => {
        //   const clone = child.cloneNode(false);
        //   setElementFormat(clone);

        //   dom.replace(clone, node, true);
        //   dom.remove(child, true);
        //   return clone;
        // }).getOr(node);
      };
  
      const childCount = getChildCount(node);
  
      // Remove empty nodes but only if there is multiple wrappers and they are not block
      // elements so never remove single <h1></h1> since that would remove the
      // current empty block element where the caret is at
      if ((newWrappers.length > 1 || !dom.isBlock(node)) && childCount === 0) {
        dom.remove(node, false);
        return;
      }
  
      if (FormatUtils.isInlineFormat(format) || FormatUtils.isBlockFormat(format) && format.wrapper) {
        // Merges the current node with it's children of similar type to reduce the number of elements
        if (!format.exact && childCount === 1) {
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

  // ...Weitermachen...
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