import $ from 'jquery';
import lists from '../core/lists';
import func from '../core/func';
import dom from '../core/dom';
import Point from '../core/Point';
import range from '../core/range';

export default class Bullet {
  constructor(context) {
    this.context = context;
  }

  get selection() {
    return this.context.modules.editor.selection;
  }

  /**
   * Toggle ordered list
   */
  insertOrderedList(rng) {
    this.toggleList('OL', rng);
  }

  /**
   * Toggle unordered list
   */
  insertUnorderedList(rng) {
    this.toggleList('UL', rng);
  }

  /**
   * indent
   */
  indent(rng) {
    rng = rng || this.selection.getRange();
    rng = rng.wrapBodyInlineWithPara();
    
    const paras = rng.nodes(dom.isParaNoBlockquote, { includeAncestor: true });
    const clustereds = lists.clusterBy(paras, 'parentNode');

    lists.each(clustereds, (paras) => {
      const head = lists.head(paras);
      if (dom.isLi(head)) {
        const previousList = this.findList(head.previousSibling);
        if (previousList) {
          paras.map(para => previousList.appendChild(para));
        } 
        else {
          this.wrapList(paras, head.parentNode.nodeName);
          paras.map((para) => para.parentNode).map((para) => this.appendToPrevious(para));
        }
      } 
      else {
        lists.each(paras, (para) => {
          $(para).css('marginLeft', (idx, val) => {
            return (parseInt(val, 10) || 0) + 25;
          });
        });
      }
    });

    this.selection.setRange(rng);
  }

  /**
   * outdent
   */
  outdent(rng) {
    rng = rng || this.selection.getRange();
    rng = rng.wrapBodyInlineWithPara();

    const paras = rng.nodes(dom.isParaNoBlockquote, { includeAncestor: true });
    const clustereds = lists.clusterBy(paras, 'parentNode');

    lists.each(clustereds, (paras) => {
      const head = lists.head(paras);
      if (dom.isLi(head)) {
        this.releaseList([paras]);
      } else {
        lists.each(paras, (para) => {
          $(para).css('marginLeft', (idx, val) => {
            val = parseInt(val, 10) || 0;
            return val > 25 ? val - 25 : '';
          });
        });
      }
    });

    this.selection.setRange(rng);
  }

  /**
   * toggle list
   *
   * @param {String} listName - OL or UL
   */
  toggleList(listName, rng) {
    rng = rng || this.selection.getRange();
    rng = rng.wrapBodyInlineWithPara();

    let paras = rng.nodes(dom.isParaNoBlockquote, { includeAncestor: true });
    const bookmark = rng.createParaBookmark(paras);
    const clustereds = lists.clusterBy(paras, 'parentNode');

    // paragraph to list
    if (lists.find(paras, dom.isPurePara)) {
      let wrappedParas = [];
      lists.each(clustereds, (paras) => {
        wrappedParas = wrappedParas.concat(this.wrapList(paras, listName));
      });
      paras = wrappedParas;
    // list to paragraph or change list style
    } else {
      const diffLists = rng.nodes(dom.isList, {
        includeAncestor: true,
      }).filter((listNode) => {
        return !$.nodeName(listNode, listName);
      });

      if (diffLists.length) {
        lists.each(diffLists, (listNode) => {
          dom.rename(listNode, listName);
        });
      } else {
        paras = this.releaseList(clustereds, true);
      }
    }

    rng = range.createFromParaBookmark(bookmark, paras);
    this.selection.setRange(rng);
  }

  /**
   * @param {Node[]} paras
   * @param {String} listName
   * @return {Node[]}
   */
  wrapList(paras, listName) {
    const head = lists.head(paras);
    const last = lists.last(paras);

    const prevList = dom.isList(head.previousSibling) && head.previousSibling;
    const nextList = dom.isList(last.nextSibling) && last.nextSibling;

    //console.log('wrapList last', last);
    const listNode = prevList || dom.insertAfter(last, dom.create(listName || 'UL'));

    // P to LI
    paras = paras.map((para) => {
      return dom.isPurePara(para) ? dom.rename(para, 'LI') : para;
    });

    // append to list(<ul>, <ol>)
    dom.appendChildNodes(listNode, paras, true);

    if (nextList) {
      dom.appendChildNodes(listNode, lists.from(nextList.childNodes), true);
      dom.remove(nextList);
    }

    return paras;
  }

  /**
   * @method releaseList
   *
   * @param {Array[]} clustereds
   * @param {Boolean} isEscapseToBody
   * @return {Node[]}
   */
  releaseList(clustereds, isEscapseToBody) {
    let releasedParas = [];

    lists.each(clustereds, (paras) => {
      const head = lists.head(paras);
      const last = lists.last(paras);

      const headList = isEscapseToBody ? dom.farthestParent(head, dom.isList) : head.parentNode;
      const parentItem = headList.parentNode;

      if (headList.parentNode.nodeName === 'LI') {
        paras.map(para => {
          const newList = this.findNextSiblings(para);

          if (parentItem.nextSibling) {
            parentItem.parentNode.insertBefore(para, parentItem.nextSibling);
          } else {
            parentItem.parentNode.appendChild(para);
          }

          if (newList.length) {
            this.wrapList(newList, headList.nodeName);
            para.appendChild(newList[0].parentNode);
          }
        });

        if (headList.children.length === 0) {
          parentItem.removeChild(headList);
        }

        // remove left-over ul or ul with only whitespace node
        if (parentItem.childNodes.length === 0) {
          parentItem.parentNode.removeChild(parentItem);
        }
      } else {
        const lastList =
          headList.childNodes.length > 1
            ? Point.splitTree(
                headList,
                {
                  node: last.parentNode,
                  offset: dom.position(last) + 1,
                },
                {
                  skipPaddingBlankHTML: true,
                },
              )
            : null;

        const middleList = Point.splitTree(
          headList,
          {
            node: head.parentNode,
            offset: dom.position(head),
          },
          {
            skipPaddingBlankHTML: true,
          },
        );

        paras = isEscapseToBody 
          ? dom.children(middleList, dom.isLi)
          : lists.from(middleList.childNodes).filter(dom.isLi);

        // LI to P
        if (isEscapseToBody || !dom.isList(headList.parentNode)) {
          paras = paras.map((para) => {
            return dom.rename(para, 'P');
          });
        }

        lists.each(lists.from(paras).reverse(), (para) => {
          dom.insertAfter(headList, para);
        });

        // remove empty lists
        const rootLists = lists.compact([headList, middleList, lastList]);
        lists.each(rootLists, (rootList) => {
          const listNodes = [rootList].concat(dom.children(rootList, dom.isList));
          lists.each(listNodes.reverse(), (listNode) => {
            if (!dom.nodeLength(listNode)) {
              dom.remove(listNode, true);
            }
          });
        });
      }

      releasedParas = releasedParas.concat(paras);
    });

    return releasedParas;
  }

  /**
   * @method appendToPrevious
   *
   * Appends list to previous list item, if
   * none exist it wraps the list in a new list item.
   *
   * @param {HTMLNode} ListItem
   * @return {HTMLNode}
   */
  appendToPrevious(node) {
    return node.previousSibling ? dom.appendChildNodes(node.previousSibling, [node]) : this.wrapList([node], 'LI');
  }

  /**
   * @method findList
   *
   * Finds an existing list in list item
   *
   * @param {HTMLNode} ListItem
   * @return {Array[]}
   */
  findList(node) {
    return node ? lists.find(node.children, (child) => ['OL', 'UL'].indexOf(child.nodeName) > -1) : null;
  }

  /**
   * @method findNextElementSiblings
   *
   * Finds all list item siblings that follow it
   *
   * @param {HTMLNode} ListItem
   * @return {HTMLNode}
   */
  findNextSiblings(node) {
    const siblings = [];
    while (node.nextSibling) {
      siblings.push(node.nextSibling);
      node = node.nextSibling;
    }
    return siblings;
  }
}
