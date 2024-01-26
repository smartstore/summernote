import $ from 'jquery';
import Str from '../core/Str';
import func from '../core/func';
import dom from '../core/dom';

const matchNode = (command, node) => {
    // TODO: handle variants
    if (!command || !node || node.nodeType != Node.ELEMENT_NODE) {
      // Allow only element nodes
      return false;
    }

    const result = {};

    // Check tag name(s)
    if (command.tag && dom.isTag(node, command.tag)) {
      result.tagMatch = node.tagName;
    }

    // Check inline style
    // TODO: handle command.tagOrStyle
    // TODO: Implement styleInvert
    if (command.style /*&& (command.tagOrStyle || !tagMatch)*/) {
      const value = node.style.getPropertyValue(command.style);
      if (value) {
        if (command.styleMatch) {
          if (Str.matches(command.styleMatch, value)) {
            result.styleMatch = value;
          }
        }
        else {
          // No styleMatch means: match any value (e.g. for font-family)
          result.styleMatch = value;
        }
      }
    }

    // Check class name(s)
    // TODO: handle command.tagOrStyle
    // TODO: Implement classInvert
    // TODO: handle inclusive/exclusive classes
    if (command.classMatch) {
      const classList = node.classList;

      if (classList.length) {
        if (command.masterClass && !classList.contains(command.masterClass)) {
          // Match classes only if the master class (if provided) is present in node (e.g.: .alert for .alert-[variant})
          const isPattern = command.classMatch instanceof RegExp || (command.variants?.length && command.classMatch.indexOf('*') > -1);
          const classMatches = [];
  
          // Enumerate all current node classes
          for (const value of node.classList.values()) {
            if (Str.matches(command.classMatch, value)) {
              // Add matched class to the result list
              classMatches.push(value);
    
              // Exit on first hit if classMatch is string and does not contain * and we have no variants
              if (!isPattern) {
                break;
              }
            }
          }
    
          if (classMatches.length) {
            result.classMatch = classMatches;
          }
        }
      }
    }
    
    if ($.isEmptyObject(result)) {
      // No match, return null for proper checks
      return null;
    }

    result.node = node;
    result.command = command;
    return result;
};

const matchRange = (command, rng, ancestors = null) => {
    // TODO: Add "Default" to FontName and FontSize tools (to remove font-family)
    if (!command) {
      return null;
    }

    if (!ancestors) {
      if (rng) {
        rng = rng.normalize();
        const node = !dom.isElement(rng.sc) ? rng.sc.parentNode : rng.sc;
        ancestors = dom.listAncestor(node /*, dom.isBlock */);
      }
      else {
        return null;
      }
    }

    let match;

    for (var i = 0; i < ancestors.length; i++) {
      match = matchNode(command, ancestors[i]);
      if (match) {
        break;
      }
    }

    return match;
};

export default {
  matchNode,
  matchRange
}