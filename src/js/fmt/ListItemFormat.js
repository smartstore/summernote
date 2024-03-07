import Type from '../core/Type';
import lists from '../core/lists';
import dom from '../core/dom';
import Point from '../core/Point';
import FormatUtils from './FormatUtils';

const listItemStyles = [ 'fontWeight', 'fontStyle', 'color', 'fontSize', 'fontFamily' ];

const hasListStyles = (fmt) => Type.isObject(fmt.styles) && lists.exists(Object.keys(fmt.styles), (name) => lists.contains(listItemStyles, name));

const findExpandedListItemFormat = (formats) =>
  lists.find(formats, (fmt) => FormatUtils.isInlineFormat(fmt) && fmt.inline === 'span' && hasListStyles(fmt));

const getExpandedListItemFormat = (formatter, format) => {
  const formatList = formatter.get(format);
  return Type.isArray(formatList) ? findExpandedListItemFormat(formatList) : null;
};

const isRngStartAtStartOfElement = (rng, elm) => {
  // TODO: Is this correct? isRngStartAtStartOfElement()
  return Point.isLeftEdgePointOf(rng.getStartPoint(), elm);
};

const isRngEndAtEndOfElement = (rng, elm) => {
  // TODO: Is this correct? isRngEndAtEndOfElement()
  return Point.isRightEdgePointOf(rng.getEndPoint(), elm);
};

const isEditableListItem = () => (elm) => dom.isListItem(elm) && dom.isContentEditable(elm);

const getFullySelectedBlocks = (selection) => {
  const blocks = selection.getSelectedBlocks();
  const rng = selection.getRange();

  if (rng.collapsed) {
    return [];
  } 
  
  if (blocks.length === 1) {
    return isRngStartAtStartOfElement(rng, blocks[0]) && isRngEndAtEndOfElement(rng, blocks[0]) ? blocks : [];
  } 
  else {
    let result = [];

    // Left edge part
    if (isRngStartAtStartOfElement(rng, lists.head(blocks))) {
      result.push(lists.head(blocks));
    }

    // Middle part
    result = result.concat(blocks.slice(1, -1));

    // Right edge part
    if (isRngEndAtEndOfElement(rng, lists.last(blocks))) {
      result.push(lists.last(blocks));
    }

    return result;
  }
}

export default {
  listItemStyles,
  getExpandedListItemFormat,
  getFullySelectedListItems: (selection) => lists.filter(getFullySelectedBlocks(selection), isEditableListItem),
  getPartiallySelectedListItems: (selection) => lists.filter(selection.getSelectedBlocks(), isEditableListItem)
}