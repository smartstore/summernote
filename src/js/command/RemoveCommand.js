import $ from 'jquery';
import func from '../core/func';
import lists from '../core/lists';
import range from '../core/range';
import dom from '../core/dom';
import MatchCommand from './MatchCommand';

const processNode = (node) => {
  console.log('processNode', node);
  if (dom.isText(node)) {
    return dom.unwrap(node);
  }
  else {
    return node;
  }
};

const remove = (command, rng, match, variant = null) => {
  if (rng.isCollapsed()) {
    rng = range.createFromNode(match.node);
  }

  // Make predicate for matchesCommand function
  let pred = (node) => MatchCommand.matchNode(command, node);

  // Walk and resolve all text nodes in selection
  rng = rng.splitText();

  const nodes = rng.nodes(dom.isText, { fullyContains: true }).map((textNode) => {
    const singleAncestor = dom.singleChildAncestor(textNode, pred);
    if (singleAncestor) {
      return dom.unwrap(textNode);
    }

    return processNode(textNode);
  });
}

export default {
  remove
}