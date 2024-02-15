/**
 * Editor.spec.js
 * (c) 2015~ Summernote Team
 * summernote may be freely distributed under the MIT license./
 */

import chai from 'chai';
import spies from 'chai-spies';
import chaidom from 'test/chaidom';
import $ from 'jquery';
import env from 'src/js/core/env';
import range from 'src/js/core/range';
import Context from 'src/js/Context';
import 'bootstrap';
import 'src/styles/bs4/summernote-bs4';

describe('Editor', () => {
  var expect = chai.expect;
  chai.use(spies);
  chai.use(chaidom);

  var editor, context, $editable, selection;

  function expectContents(context, markup) {
    expect(context.layoutInfo.editable.html()).to.equalsIgnoreCase(markup);
  }

  function expectContentsChain(context, markup, next) {
    setTimeout(() => {
      expect(context.layoutInfo.editable.html()).to.equalsIgnoreCase(markup);
      next();
    }, 10);
  }

  function expectContentsAwait(context, markup, done) {
    expect(context.layoutInfo.editable.html()).await(done).to.equalsIgnoreCase(markup);
  }

  function expectToHaveBeenCalled(context, customEvent, handler) {
    const $note = context.layoutInfo.note;
    const spy = chai.spy();
    $note.on(customEvent, spy);
    handler();
    expect(spy).to.have.been.called();
  }

  beforeEach(function() {
    // important cleanup!
    $('body').empty();
    document.getSelection()?.removeAllRanges();

    var options = $.extend({}, $.summernote.options);
    options.historyLimit = 5;
    context = new Context($('<div><p>hello</p></div>'), options);

    editor = context.modules.editor;
    $editable = context.layoutInfo.editable;
    selection = editor.selection;

    // [workaround]
    //  - IE8-11 can't create range in headless mode
    if (env.isMSIE) {
      this.skip();
    }
  });

  describe('initialize', () => {
    it('should bind custom events', (done) => {
      [
        'keydown', 'keyup', 'blur', 'mousedown', 'mouseup', 'scroll', 'focusin', 'focusout',
      ].forEach((eventName) => {
        expectToHaveBeenCalled(context, 'summernote.' + eventName, () => {
          $editable.trigger(eventName);
        });
      });

      expectToHaveBeenCalled(context, 'summernote.change', () => {
        editor.insertText('hello');
        done();
      });
    });
  });

  describe('undo and redo', () => {
    it('should control history', (done) => {
      editor.insertText(' world1');
      
      setTimeout(() => {
        expectContents(context, '<p>hello world1</p>');
        editor.undo();
        setTimeout(() => {
          expectContents(context, '<p>hello</p>');
          editor.redo();
          setTimeout(() => {
            expectContents(context, '<p>hello world1</p>');
            done();
          }, 10);
        }, 10);
      }, 100);
    });

    it('should be limited by option.historyLimit value', (done) => {
      editor.insertText(' world1');
      editor.insertText(' world2');
      editor.insertText(' world3');
      editor.insertText(' world4');
      editor.insertText(' world5');
      setTimeout(() => {
        expectContents(context, '<p>hello world1 world2 world3 world4 world5</p>');
        editor.undo();
        editor.undo();
        editor.undo();
        setTimeout(() => {
          expectContents(context, '<p>hello world1 world2</p>');
          editor.undo();
          editor.undo();
          editor.undo();
          setTimeout(() => {
            expectContents(context, '<p>hello world1</p>');
            done();
          }, 10);
        }, 10);
      }, 10);
    });
  });

  describe('tab', () => {
    it('should insert tab', (done) => {
      editor.tab();
      expectContentsAwait(context, '<p>hello&nbsp;&nbsp;&nbsp;&nbsp;</p>', done);
    });
  });

  describe('insertParagraph', () => {
    it('should insert paragraph', (done) => {
      editor.insertParagraph();
      setTimeout(() => {
        expectContents(context, '<p>hello</p><p><br></p>');
        editor.insertParagraph();
        setTimeout(() => {
          expectContents(context, '<p>hello</p><p><br></p><p><br></p>');
          done();
        }, 10);
      }, 10);
    });
  });

  describe('insertImage', () => {
    it('should insert image', () => {
      var source = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAGCAYAAADgzO9IAAAAF0lEQVQYGWP8////fwYsgAmLGFiIHhIAT+oECGHuN2UAAAAASUVORK5CYII=';
      return editor.insertImage(source, 'image').then(() => {
        expect($editable.find('img').attr('src')).to.equalsIgnoreCase(source);
      });
    });
  });

  describe('insertOrderedList and insertUnorderedList', () => {
    it('should toggle paragraph to list', (done) => {
      editor.insertOrderedList();

      expectContentsChain(context, '<ol><li>hello</li></ol>', () => {
        editor.insertUnorderedList();
        expectContentsChain(context, '<ul><li>hello</li></ul>', () => {
          editor.insertUnorderedList();
          expectContentsChain(context, '<p>hello</p>', () => {
            done();
          });
        });
      });
    });
  });

  describe('indent and outdent', () => {
    // [workaround] style is different by browser
    it('should indent and outdent paragraph', (done) => {
      editor.indent();
      expectContentsChain(context, '<p style="margin-left: 25px;">hello</p>', () => {
        editor.outdent();
        expect($editable.find('p').css('margin-left')).await(done).to.be.empty;
      });
    });

    it('should indent and outdent list', (done) => {
      editor.insertOrderedList();
      expectContentsChain(context, '<ol><li>hello</li></ol>', () => {
        editor.indent();
        expectContentsChain(context, '<ol><li><br><ol><li>hello</li></ol></li></ol>', () => {
          editor.indent();
          expectContentsChain(context, '<ol><li><br><ol><li><br><ol><li>hello</li></ol></li></ol></li></ol>', () => {
            editor.outdent();
            expectContentsChain(context, '<ol><li><br><ol><li>hello</li></ol></li></ol>', () => {
              editor.outdent();
              expectContentsChain(context, '<ol><li>hello</li></ol>', () => {
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('setLastRange', () => {
    it('should set last range', (done) => {
      $(document.body).trigger('click');
      selection.setBookmark();

      expect(selection.bookmark.sc).await(done).to.equal(editor.editable.lastChild);
    });

    it('should set last range without content', (done) => {
      context.layoutInfo.editable.html('');
      $(document.body).trigger('click');
      selection.setBookmark();

      expect(selection.bookmark.sc).await(done).to.equal(editor.editable);
    });
  });

  describe('insertNode', () => {
    it('should insert node', (done) => {
      editor.insertNode($('<span> world</span>')[0]);
      expectContentsAwait(context, '<p>hello<span> world</span></p>', done);
    });

    it('should be limited', (done) => {
      var options = $.extend({}, $.summernote.options);
      options.maxTextLength = 5;
      context = new Context($('<div><p>hello</p></div>'), options);
      editor = context.modules.editor;

      editor.insertNode($('<span> world</span>')[0]);
      expectContentsAwait(context, '<p>hello</p>', done);
    });

    it('should insert node in last focus', (done) => {
      $editable.appendTo('body');
      context.invoke('editor.focus');

      setTimeout(() => {
        var textNode = $editable.find('p')[0].firstChild;
        selection.setRange(range.create(textNode, 0, textNode, 0));

        setTimeout(() => {
          editor.insertNode($('<span> world</span>')[0]);
          setTimeout(() => {
            $('body').trigger('focus');
            editor.insertNode($('<span> hello</span>')[0]);
            setTimeout(() => {
              expectContentsAwait(context, '<p><span> world</span><span> hello</span>hello</p>', done);
            }, 10);
          }, 10);
        }, 10);
      }, 10);
    });
  });

  describe('insertText', () => {
    it('should insert text', (done) => {
      editor.insertText(' world');
      expectContentsAwait(context, '<p>hello world</p>', done);
    });

    it('should be limited', (done) => {
      var options = $.extend({}, $.summernote.options);
      options.maxTextLength = 5;
      context = new Context($('<div><p>hello</p></div>'), options);
      editor = context.modules.editor;

      editor.insertText(' world');
      expectContentsAwait(context, '<p>hello</p>', done);
    });

    it('should insert text in last focus', (done) => {
      $editable.appendTo('body');
      context.invoke('editor.focus');

      var textNode = $editable.find('p')[0].firstChild;
      selection.setRange(range.create(textNode, 0, textNode, 0));

      setTimeout(() => {
        editor.insertText(' world');
        setTimeout(() => {
          $('body').focus();
          setTimeout(() => {
            editor.insertText(' summernote');
            setTimeout(() => {
              expectContentsAwait(context, '<p> world summernotehello</p>', done);
            }, 10);
          }, 10);
        }, 10);
      }, 10);
    });
  });

  describe('pasteHTML', () => {
    it('should paste html', (done) => {
      editor.pasteHTML('<span> world</span>');
      expectContentsAwait(context, '<p>hello<span> world</span></p>', done);
    });

    it('should not add empty paragraph when pasting paragraphs', (done) => {
      editor.pasteHTML('<p><span>whatever</span><br></p><p><span>it has</span><br></p>');
      expectContentsAwait(context, '<p>hello</p><p><span>whatever</span><br></p><p><span>it has</span><br></p>', done);
    });

    it('should not add empty paragraph when pasting a node that is not isInline', (done) => {
      editor.pasteHTML('<ul><li>list</li></ul><hr><p>paragraph</p><table><tr><td>table</td></tr></table><p></p><blockquote>blockquote</blockquote><data>data</data>');
      expectContentsAwait(context, '<p>hello</p><ul><li>list</li></ul><hr><p>paragraph</p><table><tbody><tr><td>table</td></tr></tbody></table><p></p><blockquote>blockquote</blockquote><p><data>data</data></p>', done);
    });

    it('should not call change event more than once per paste event', () => {
      var generateLargeHtml = () => {
        var html = '<div>';
        for (var i = 0; i < 1000; i++) {
          html += '<p>HTML element #' + i + '</p>';
        }
        html += '</div>';
        return html;
      };
      var $note = context.layoutInfo.note;
      var spy = chai.spy();
      $note.on('summernote.change', spy);
      var html = generateLargeHtml();
      editor.pasteHTML(html);
      expect(spy).to.have.been.called.once;
    });

    it('should be limited', (done) => {
      var options = $.extend({}, $.summernote.options);
      options.maxTextLength = 5;
      context = new Context($('<div><p>hello</p></div>'), options);
      editor = context.modules.editor;

      editor.pasteHTML('<span> world</span>');
      expectContentsAwait(context, '<p>hello</p>', done);
    });
  });

  describe('insertHorizontalRule', () => {
    it('should insert horizontal rule', (done) => {
      editor.insertHorizontalRule();
      expectContentsAwait(context, '<p>hello</p><hr><p><br></p>', done);
    });
  });

  describe('insertTable', () => {
    it('should insert table', (done) => {
      var markup = [
        '<p>hello</p>',
        '<table class="table table-bordered"><tbody>',
        '<tr><td><br></td><td><br></td></tr>',
        '<tr><td><br></td><td><br></td></tr>',
        '</tbody></table>',
        '<p><br></p>',
      ].join('');
      editor.insertTable('2x2');
      expectContentsAwait(context, markup, done);
    });
  });

  describe('empty', () => {
    it('should make contents empty', (done) => {
      editor.empty();
      expect(editor.isEmpty()).await(done).to.be.true;
    });
  });

  describe('styleWithCSS', () => {
    it('should style with tag when it is false (default)', (done) => {
      $editable.appendTo('body');
      selection.setRange(range.createFromNode($editable.find('p')[0]).normalize());
      editor.bold();
      expectContentsAwait(context, '<p><strong>hello</strong></p>', done);
    });

    //// Dont't use this test anymore!
    // it('should style with CSS when it is true', (done) => {
    //   var options = $.extend({}, $.summernote.options);
    //   options.styleWithCSS = true;

    //   $('body').empty();
    //   context = new Context($('<div><p>hello</p></div>').appendTo('body'), options);
    //   editor = context.modules.editor;
    //   $editable = context.layoutInfo.editable;
    //   $editable.appendTo('body');

    //   selection.setRange(range.createFromNode($editable.find('p')[0]).normalize());
    //   editor.bold();
    //   expectContentsAwait(context, '<p><span style="font-weight: bold;">hello</span></p>', done);
    // });
  });

  describe('formatBlock', () => {
    // it('should apply formatBlock', (done) => {
    //   // KAPUTT
    //   $editable.appendTo('body');

    //   var textNode = $editable.find('p')[0].firstChild;
    //   selection.setRange(range.create(textNode, 2, textNode, 3));

    //   setTimeout(() => {
    //     editor.formatBlock('h1');
    //     expectContentsAwait(context, '<h1>hello</h1>', done);
    //   }, 10);
    // });

    it('should toggle all paragraph even with empty paragraph', (done) => {
      var codes = [
        '<p><br></p>',
        '<p>endpoint</p>',
      ];

      context.invoke('code', codes.join(''));
      $editable.appendTo('body');

      var startNode = $editable.find('p').first()[0];
      var endNode = $editable.find('p').last()[0];

      // all p tags is wrapped
      selection.setRange(range.create(startNode, 0, endNode, 1).normalize());

      editor.insertUnorderedList();
      expectContentsAwait(context, '<ul><li><br></li><li>endpoint</li></ul>', done);
    });

    // it('should apply multi formatBlock', (done) => {
    //   // KAPUTT
    //   var codes = [
    //     '<p><a href="http://summernote.org">hello world</a></p>',
    //     '<p><a href="http://summernote.org">hello world</a></p>',
    //     '<p><a href="http://summernote.org">hello world</a></p>',
    //   ];

    //   context.invoke('code', codes.join(''));
    //   $editable.appendTo('body');

    //   var startNode = $editable.find('p').first()[0];
    //   var endNode = $editable.find('p').last()[0];

    //   // all p tags is wrapped
    //   selection.setRange(range.create(startNode, 0, endNode, 1).normalize());

    //   editor.formatBlock('h3');

    //   var nodeName = $editable.children()[0].nodeName;
    //   expect(nodeName).to.equalsIgnoreCase('h3');

    //   // p -> h3, p is none
    //   expect($editable.find('p').length).await(done).to.equals(0);
    // });

    // it('should apply custom className in formatBlock', (done) => {
    //   // KAPUTT
    //   var $target = $('<h4 class="customH4Class"></h4>');
    //   $editable.appendTo('body');
    //   selection.setRange(range.createFromNode($editable.find('p')[0]).normalize());
    //   editor.formatBlock('h4', $target);

    //   // start <p>hello</p> => <h4 class="h4">hello</h4>
    //   expectContentsAwait(context, '<h4 class="customH4Class">hello</h4>', done);
    // });

    // it('should find exact target in formatBlock', (done) => {
    //   // KAPUTT
    //   var $target = $('<a class="dropdown-item" href="#" data-value="h6" role="listitem" aria-label="h6"><h6 class="customH6Class">H6</h6></a>');
    //   $editable.appendTo('body');
    //   selection.setRange(range.createFromNode($editable.find('p')[0]).normalize());
    //   editor.formatBlock('h6', $target);

    //   // start <p>hello</p> => <h6 class="h6">hello</h6>
    //   expectContentsAwait(context, '<h6 class="customH6Class">hello</h6>', done);
    // });

    // it('should replace existing class in formatBlock if target has class', (done) => {
    //   // KAPUTT
    //   const $target1 = $('<p class="old"></p>');
    //   $editable.appendTo('body');
    //   selection.setRange(range.createFromNode($editable.find('p')[0]).normalize());
    //   editor.formatBlock('p', $target1);
    //   const $target2 = $('<p class="new"></p>');
    //   editor.formatBlock('p', $target2);

    //   // start <p class="old">hello</p> => <p class="new">hello</p>
    //   expectContentsAwait(context, '<p class="new">hello</p>', done);
    // });

    it('should remove existing class in formatBlock if target has no class', (done) => {
      const $target1 = $('<p class="customClass" />');
      $editable.appendTo('body');
      selection.setRange(range.createFromNode($editable.find('p')[0]).normalize());
      editor.formatBlock('p', $target1);
      const $target2 = $('<p />');
      editor.formatBlock('p', $target2);

      // start <p class="customClass">hello</p> => <p>hello</p>
      expectContentsAwait(context, '<p>hello</p>', done);
    });

    it('should add fontSize to block', (done) => {
      $editable.appendTo('body');
      context.invoke('editor.focus');

      setTimeout(() => {
        var textNode = $editable.find('p')[0].firstChild;
        selection.setRange(range.create(textNode, 0, textNode, 0));

        setTimeout(() => {
          editor.fontSize(20);
          expectContents(context, '<p><span style="font-size: 20px;">﻿</span>hello</p>');
          done();
        });
      });
    });
  });

  describe('createLink', () => {
    it('should create normal link', (done) => {
      var text = 'hello';
      var pNode = $editable.find('p')[0];
      var textNode = pNode.childNodes[0];
      var startIndex = textNode.wholeText.indexOf(text);
      var endIndex = startIndex + text.length;

      selection.setRange(range.create(textNode, startIndex, textNode, endIndex).normalize());

      // check creation normal link
      editor.createLink({
        url: 'http://summernote.org',
        text: 'summernote',
      });

      expectContentsAwait(context, '<p>hello<a href="http://summernote.org">summernote</a></p>', done);
    });

    it('should create a link with range', (done) => {
      var text = 'hello';
      var pNode = $editable.find('p')[0];
      var textNode = pNode.childNodes[0];
      var startIndex = textNode.wholeText.indexOf(text);
      var endIndex = startIndex + text.length;

      var rng = range.create(textNode, startIndex, textNode, endIndex);

      editor.createLink({
        url: 'http://summernote.org',
        text: 'summernote',
        range: rng,
      });

      expectContentsAwait(context, '<p><a href="http://summernote.org">summernote</a></p>', done);
    });

    it('should create a link with isNewWindow', (done) => {
      var text = 'hello';
      var pNode = $editable.find('p')[0];
      var textNode = pNode.childNodes[0];
      var startIndex = textNode.wholeText.indexOf(text);
      var endIndex = startIndex + text.length;

      var rng = range.create(textNode, startIndex, textNode, endIndex);

      editor.createLink({
        url: 'http://summernote.org',
        text: 'summernote',
        range: rng,
        isNewWindow: true,
      });

      expectContentsAwait(context, '<p><a href="http://summernote.org" target="_blank">summernote</a></p>', done);
    });

    it('should create a relative link without scheme', (done) => {
      var text = 'hello';
      var pNode = $editable.find('p')[0];
      var textNode = pNode.childNodes[0];
      var startIndex = textNode.wholeText.indexOf(text);
      var endIndex = startIndex + text.length;

      var rng = range.create(textNode, startIndex, textNode, endIndex);

      editor.createLink({
        url: '/relative/url',
        text: 'summernote',
        range: rng,
        isNewWindow: true,
      });

      expectContentsAwait(context, '<p><a href="/relative/url" target="_blank">summernote</a></p>', done);
    });

    it('should insert safe html', (done) => {
      var text = 'hello';
      var pNode = $editable.find('p')[0];
      var textNode = pNode.childNodes[0];
      var startIndex = textNode.wholeText.indexOf(text);
      var endIndex = startIndex + text.length;

      var rng = range.create(textNode, startIndex, textNode, endIndex);

      editor.createLink({
        url: '/relative/url',
        text: '<iframe src="hackme.com"></iframe>',
        range: rng,
        isNewWindow: true,
      });

      expectContentsAwait(context, '<p><a href="/relative/url" target="_blank">&lt;iframe src="hackme.com"&gt;&lt;/iframe&gt;</a></p>', done);
    });

    it('should modify a link', (done) => {
      context.invoke('code', '<p><a href="http://summernote.org">hello world</a></p>');

      var anchorNode = $editable.find('a')[0];
      var rng = range.createFromNode(anchorNode);

      editor.createLink({
        url: 'http://wow.summernote.org',
        text: 'summernote wow',
        range: rng,
      });

      expectContentsAwait(context, '<p><a href="http://wow.summernote.org">summernote wow</a></p>', done);
    });

    it('should be limited when creating a link', (done) => {
      var options = $.extend({}, $.summernote.options);
      options.maxTextLength = 5;
      context = new Context($('<div><p>hello</p></div>'), options);
      editor = context.modules.editor;

      editor.createLink({
        url: 'http://summernote.org',
        text: 'summernote',
      });
      expectContentsAwait(context, '<p>hello</p>', done);
    });

    it('should be limited when modifying a link', (done) => {
      var options = $.extend({}, $.summernote.options);
      options.maxTextLength = 5;
      context = new Context($('<p><a href="http://summernote.org">hello</a></p>'), options);

      var editable = context.layoutInfo.editable;
      var anchorNode = editable.find('a')[0];
      var rng = range.createFromNode(anchorNode);
      editor = context.modules.editor;

      editor.createLink({
        url: 'http://summernote.org',
        text: 'hello world',
        range: rng,
      });

      expectContentsAwait(context, '<a href="http://summernote.org">hello</a>', done);
    });
  });
});
