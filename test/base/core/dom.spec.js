import { describe, it, expect, beforeAll } from 'vitest';
import $ from 'jquery';
import dom from '@/js/core/dom';
import Point from '@/js/core/Point';
import func from '@/js/core/func';

describe('base:core.dom', () => {
  describe('ancestor', () => {
    let $cont, $b, txtB;
    beforeAll(() => {
      // basic case
      $cont = $('<div class="note-editable"><b>b</b><u>u</u><s>s</s><i>i</i></div>'); // busi
      $b = $cont.find('b');
      txtB = $b[0].firstChild;
    });

    it('should find ancestor B', () => {
      expect(dom.ancestor(txtB, dom.isB)).to.deep.equal($b[0]);
    });

    it('should find ancestor DIV', () => {
      expect(dom.ancestor(txtB, dom.isDiv)).to.deep.equal($cont[0]);
    });

    it('should return null when finding ancestor U does not exist', () => {
      expect(dom.ancestor(txtB, dom.isU)).to.be.null;
    });

    it('should return null when finding paragraph ancestor outsider note-editable', () => {
      expect(dom.ancestor(txtB, dom.isLi)).to.be.null;
    });
  });

  describe('listAncestor', () => {
    let $cont, $b, $u, $s, $i;
    beforeAll(() => {
      $cont = $('<div class="note-editable"><i><s><u><b>b</b></u></s></i></div>'); // busi
      $b = $cont.find('b');
      $u = $cont.find('u');
      $s = $cont.find('s');
      $i = $cont.find('i');
    });

    it('should return [$b, $u, $s, $i] from b to i', () => {
      let result = dom.parents($b[0], (node) => {
        return node === $i[0];
      });
      expect(result).to.deep.equal([$b[0], $u[0], $s[0], $i[0]]);
    });

    it('should return [$u, $s] from u to s', () => {
      let result = dom.parents($u[0], (node) => {
        return node === $s[0];
      });
      expect(result).to.deep.equal([$u[0], $s[0]]);
    });
  });

  describe('listDescendant', () => {
    let $cont, $b, $u, $s, $i;
    beforeAll(() => {
      $cont = $('<div class="note-editable"><b></b><u></u><s></s><i></i></div>'); // busi
      $b = $cont.find('b');
      $u = $cont.find('u');
      $s = $cont.find('s');
      $i = $cont.find('i');
    });

    it('should return an array of descendant elements', () => {
      expect(dom.children($cont[0])).to.deep.equal([$b[0], $u[0], $s[0], $i[0]]);
    });

    it('should filter an array of descendant elements', () => {
      let result = dom.children($cont[0], (node) => {
        return node.nodeName === 'B' || node.nodeName === 'S';
      });
      expect(result).to.deep.equal([$b[0], $s[0]]);
    });
  });

  describe('commonAncestor', () => {
    let $cont, $span, $div, $b, $u, $s;
    beforeAll(() => {
      $cont = $(
        '<div class="note-editable"><div><span><b>b</b><u>u</u></span><span><s>s</s><i>i</i></span></div></div>',
      );
      $span = $cont.find('span');
      $div = $cont.find('div');
      $b = $cont.find('b');
      $u = $cont.find('u');
      $s = $cont.find('s');
    });

    it('should return a common element in ancestors', () => {
      expect(dom.commonParent($b[0], $u[0])).to.deep.equal($span[0]);
    });

    it('should return a common element in ancestors even if they have same nodeName', () => {
      expect(dom.commonParent($b[0], $s[0])).to.deep.equal($div[0]);
    });
  });

  describe('listNext', () => {
    let $cont, $u, $s, $i;
    beforeAll(() => {
      $cont = $('<div class="note-editable"><b>b</b><u>u</u><s>s</s><i>i</i></div>'); // busi
      $u = $cont.find('u');
      $s = $cont.find('s');
      $i = $cont.find('i');
    });

    it('should return an array of next sibling elements including itself', () => {
      expect(dom.nextSiblings($u[0])).to.deep.equal([$u[0], $s[0], $i[0]]);
    });

    it('should return itself if there are no next sibling', () => {
      expect(dom.nextSiblings($i[0])).to.deep.equal([$i[0]]);
    });

    it('should return an array of next sibling elements before predicate is true', () => {
      expect(dom.nextSiblings($s[0], func.eq($i[0]))).to.deep.equal([$s[0]]);
    });
  });

  describe('listPrev', () => {
    let $cont, $b, $u, $s, $i;
    beforeAll(() => {
      $cont = $('<div class="note-editable"><b>b</b><u>u</u><s>s</s><i>i</i></div>'); // busi
      $b = $cont.find('b');
      $u = $cont.find('u');
      $s = $cont.find('s');
      $i = $cont.find('i');
    });

    it('should return an array of previous sibling elements including itself', () => {
      expect(dom.prevSiblings($s[0])).to.deep.equal([$s[0], $u[0], $b[0]]);
    });

    it('should return itself if there are no previous sibling', () => {
      expect(dom.prevSiblings($b[0])).to.deep.equal([$b[0]]);
    });

    it('should return an array of previous sibling elements before predicate is true', () => {
      expect(dom.prevSiblings($i[0], func.eq($s[0]))).to.deep.equal([$i[0]]);
    });
  });

  describe('position', () => {
    let $cont, $b, $u, $s, $i;
    beforeAll(() => {
      $cont = $('<div class="note-editable"><b>b</b><u>u</u><s>s</s><i>i</i></div>'); // busi
      $b = $cont.find('b');
      $u = $cont.find('u');
      $s = $cont.find('s');
      $i = $cont.find('i');
    });

    it('should return the position of element', () => {
      expect(dom.position($b[0])).to.be.equal(0);
      expect(dom.position($u[0])).to.be.equal(1);
      expect(dom.position($s[0])).to.be.equal(2);
      expect(dom.position($i[0])).to.be.equal(3);
    });

    it('should return position 0 for text node in b', () => {
      expect(dom.position($b[0].firstChild)).to.be.equal(0);
    });
  });

  describe('makeOffsetPath', () => {
    let $cont, $b, $u, $s, $i;
    beforeAll(() => {
      $cont = $('<div class="note-editable"><b>b</b><u>u</u><s>s</s><i>i</i></div>'); // busi
      $b = $cont.find('b');
      $u = $cont.find('u');
      $s = $cont.find('s');
      $i = $cont.find('i');
    });

    it('should return empty array if two elements are same', () => {
      expect(dom.makeOffsetPath($cont[0], $cont[0])).to.deep.equal([]);
    });

    it('should return offset path array between two elements #1', () => {
      expect(dom.makeOffsetPath($cont[0], $b[0])).to.deep.equal([0]);
      expect(dom.makeOffsetPath($cont[0], $b[0].firstChild)).to.deep.equal([0, 0]);
    });

    it('should return offset path array between two elements #2', () => {
      expect(dom.makeOffsetPath($cont[0], $u[0])).to.deep.equal([1]);
      expect(dom.makeOffsetPath($cont[0], $u[0].firstChild)).to.deep.equal([1, 0]);
    });

    it('should return offset path array between two elements #3', () => {
      expect(dom.makeOffsetPath($cont[0], $s[0])).to.deep.equal([2]);
      expect(dom.makeOffsetPath($cont[0], $s[0].firstChild)).to.deep.equal([2, 0]);
    });

    it('should return offset path array between two elements #2', () => {
      expect(dom.makeOffsetPath($cont[0], $i[0])).to.deep.equal([3]);
      expect(dom.makeOffsetPath($cont[0], $i[0].firstChild)).to.deep.equal([3, 0]);
    });
  });

  describe('fromOffsetPath', () => {
    let $cont, $b, $u, $s, $i;
    beforeAll(() => {
      $cont = $('<div class="note-editable"><b>b</b><u>u</u><s>s</s><i>i</i></div>'); // busi
      $b = $cont.find('b');
      $u = $cont.find('u');
      $s = $cont.find('s');
      $i = $cont.find('i');
    });

    it('should return the element by offsetPath', () => {
      let cont = $cont[0];
      $.each([$b[0], $u[0], $s[0], $i[0]], (idx, node) => {
        expect(dom.fromOffsetPath(cont, dom.makeOffsetPath(cont, node))).to.deep.equal(node);
        let child = node.firstChild;
        expect(dom.fromOffsetPath(cont, dom.makeOffsetPath(cont, child))).to.deep.equal(child);
      });
    });
  });

  describe('splitTree', () => {
    let $para;
    beforeEach(() => {
      let $busi = $('<div class="note-editable"><p><b>b</b><u>u</u><s>strike</s><i>i</i></p></div>'); // busi
      $para = $busi.clone().find('p');
    });

    describe('element pivot case', () => {
      it('should be split by u tag with offset 0', () => {
        let $u = $para.find('u');
        Point.splitTree($para[0], { node: $u[0], offset: 0 });

        expect($para.html()).to.equalsIgnoreCase('<b>b</b><u><br></u>');
        expect($para.next().html()).to.equalsIgnoreCase('<u>u</u><s>strike</s><i>i</i>');
      });

      it('should be split by u tag with offset 1', () => {
        let $u = $para.find('u');
        Point.splitTree($para[0], { node: $u[0], offset: 1 });

        expect($para.html()).to.equalsIgnoreCase('<b>b</b><u>u</u>');
        expect($para.next().html()).to.equalsIgnoreCase('<u><br></u><s>strike</s><i>i</i>');
      });

      it('should be split by b tag with offset 0 (left edge case)', () => {
        let $b = $para.find('b');
        Point.splitTree($para[0], { node: $b[0], offset: 0 });

        expect($para.html()).to.equalsIgnoreCase('<b><br></b>');
        expect($para.next().html()).to.equalsIgnoreCase('<b>b</b><u>u</u><s>strike</s><i>i</i>');
      });

      it('should be split by i tag with offset 1 (right edge case)', () => {
        let $i = $para.find('i');
        Point.splitTree($para[0], { node: $i[0], offset: 1 });

        expect($para.html()).to.equalsIgnoreCase('<b>b</b><u>u</u><s>strike</s><i>i</i>');
        expect($para.next().html()).to.equalsIgnoreCase('<i><br></i>');
      });

      it('should discard first split if empty and isDiscardEmptySplits=true', () => {
        var $u = $para.find('u');
        Point.splitTree($para[0], { node: $u[0], offset: 0 }, { discardEmptySplits: true });

        expect($para.html()).to.equalsIgnoreCase('<b>b</b>');
        expect($para.next().html()).to.equalsIgnoreCase('<u>u</u><s>strike</s><i>i</i>');
      });

      it('should discard second split if empty and discardEmptySplits=true', () => {
        var $u = $para.find('u');
        Point.splitTree($para[0], { node: $u[0], offset: 1 }, { discardEmptySplits: true });

        expect($para.html()).to.equalsIgnoreCase('<b>b</b><u>u</u>');
        expect($para.next().html()).to.equalsIgnoreCase('<s>strike</s><i>i</i>');
      });
    });

    describe('textNode case', () => {
      it('should be split by s tag with offset 3 (middle case)', () => {
        let $s = $para.find('s');
        Point.splitTree($para[0], { node: $s[0].firstChild, offset: 3 });

        expect($para.html()).to.equalsIgnoreCase('<b>b</b><u>u</u><s>str</s>');
        expect($para.next().html()).to.equalsIgnoreCase('<s>ike</s><i>i</i>');
      });

      it('should be split by s tag with offset 0 (left edge case)', () => {
        let $s = $para.find('s');
        Point.splitTree($para[0], { node: $s[0].firstChild, offset: 0 });

        expect($para.html()).to.equalsIgnoreCase('<b>b</b><u>u</u><s><br></s>');
        expect($para.next().html()).to.equalsIgnoreCase('<s>strike</s><i>i</i>');
      });

      it('should be split by s tag with offset 6 (right edge case)', () => {
        let $s = $para.find('s');
        Point.splitTree($para[0], { node: $s[0].firstChild, offset: 6 });

        expect($para.html()).to.equalsIgnoreCase('<b>b</b><u>u</u><s>strike</s><i><br></i>');
        expect($para.next().html()).to.equalsIgnoreCase('<i>i</i>');
      });

      it('should be split by s tag with offset 3 (2 depth case)', () => {
        let $s = $para.find('s');
        Point.splitTree($s[0], { node: $s[0].firstChild, offset: 3 });

        expect($para.html()).to.equalsIgnoreCase('<b>b</b><u>u</u><s>str</s><s>ike</s><i>i</i>');
      });

      it('should be split by s tag with offset 3 (1 depth and textNode case)', () => {
        let $s = $para.find('s');
        Point.splitTree($s[0].firstChild, { node: $s[0].firstChild, offset: 3 });

        expect($para.html()).to.equalsIgnoreCase('<b>b</b><u>u</u><s>strike</s><i>i</i>');
      });

      it('should be split by span tag with offset 2 (1 depth and element case)', () => {
        let $cont = $('<div class="note-editable"><p><span><b>b</b><u>u</u><s>s</s><i>i</i></span></p></div>'); // busi
        let $span = $cont.find('span');
        Point.splitTree($span[0], { node: $span[0], offset: 2 });

        expect($cont.html()).to.equalsIgnoreCase('<p><span><b>b</b><u>u</u></span><span><s>s</s><i>i</i></span></p>');
      });
    });
  });

  describe('splitPoint', () => {
    it('should return rightNode and container for empty paragraph with inline', () => {
      let $editable = $('<div class="note-editable"><p><br></p></div>');
      let $para = $editable.clone().find('p');
      let $br = $para.find('br');

      let result = Point.splitPoint({ node: $para[0], offset: 0 }, true);
      expect(result).to.deep.equal({ rightNode: $br[0], container: $para[0] });
    });
  });

  describe('isVisiblePoint', () => {
    it('should detect as visible when there is a table inside a div', () => {
      let $editable = $('<div><table></table></div>');
      let $point = $editable.clone().find('div');

      let result = Point.isVisiblePoint($point);
      expect(result).to.be.true;
    });
  });
});
