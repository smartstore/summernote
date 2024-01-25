import $ from 'jquery';
import func from '../core/func';
import lists from '../core/lists';
import range from '../core/range';
import dom from '../core/dom';
import MatchCommand from './MatchCommand';

const yodele = (command, rng) => {
  const selection = window.getSelection();
  const nativeRange = rng.nativeRange();
  const fragment = nativeRange.extractContents();

  const checkForStrong = (node) => {
    if (node.nodeType === Node.ELEMENT_NODE && (node.nodeName === 'STRONG' || node.nodeName === 'B')) {
      return true;
    }
    return Array.from(node.childNodes).some(checkForStrong);
  };

  const removeStrong = (node, parent) => {
    console.log('removeStrong');
    console.log('Type:', node.nodeType);
    console.log('node:', node);
    console.log('parent:', parent.childNodes);

    if (node.nodeType === Node.ELEMENT_NODE && (node.nodeName === 'STRONG' || node.nodeName === 'B')) {
      Array.from(node.childNodes).forEach(child => {
        removeStrong(child, parent);
      });
    } 
    else {
      parent.appendChild(node.cloneNode(true));
    }
  };

  const applyStrong = (node, parent) => {
    console.log('applyStrong');
    console.log('Type:', node.nodeType);
    console.log('node:', node);
    console.log('parent:', parent);
    if (node.nodeType === Node.TEXT_NODE) {
      const strong = document.createElement('strong');
      strong.appendChild(document.createTextNode(node.nodeValue));
      parent.appendChild(strong);
    } 
    else if (node.nodeType === Node.ELEMENT_NODE) {
      const newNode = node.cloneNode(false);
      parent.appendChild(newNode);
      Array.from(node.childNodes).forEach(child => {
        applyStrong(child, newNode);
      });
    } 
    else {
      parent.appendChild(node.cloneNode(true));
    }
  };

  let containsStrong = checkForStrong(fragment);
  let newFragment = document.createDocumentFragment();

  Array.from(fragment.childNodes).forEach(node => {
    if (containsStrong) {
      // Entfernen von <strong> oder <b> Tags
      removeStrong(node, newFragment);
    } else {
      // Hinzufügen von <strong> Tags
      applyStrong(node, newFragment);
    }
  });

  nativeRange.insertNode(newFragment);
  selection.removeAllRanges();
  selection.addRange(nativeRange);
};

const processNode = (node, preferredTagName) => {
  if (dom.isText(node)) {
    return dom.wrap(node, preferredTagName);
  }
  else {
    return node;
  }
};

const apply = (command, rng, variant = null) => {
  if (rng.isCollapsed()) {
    // Applying a command to a collapsed selection will do nothing. Find the word around the cursor.
    rng = rng.getWordRange(true);
  }

  // Make predicate for matchesCommand function
  let pred = (node) => MatchCommand.matchNode(command, node);

  const preferredTagName = Array.isArray(command.tag) ? command.tag[0] : command.tag;

  // Walk and resolve all text nodes in selection
  rng = rng.splitText();

  yodele(command, rng);

  // rng.walk((nodes) => {
  //   console.log(nodes);
  // });
  return;

  const nodes = rng.nodes(dom.isText, { fullyContains: true }).map((textNode) => {
    const singleAncestor = dom.singleChildAncestor(textNode, pred);
    if (singleAncestor) {
      //console.log(singleAncestor);
      return singleAncestor;
    }

    return processNode(textNode, preferredTagName);
  });

  console.log(nodes);
};

export default {
  apply
}