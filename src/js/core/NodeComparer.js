import lists from '../core/lists';
import dom from '../core/dom';
import Str from '../core/Str';
import Obj from '../core/Obj';

const isAttributeInternal = (attributeName) => Str.startsWith(attributeName, 'data-note-');

/**
 * Compares two nodes and checks if it's attributes and styles matches.
 * This doesn't compare classes as items since their order is significant.
 *
 * @method compare
 * @param {Node} node1 First node to compare with.
 * @param {Node} node2 Second node to compare with.
 * @return {Boolean} True/false if the nodes are the same or not.
 */
const compare = (node1, node2) => {
  // Not the same name or type
  if (node1.nodeName !== node2.nodeName || node1.nodeType !== node2.nodeType) {
    return false;
  }

  /**
   * Returns all the nodes attributes excluding internal ones, styles and classes.
   *
   * @private
   * @param {Node} node Node to get attributes from.
   * @return {Object} Name/value object with attributes and attribute values.
   */
  const getAttribs = (node) => {
    const attribs = {};

    lists.each(node.attributes, (attr) => {
      const name = attr.nodeName.toLowerCase();

      // Don't compare internal attributes or style
      if (name !== 'style' && !isAttributeInternal(name)) {
        attribs[name] = dom.getAttr(node, name);
      }
    });

    return attribs;
  };

  /**
   * Compares two objects checks if it's key + value exists in the other one.
   *
   * @private
   * @param {Object} obj1 First object to compare.
   * @param {Object} obj2 Second object to compare.
   * @return {Boolean} True/false if the objects matches or not.
   */
  const compareObjects = (obj1, obj2) => {
    return Obj.isEqual(obj1, obj2);
  };

  if (dom.isElement(node1) && dom.isElement(node2)) {
    // Attribs are not the same
    if (!compareObjects(getAttribs(node1), getAttribs(node2))) {
      return false;
    }

    // Styles are not the same
    if (!compareObjects(dom.parseStyle(node1), dom.parseStyle(node2))) {
      return false;
    }
  }

  return !dom.isBookmarkNode(node1) && !dom.isBookmarkNode(node2);
};

export default {
  compare,
  isAttributeInternal
}