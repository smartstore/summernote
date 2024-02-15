import $ from 'jquery';
import dom from '../core/dom';
import range from '../core/range';
import Point from '../core/Point';
import Bullet from '../editing/Bullet';

/**
 * @class editing.Typing
 *
 * Typing
 *
 */
export default class Typing {
  constructor(context) {
    this.context = context;
    // a Bullet instance to toggle lists off
    this.bullet = new Bullet(context);
  }

  get selection() {
    return this.context.modules.editor.selection;
  }

  /**
   * insert tab
   *
   * @param {WrappedRange} rng
   * @param {Number} tabsize
   */
  insertTab(rng, tabsize) {
    const tab = dom.createText(new Array(tabsize + 1).join(Point.NBSP_CHAR));
    rng = rng.deleteContents();
    rng.insertNode(tab, true);

    rng = range.create(tab, tabsize);
    this.selection.setRange(rng);
  }

  /**
   * insert paragraph
   *
   * @param {WrappedRange} rng Can be used in unit tests to "mock" the range
   *
   * blockquoteBreakingLevel
   *   0 - No break, the new paragraph remains inside the quote
   *   1 - Break the first blockquote in the ancestors list
   *   2 - Break all blockquotes, so that the new paragraph is not quoted (this is the default)
   */
  insertParagraph(rng) {
    rng = rng || this.selection.getRange();

    // deleteContents on range.
    rng = rng.deleteContents();

    // Wrap range if it needs to be wrapped by paragraph
    rng = rng.wrapBodyInlineWithPara();

    // finding paragraph
    const splitRoot = dom.closest(rng.sc, dom.isPara);

    let nextPara;
    // on paragraph: split paragraph
    if (splitRoot) {
      // if it is an empty line with li
      if (dom.isLi(splitRoot) && (dom.isEmpty(splitRoot) || dom.deepestChildIsEmpty(splitRoot))) {
        // toggle UL/OL and escape
        this.bullet.toggleList(splitRoot.parentNode.nodeName);
        return;
      } 
      else {
        let blockquote = null;
        if (this.context.options.blockquoteBreakingLevel === 1) {
          blockquote = dom.ancestor(splitRoot, dom.isBlockquote);
        } else if (this.context.options.blockquoteBreakingLevel === 2) {
          blockquote = dom.farthestParent(splitRoot, dom.isBlockquote);
        }

        if (blockquote) {
          // We're inside a blockquote and options ask us to break it
          nextPara = $(dom.emptyPara)[0];
          // If the split is right before a <br>, remove it so that there's no "empty line"
          // after the split in the new blockquote created
          if (Point.isRightEdgePoint(rng.getStartPoint()) && dom.isBR(rng.sc.nextSibling)) {
            $(rng.sc.nextSibling).remove();
          }
          const split = Point.splitTree(blockquote, rng.getStartPoint(), { isDiscardEmptySplits: true });
          if (split) {
            split.parentNode.insertBefore(nextPara, split);
          } 
          else {
            dom.insertAfter(blockquote, nextPara); // There's no split if we were at the end of the blockquote
          }
        }
        else {
          nextPara = Point.splitTree(splitRoot, rng.getStartPoint());

          // not a blockquote, just insert the paragraph
          let emptyAnchors = dom.children(splitRoot, dom.isEmptyAnchor);
          emptyAnchors = emptyAnchors.concat(dom.children(nextPara, dom.isEmptyAnchor));

          $.each(emptyAnchors, (idx, anchor) => {
            dom.remove(anchor);
          });

          // replace empty heading, pre or custom-made styleTag with P tag
          if ((dom.isHeading(nextPara) || dom.isPre(nextPara) || dom.isCustomStyleTag(nextPara)) && dom.isEmpty(nextPara)) {
            nextPara = dom.rename(nextPara, 'p');
          }
        }
      }
    // no paragraph: insert empty paragraph
    } 
    else {
      const next = rng.sc.childNodes[rng.so];
      nextPara = $(dom.emptyPara)[0];
      if (next) {
        rng.sc.insertBefore(nextPara, next);
      } 
      else {
        rng.sc.appendChild(nextPara);
      }
    }

    this.selection.setRange(range.create(nextPara, 0).normalize()).scrollIntoView();
  }
}
