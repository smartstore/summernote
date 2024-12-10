import dom from '../core/dom';
import key from '../core/key';
import range from '../core/range';
import Str from '../core/Str';

const jumpMarker = '__note-jm__';
const jumpMarkerComment = '<!--' + jumpMarker + '-->';

/**
 * @class Codeview
 */
export default class CodeView {
  constructor(context) {
    this.context = context;
    this.$editor = context.layoutInfo.editor;
    this.$editable = context.layoutInfo.editable;
    this.$codable = context.layoutInfo.codable;
    this.options = context.options;
    this.CodeMirrorConstructor = window.CodeMirror;

    if (this.options.codemirror.CodeMirrorConstructor) {
      this.CodeMirrorConstructor = this.options.codemirror.CodeMirrorConstructor;
    }
  }

  sync(html) {
    const isCodeview = this.isActivated();
    const CodeMirror = this.CodeMirrorConstructor;

    if (isCodeview) {
      if (html) {
        if (CodeMirror) {
          this.$codable.data('cmEditor').getDoc().setValue(html);
        } else {
          this.$codable.val(html);
        }
      } else {
        if (CodeMirror) {
          this.$codable.data('cmEditor').save();
        }
      }
    }
  }

  initialize() {
    this.$codable.on('keyup', (event) => {
      if (event.keyCode === key.code.ESCAPE) {
        this.deactivate();
      }
    });
  }

  /**
   * @return {Boolean}
   */
  isActivated() {
    return this.$editor.hasClass('codeview');
  }

  /**
   * toggle codeview
   */
  toggle() {
    if (this.isActivated()) {
      this.deactivate();
    } 
    else {
      this.activate();
    }
    this.context.triggerEvent('codeview.toggled');
  }

  /**
   * purify input value
   * @param value
   * @returns {*}
   */
  purify(value) {
    if (this.options.codeviewFilter) {
      // filter code view regex
      value = value.replace(this.options.codeviewFilterRegex, '');
      // allow specific iframe tag
      if (this.options.codeviewIframeFilter) {
        const whitelist = this.options.codeviewIframeWhitelistSrc.concat(this.options.codeviewIframeWhitelistSrcBase);
        value = value.replace(/(<iframe.*?>.*?(?:<\/iframe>)?)/gi, function(tag) {
          // remove if src attribute is duplicated
          if (/<.+src(?==?('|"|\s)?)[\s\S]+src(?=('|"|\s)?)[^>]*?>/i.test(tag)) {
            return '';
          }
          for (const src of whitelist) {
            // pass if src is trusted
            if ((new RegExp('src="(https?:)?\/\/' + src.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\/(.+)"')).test(tag)) {
              return tag;
            }
          }
          return '';
        });
      }
    }
    return value;
  }

  normalizeSelRange() {
    const editor = this.context.modules.editor;
    const selection = editor.selection;

    let rng;
    if (selection.selectedControl) {
      // TODO: selectedControl is always null due to Handle.js blur event firing beforehand.
      rng = range.createFromNodeBefore(selection.selectedControl);
    } 
    else {
      rng = selection.getRange().cloneRange().collapse(true);
    }

    return range.getNativeRange(rng);
  }

  /**
   * Activate code view
   */
  activate() {
    this.context.triggerEvent('codeview.activating');

    const CodeMirror = this.CodeMirrorConstructor;
    const editor = this.context.modules.editor;
    
    // Create selection range
    let rng = this.normalizeSelRange();
    
    // Create and insert jump marker node
    rng.insertNode(document.createComment(jumpMarker));

    let html = editor.html();

    // Find the position of jump marker in markup
    const jumpMarkerPos = Str.findPosition(html, jumpMarkerComment);
    if (jumpMarkerPos) {
      // Remove jump marker comment from markup
      html = html.replace(jumpMarkerComment, '');
    }

    this.$codable.val(html);
    this.$codable.height(this.$editable.height());

    this.context.invoke('toolbar.updateCodeview', true);
    this.context.invoke('airPopover.updateCodeview', true);

    this.$editor.addClass('codeview');
    this.$codable.trigger('focus');

    // activate CodeMirror as codable
    if (CodeMirror) {
      const cmEditor = CodeMirror.fromTextArea(this.$codable[0], this.options.codemirror);

      // CodeMirror TernServer
      if (this.options.codemirror.tern) {
        const server = new CodeMirror.TernServer(this.options.codemirror.tern);
        cmEditor.ternServer = server;
        cmEditor.on('cursorActivity', (cm) => {
          server.updateArgHints(cm);
        });
      }

      cmEditor.on('blur', (event) => {
        this.context.triggerEvent('codeview.blur', cmEditor.getValue(), event);
      });
      cmEditor.on('change', () => {
        this.context.triggerEvent('codeview.change', cmEditor.getValue(), cmEditor);
      });

      // CodeMirror hasn't Padding.
      cmEditor.setSize(null, this.$editable.outerHeight());
      this.$codable.data('cmEditor', cmEditor);

      // Jump to selection marker
      if (jumpMarkerPos) {
        const pos = {line: jumpMarkerPos.line, ch: jumpMarkerPos.column};
        cmEditor.setCursor(pos);
        cmEditor.scrollIntoView(pos);
      }
    } 
    else {
      this.$codable.on('blur', (event) => {
        this.context.triggerEvent('codeview.blur', this.$codable.val(), event);
      });
      this.$codable.on('input', () => {
        this.context.triggerEvent('codeview.change', this.$codable.val(), this.$codable);
      });
    }
  }

  // removeJumpMarker() {
  //   const $editable = this.context.layoutInfo.editable;

  //   const treeWalker = document.createTreeWalker($editable[0], NodeFilter.SHOW_COMMENT, {
  //     acceptNode(node) {
  //       return node.nodeValue.trim() === jumpMarker ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
  //     }
  //   });
    
  //   let node;
  //   while ((node = treeWalker.nextNode())) {
  //     console.log('MARKER', node);
  //     node.parentNode.removeChild(node); // Remove the comment node
  //     break;
  //   }
  // }

  /**
   * deactivate code view
   */
  deactivate() {
    this.context.triggerEvent('codeview.leaving');

    const CodeMirror = this.CodeMirrorConstructor;
    // deactivate CodeMirror as codable
    if (CodeMirror) {
      const cmEditor = this.$codable.data('cmEditor');
      this.$codable.val(cmEditor.getValue());
      cmEditor.toTextArea();
    }

    const value = this.purify(dom.value(this.$codable, this.options.prettifyHtml) || dom.emptyPara);
    const isChange = this.$editable.html() !== value;

    this.$editable.html(value);
    this.$editable.height(this.options.height ? this.$codable.height() : 'auto');
    this.$editor.removeClass('codeview');

    if (isChange) {
      this.context.triggerEvent('change', this.$editable);
    }

    this.$editable.trigger('focus');

    this.context.invoke('toolbar.updateCodeview', false);
    this.context.invoke('airPopover.updateCodeview', false);
  }

  destroy() {
    if (this.isActivated()) {
      this.deactivate();
    }
  }
}
