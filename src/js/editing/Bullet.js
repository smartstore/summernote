import $ from 'jquery';
import lists from '../core/lists';
import dom from '../core/dom';
import Point from '../core/Point';
import range from '../core/range';
import func from '../core/func';

export default class Bullet {
  /**
   * toggle ordered list
   */
  insertOrderedList(editable) {
    this.toggleList('OL', editable);
  }

  /**
   * toggle unordered list
   */
  insertUnorderedList(editable) {
    this.toggleList('UL', editable);
  }

  /**
   * indent
   */
  indent(editable) {
    const rng = range.create(editable).wrapBodyInlineWithPara();
    
    const paras = rng.nodes(dom.isPara, { includeAncestor: true });
    const clustereds = lists.clusterBy(paras, 'parentNode');

    $.each(clustereds, (idx, paras) => {
      const head = lists.head(paras);
      if (dom.isLi(head)) {
        const previousList = this.findList(head.previousElementSibling);
        if (previousList) {
          paras
            .map(para => previousList.appendChild(para));
        } else {
          this.wrapList(paras, head.parentNode.nodeName);
          
          // move ul element to parent li element
          paras
            .map((para) => para.parentNode)
            // distinct
            .filter(function(elem, index, self) {	return index === self.indexOf(elem);  })
            .map((para) => this.appendToPrevious(para));
        }
      } else {
        $.each(paras, (idx, para) => {
          $(para).css('marginLeft', (idx, val) => {
            return (parseInt(val, 10) || 0) + 25;
          });
        });
      }
    });

    rng.select();
  }

  /**
   * outdent
   */
  outdent(editable) {
    const rng = range.create(editable).wrapBodyInlineWithPara();

    const paras = rng.nodes(dom.isPara, { includeAncestor: true });
    const clustereds = lists.clusterBy(paras, 'parentNode');

    $.each(clustereds, (idx, paras) => {
      const head = lists.head(paras);
      if (dom.isLi(head)) {
        this.releaseList([paras]);
      } else {
        $.each(paras, (idx, para) => {
          $(para).css('marginLeft', (idx, val) => {
            val = (parseInt(val, 10) || 0);
            return val > 25 ? val - 25 : '';
          });
        });
      }
    });

    rng.select();
  }

  /**
   * toggle list
   *
   * @param {String} listName - OL or UL
   */
  toggleList(listName, editable) {
    const rng = range.create(editable).wrapBodyInlineWithPara();
    //if (listName == 'UL') console.log('toggleList HTML', editable.innerHTML);
    //if (listName == 'UL') console.log('toggleList rng', rng);
    let paras = rng.nodes(dom.isPara, { includeAncestor: true });
    //if (listName == 'UL') console.log('toggleList paras', paras);
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
        return (listNode.nodeName !== listName);
      });

      if (diffLists.length) {
        lists.each(diffLists, (listNode) => {
          dom.rename(listNode, listName);
        });
      } else {
        paras = this.releaseList(clustereds, true);
      }
    }

    range.createFromParaBookmark(bookmark, paras).select();
  }

  /**
   * @param {Node[]} paras
   * @param {String} listName
   * @return {Node[]}
   */
  wrapList(paras, listName) {
    const head = lists.head(paras);
    const last = lists.last(paras);

    const prevList = dom.isList(head.previousElementSibling) && head.previousElementSibling;
    const nextList = dom.isList(last.nextElementSibling) && last.nextElementSibling;

    //console.log('wrapList last', last);
    const listNode = prevList || dom.insertAfter(last, dom.create(listName || 'UL'));

    // P to LI
    paras = paras.map((para) => {
      return dom.isPurePara(para) ? dom.rename(para, 'LI') : para;
    });

    // append to list(<ul>, <ol>)
    dom.appendChildNodes(listNode, paras);

    if (nextList) {
      dom.appendChildNodes(listNode, lists.from(nextList.childNodes));
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

    $.each(clustereds, (idx, paras) => {
      const head = lists.head(paras);
      const last = lists.last(paras);

      const headList = isEscapseToBody ? dom.farthestParent(head, dom.isList) : head.parentNode;
      const parentItem = headList.parentNode;

      if (headList.parentNode.nodeName === 'LI') {
        paras.map(para => {
          const newList = this.findNextElementSiblings(para);

          if (parentItem.nextElementSibling) {
            parentItem.parentNode.insertBefore(
              para,
              parentItem.nextElementSibling
            );
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
        if (parentItem.childNodes.length === 0 || parentItem.childNodes.length === 1 && parentItem.childNodes[0].textContent.trim() === '') {
          parentItem.parentNode.removeChild(parentItem);
        }
      } else {
        const lastList = headList.childNodes.length > 1 ? Point.splitTree(headList, {
          node: last.parentNode,
          offset: dom.position(last) + 1,
        }, {
          isSkipPaddingBlankHTML: true,
        }) : null;

        const middleList = Point.splitTree(headList, {
          node: head.parentNode,
          offset: dom.position(head),
        }, {
          isSkipPaddingBlankHTML: true,
        });

        paras = isEscapseToBody ? dom.children(middleList, dom.isLi)
          : lists.from(middleList.childNodes).filter(dom.isLi);

        // LI to P
        if (isEscapseToBody || !dom.isList(headList.parentNode)) {
          paras = paras.map((para) => {
            return dom.rename(para, 'P');
          });
        }

        $.each(lists.from(paras).reverse(), (idx, para) => {
          dom.insertAfter(headList, para);
        });

        // remove empty lists
        const rootLists = lists.compact([headList, middleList, lastList]);
        $.each(rootLists, (idx, rootList) => {
          const listNodes = [rootList].concat(dom.children(rootList, dom.isList));
          $.each(listNodes.reverse(), (idx, listNode) => {
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
    return node.previousElementSibling
      ? dom.appendChildNodes(node.previousElementSibling, [node])
      : this.wrapList([node], 'LI');
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
    return node
      ? node.children && lists.find(node.children, child => ['OL', 'UL'].indexOf(child.nodeName) > -1)
      : null;
  }

  /**
   * @method findNextElementSiblings
   *
   * Finds all list item siblings that follow it
   *
   * @param {HTMLNode} ListItem
   * @return {HTMLNode}
   */
  findNextElementSiblings(node) {
    const siblings = [];
    while (node.nextElementSibling) {
      siblings.push(node.nextElementSibling);
      node = node.nextElementSibling;
    }
    return siblings;
  }
}
