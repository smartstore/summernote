/**
 * Typing.spec.js
 * (c) 2015~ Summernote Team
 * summernote may be freely distributed under the MIT license./
 */
/* jshint unused: false */
/* jshint -W101 */

import { describe, it, expect } from 'vitest';
import $ from 'jquery';
import range from '@/js/core/range';
import Context from '@/js/Context';
import Typing from '@/js/editing/Typing';
import '@/styles/lite/summernote-lite';

describe('base:editing.Style', () => {
  function typing(level) {
    $('body').empty(); // important!
    document.getSelection()?.removeAllRanges();

    var $note = $('<div></div>').appendTo('body');
    var options = $.extend({}, $.summernote.options, { blockquoteBreakingLevel: level });
    var context = new Context($note, options);

    return new Typing(context);
  }

  describe('base:editing.Typing', () => {
    describe('insertParagraph', () => {
      describe('blockquote breaking support', () => {
        var $editable;

        function check(html) {
          expect($editable.html()).to.equalsIgnoreCase(html);
        }

        beforeEach(() => {
          $editable = $(
            '<div class="note-editable"><blockquote id="1">Part1<blockquote id="2">Part2.1<br>Part2.2</blockquote>Part3</blockquote></div>',
          );
        });

        it('should not break blockquote if blockquoteBreakingLevel=0', () => {
          typing(0).insertParagraph(range.create($('#2', $editable)[0].firstChild, 1));

          check(
            '<blockquote id="1">Part1<blockquote id="2"><p>P</p><p>art2.1<br>Part2.2</p></blockquote>Part3</blockquote>',
          );
        });

        it('should break the first blockquote if blockquoteBreakingLevel=1', () => {
          typing(1).insertParagraph(range.create($('#2', $editable)[0].firstChild, 1));

          check(
            '<blockquote id="1">Part1<blockquote id="2"><p>P</p></blockquote><p><br></p><blockquote id="2"><p>art2.1<br>Part2.2</p></blockquote>Part3</blockquote>',
          );
        });

        it('should break all blockquotes if blockquoteBreakingLevel=2', () => {
          typing(2).insertParagraph(range.create($('#2', $editable)[0].firstChild, 1));

          check(
            '<blockquote id="1">Part1<blockquote id="2"><p>P</p></blockquote></blockquote><p><br></p><blockquote id="1"><blockquote id="2"><p>art2.1<br>Part2.2</p></blockquote>Part3</blockquote>',
          );
        });

        it('should remove leading BR from split, when breaking is on the right edge of a line', () => {
          typing(1).insertParagraph(range.create($('#2', $editable)[0].firstChild, 7));

          check(
            '<blockquote id="1">Part1<blockquote id="2"><p>Part2.1</p></blockquote><p><br></p><blockquote id="2"><p>Part2.2</p></blockquote>Part3</blockquote>',
          );
        });

        it('should insert new paragraph after the blockquote, if break happens at the end of the blockquote', () => {
          typing(2).insertParagraph(range.create($('#1', $editable)[0].lastChild, 5));

          check(
            '<blockquote id="1"><p>Part1<blockquote id="2">Part2.1<br>Part2.2</blockquote>Part3</p></blockquote><p><br></p>',
          );
        });

        it('should insert new paragraph before the blockquote, if break happens at the beginning of the blockquote', () => {
          typing(2).insertParagraph(range.create($('#1', $editable)[0].firstChild, 0));

          check(
            '<p><br></p><blockquote id="1"><p>Part1<blockquote id="2">Part2.1<br>Part2.2</blockquote>Part3</p></blockquote>',
          );
        });
      });
    });
  });
});
