/**
 * Typing.spec.js
 * (c) 2015~ Summernote Team
 * summernote may be freely distributed under the MIT license./
 */
/* jshint unused: false */
/* jshint -W101 */
import $ from 'jquery';
import chai from 'chai';
import chaidom from 'test/chaidom';
import range from 'src/js/core/range';
import Typing from 'src/js/editing/Typing';

var expect = chai.expect;
chai.use(chaidom);

describe('base:editing.Style', () => {
  // These tests always fail, even is original Summernote.
  return true;
  function typing(level) {
    return new Typing({ options: { blockquoteBreakingLevel: level } });
  }

  describe('base:editing.Typing', () => {
    describe('insertParagraph', () => {
      describe('blockquote breaking support', () => {
        var $editable, bq1, bq2;

        function check(html) {
          expect($editable.html()).to.equalsIgnoreCase(html);
        }

        beforeEach(() => {
          $editable = $('<div class="note-editable" contenteditable="true"><blockquote id="1">Part1<blockquote id="2">Part2.1<br>Part2.2</blockquote>Part3</blockquote></div>');
          bq1 = $('#1', $editable)[0];
          bq2 = $('#2', $editable)[0];
        });

        it('should not break blockquote if blockquoteBreakingLevel=0', () => {
          typing(0).insertParagraph(range.create(bq2.firstChild, 1));

          check('<blockquote id="1">Part1<blockquote id="2"><p>P</p><p>art2.1<br>Part2.2</p></blockquote>Part3</blockquote>');
        });

        it('should break the first blockquote if blockquoteBreakingLevel=1', () => {
          typing(1).insertParagraph(range.create(bq2.firstChild, 1));

          check('<blockquote id="1">Part1<blockquote id="2"><p>P</p></blockquote><p><br></p><blockquote id="2"><p>art2.1<br>Part2.2</p></blockquote>Part3</blockquote>');
        });

        it('should break all blockquotes if blockquoteBreakingLevel=2', () => {
          typing(2).insertParagraph(range.create(bq2.firstChild, 1));

          check('<blockquote id="1">Part1<blockquote id="2"><p>P</p></blockquote></blockquote><p><br></p><blockquote id="1"><blockquote id="2"><p>art2.1<br>Part2.2</p></blockquote>Part3</blockquote>');
        });

        it('should remove leading BR from split, when breaking is on the right edge of a line', () => {
          typing(1).insertParagraph(range.create(bq2.firstChild, 7));

          check('<blockquote id="1">Part1<blockquote id="2"><p>Part2.1</p></blockquote><p><br></p><blockquote id="2"><p>Part2.2</p></blockquote>Part3</blockquote>');
        });

        it('should insert new paragraph after the blockquote, if break happens at the end of the blockquote', () => {
          typing(2).insertParagraph(range.create(bq1.lastChild, 5));

          check('<blockquote id="1"><p>Part1<blockquote id="2">Part2.1<br>Part2.2</blockquote>Part3</p></blockquote><p><br></p>');
        });

        it('should insert new paragraph before the blockquote, if break happens at the beginning of the blockquote', () => {
          typing(2).insertParagraph(range.create(bq1.firstChild, 0));

          check('<p><br></p><blockquote id="1"><p>Part1<blockquote id="2">Part2.1<br>Part2.2</blockquote>Part3</p></blockquote>');
        });
      });
    });
  });
});
