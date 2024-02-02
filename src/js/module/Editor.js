import $ from 'jquery';
import Str from '../core/Str';
import env from '../core/env';
import key from '../core/key';
import func from '../core/func';
import lists from '../core/lists';
import dom from '../core/dom';
import range from '../core/range';
import Point from '../core/Point';
import { readFileAsDataURL, createImage } from '../core/async';
import History from '../editing/History';
import Style from '../editing/Style';
import Typing from '../editing/Typing';
import Table from '../editing/Table';
import Bullet from '../editing/Bullet';
import Selection from '../editing/Selection';
import Formatter from '../fmt/Formatter';

const KEY_BOGUS = 'bogus';

/**
 * @class Editor
 */
export default class Editor {
  constructor(context) {
    this.context = context;

    this.$note = context.layoutInfo.note;
    this.$editor = context.layoutInfo.editor;
    this.$editable = context.layoutInfo.editable;
    this.options = context.options;
    this.lang = this.options.langInfo;
    
    this.editable = this.$editable[0];
    this.lastRange = null;
    this.snapshot = null;

    this.table = new Table();
    this.typing = new Typing(context);
    this.bullet = new Bullet();
    this.history = new History(context);
    this.formatter = new Formatter(context);
    this.style = new Style(context, this.formatter);
    this.selection = new Selection(context);

    this.context.memo('help.escape', this.lang.help.escape);
    this.context.memo('help.undo', this.lang.help.undo);
    this.context.memo('help.redo', this.lang.help.redo);
    this.context.memo('help.tab', this.lang.help.tab);
    this.context.memo('help.untab', this.lang.help.untab);
    this.context.memo('help.insertParagraph', this.lang.help.insertParagraph);
    this.context.memo('help.insertOrderedList', this.lang.help.insertOrderedList);
    this.context.memo('help.insertUnorderedList', this.lang.help.insertUnorderedList);
    this.context.memo('help.indent', this.lang.help.indent);
    this.context.memo('help.outdent', this.lang.help.outdent);
    this.context.memo('help.formatPara', this.lang.help.formatPara);
    this.context.memo('help.insertHorizontalRule', this.lang.help.insertHorizontalRule);
    this.context.memo('help.fontName', this.lang.help.fontName);

    // native commands(with execCommand), generate function for execCommand
    const commands = [
      'bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript',
      'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull',
      'formatBlock', 'removeFormat', 'backColor', 'code'
    ];

    const formatMap = {
      bold: 'bold',
      italic: 'italic',
      underline: 'underline',
      strikethrough: 'strikethrough',
      superscript: 'superscript',
      subscript: 'subscript',
      justifyLeft: 'alignleft',
      justifyCenter: 'aligncenter',
      justifyRight: 'alignright',
      justifyFull: 'alignfull',
      removeFormat: 'removeformat',
      code: 'code'
    };

    for (let idx = 0, len = commands.length; idx < len; idx++) {
      this[commands[idx]] = ((sCmd) => {
        return (value) => {
          this.beforeCommand();
          if (formatMap[sCmd]) {
            this.formatter.toggle(formatMap[sCmd]);
          }
          else {
            document.execCommand(sCmd, false, value);
          }
          this.afterCommand(true);
        };
      })(commands[idx]);
      this.context.memo('help.' + commands[idx], this.lang.help[commands[idx]]);
    }

    this.fontName = this.wrapCommand((value) => {
      return this.fontStyling('font-family', env.validFontName(value));
    });

    this.fontSize = this.wrapCommand((value) => {
      const unit = this.currentStyle()['font-size-unit'];
      return this.fontStyling('font-size', value + unit);
    });

    this.fontSizeUnit = this.wrapCommand((value) => {
      const size = this.currentStyle()['font-size'];
      return this.fontStyling('font-size', size + value);
    });

    for (let idx = 1; idx <= 6; idx++) {
      this['formatH' + idx] = ((idx) => {
        return () => {
          this.formatBlock('H' + idx);
        };
      })(idx);
      this.context.memo('help.formatH' + idx, this.lang.help['formatH' + idx]);
    }

    this.insertParagraph = this.wrapCommand(() => {
      this.typing.insertParagraph(this.editable);
    });

    this.insertOrderedList = this.wrapCommand(() => {
      this.bullet.insertOrderedList(this.editable);
    });

    this.insertUnorderedList = this.wrapCommand(() => {
      this.bullet.insertUnorderedList(this.editable);
    });

    this.indent = this.wrapCommand(() => {
      this.bullet.indent(this.editable);
    });

    this.outdent = this.wrapCommand(() => {
      this.bullet.outdent(this.editable);
    });

    /**
     * insertNode
     * insert node
     * @param {Node} node
     */
    this.insertNode = this.wrapCommand((node) => {
      if (this.isLimited($(node).text().length)) {
        return;
      }
      const rng = this.getLastRange();
      rng.insertNode(node);
      this.setLastRange(range.createFromNodeAfter(node).select());
    });

    /**
     * insert text
     * @param {String} text
     */
    this.insertText = this.wrapCommand((text) => {
      if (this.isLimited(text.length)) {
        return;
      }
      const rng = this.getLastRange();
      const textNode = rng.insertNode(dom.createText(text));
      this.setLastRange(range.create(textNode, dom.nodeLength(textNode)).select());
    });

    /**
     * paste HTML
     * @param {String} markup
     */
    this.pasteHTML = this.wrapCommand((markup) => {
      if (this.isLimited(markup.length)) {
        return;
      }
      markup = this.context.invoke('codeview.purify', markup);
      const contents = this.getLastRange().pasteHTML(markup);
      this.setLastRange(range.createFromNodeAfter(lists.last(contents)).select());
    });

    /**
     * formatBlock
     *
     * @param {String} tagName
     */
    this.formatBlock = this.wrapCommand((tagName, $target) => {
      console.log('formatBlock', tagName, $target)
      const onApplyCustomStyle = this.options.callbacks.onApplyCustomStyle;
      if (onApplyCustomStyle) {
        onApplyCustomStyle.call(this, $target, this.context, this.onFormatBlock);
      } else {
        this.onFormatBlock(tagName, $target);
      }
    });

    /**
     * insert horizontal rule
     */
    this.insertHorizontalRule = this.wrapCommand(() => {
      const hrNode = this.getLastRange().insertNode(dom.create('HR'));
      if (hrNode.nextSibling) {
        this.setLastRange(range.create(hrNode.nextSibling, 0).normalize().select());
      }
    });

    /**
     * lineHeight
     * @param {String} value
     */
    this.lineHeight = this.wrapCommand((value) => {
      this.style.stylePara(this.getLastRange(), {
        lineHeight: value,
      });
    });

    /**
     * create link (command)
     *
     * @param {Object} linkInfo
     */
    this.createLink = this.wrapCommand((linkInfo) => {
      let rels = [];
      let linkUrl = linkInfo.url;
      const linkText = linkInfo.text;
      const isNewWindow = linkInfo.isNewWindow;

      // handle spaced urls from input
      if (typeof linkUrl === 'string') {
        linkUrl = linkUrl.trim();
      }

      if (this.options.onCreateLink) {
        linkUrl = this.options.onCreateLink(linkUrl);
      } 
      else {
        linkUrl = this.checkLinkUrl(linkUrl) || linkUrl;
      }

      let anchors = [];

      if (linkInfo.img && !linkInfo.a) {
        // UNlinked image selected
        $(linkInfo.img).wrap('<a href="' + linkUrl + '"></a>');
        linkInfo.a = linkInfo.img.parentElement;
        anchors.push(linkInfo.a);
      }
      else if (linkInfo.img && linkInfo.a) {
        // linked image selected
        anchors.push(linkInfo.a);
      }
      else {
        let rng = linkInfo.range || this.getLastRange();
        const additionalTextLength = linkText.length - rng.toString().length;
        if (additionalTextLength > 0 && this.isLimited(additionalTextLength)) {
          return;
        }
        const isTextChanged = rng.toString() !== linkText;

        // Text selected
        if (isTextChanged) {
          rng = rng.deleteContents();
          const anchor = rng.insertNode($('<A></A>').text(linkText)[0]);
          anchors.push(anchor);
        } 
        else {
          anchors = this.style.styleNodes(rng, {
            nodeName: 'A',
            expandClosestSibling: true,
            onlyPartialContains: true,
          });
        }
      }

      $.each(anchors, (idx, a) => {
        a.setAttribute('href', linkUrl);

        if (linkInfo.rel) {
          a.rel = linkInfo.rel;
        }

        if (linkInfo.cssClasss) {
          a.className = linkInfo.cssClasss;
        }

        if (linkInfo.cssStyle) {
          a.style.cssText = linkInfo.cssStyle;
        }

        if (isNewWindow) {
          a.target = '_blank';
          
          if (!linkInfo.rel) {
            if (this.options.linkAddNoReferrer) {
              rels.push('noreferrer');
            }
            if (this.options.linkAddNoOpener) {
              rels.push('noopener');
            }
            if (rels.length) {
              a.rel = rels.join(' ');
            }
          }
        } 
        else {
          a.removeAttribute('target');
        }
      });

      this.setLastRange(
        this.createRangeFromList(anchors).select()
      );
    });

    /**
     * setting color
     *
     * @param {Object} sObjColor  color code
     * @param {String} sObjColor.foreColor foreground color
     * @param {String} sObjColor.backColor background color
     */
    this.color = this.wrapCommand((colorInfo) => {
      const foreColor = colorInfo.foreColor;
      const backColor = colorInfo.backColor;

      if (foreColor) { document.execCommand('foreColor', false, foreColor); }
      if (backColor) { document.execCommand('backColor', false, backColor); }
    });

    /**
     * Set foreground color
     *
     * @param {String} colorCode foreground color code
     */
    this.foreColor = this.wrapCommand((colorInfo) => {
      document.execCommand('foreColor', false, colorInfo);
    });

    /**
     * insert Table
     *
     * @param {String} dimension of table (ex : "5x5")
     */
    this.insertTable = this.wrapCommand((dim) => {
      const dimension = dim.split('x');

      const rng = this.getLastRange().deleteContents();
      rng.insertNode(this.table.createTable(dimension[0], dimension[1], this.options));
    });

    /**
     * remove media object and Figure Elements if media object is img with Figure.
     */
    this.removeMedia = this.wrapCommand(() => {
      let $target = $(this.restoreTarget()).parent();
      if ($target.closest('figure').length) {
        $target.closest('figure').remove();
      } else {
        $target = $(this.restoreTarget()).detach();
      }
      
      this.setLastRange(range.createFromSelection($target).select());
      this.context.triggerEvent('media.delete', $target, this.$editable);
    });

    /**
     * float me
     *
     * @param {String} value
     */
    this.floatMe = this.wrapCommand((value) => {
      const $target = $(this.restoreTarget())
      $target.removeClass('float-right float-left');
      if (value == 'left' || value == 'right') {
        $target.addClass('float-' + value);
      }
    });

    /**
     * resize overlay element
     * @param {String} value
     */
    this.resize = this.wrapCommand((value) => {
      const $target = $(this.restoreTarget());
      $target.css('width', '').css('height', '').removeClass('w-100 w-50 w-25');

      value = parseFloat(value);
      if (value > 0) {
        if (value === 0.25) {
          $target.addClass('w-25');
        }
        else if (value === 0.5) {
          $target.addClass('w-50');
        }
        else if (value === 1) {
          $target.addClass('w-100');
        }
        else {
          $target.css({width: value * 100 + '%'}); 
        }
      }
      
      this.cleanEmptyStyling($target);
    });
  }

  cleanEmptyStyling(node) {
    $(node).each((i, el) => {
      if (!el.className) {
        el.removeAttribute("class");
      }
      if (!el.style.cssText) {
        el.removeAttribute("style");
      }
    });
  }

  initialize() {
    // bind custom events
    this.$editable.on('keydown', (event) => {
      if (event.keyCode === key.code.ENTER) {
        this.context.triggerEvent('enter', event);
      }
      this.context.triggerEvent('keydown', event);

      // keep a snapshot to limit text on input event
      this.snapshot = this.history.makeSnapshot();
      this.hasKeyShortCut = false;
      if (!event.isDefaultPrevented()) {
        if (this.options.shortcuts) {
          this.hasKeyShortCut = this.handleKeyMap(event);
        } else {
          this.preventDefaultEditableShortCuts(event);
        }
      }
      if (this.isLimited(1, event)) {
        const lastRange = this.getLastRange();
        if (lastRange.eo - lastRange.so === 0) {
          return false;
        }
      }
      this.setLastRange();

      // record undo in the key event except keyMap.
      if (this.options.recordEveryKeystroke) {
        if (this.hasKeyShortCut === false) {
          this.history.recordUndo();
        }
      }
    }).on('keyup', (event) => {
      this.setLastRange();
      this.context.triggerEvent('keyup', event);
    }).on('focus', (event) => {
      this.setLastRange();
      this.$editor.addClass("focus");
      this.context.triggerEvent('focus', event);
    }).on('blur', (event) => {
      this.$editor.removeClass("focus");
      this.context.triggerEvent('blur', event);
    }).on('mousedown', (event) => {
      this.context.triggerEvent('mousedown', event);
    }).on('mouseup', (event) => {
      this.setLastRange();
      // Don't record undo on simple mouseup (?). Too noisy.
      //this.history.recordUndo();
      this.context.triggerEvent('mouseup', event);
    }).on('scroll', (event) => {
      this.context.triggerEvent('scroll', event);
    }).on('paste', (event) => {
      this.setLastRange();
      this.context.triggerEvent('paste', event);
    }).on('copy', (event) => {
      this.context.triggerEvent('copy', event);
    }).on('input', () => {
      // To limit composition characters (e.g. Korean)
      if (this.isLimited(0) && this.snapshot) {
        this.history.applySnapshot(this.snapshot);
      }
    });

    this.$editable.attr('spellcheck', this.options.spellCheck);

    this.$editable.attr('autocorrect', this.options.spellCheck);

    if (this.options.disableGrammar) {
      this.$editable.attr('data-gramm', false);
    }

    // init content before set event
    this.$editable.html(dom.html(this.$note) || dom.emptyPara);

    this.$editable.on(env.inputEventName, func.debounce(() => {
      this.context.triggerEvent('change', this.$editable.html(), this.$editable);
    }, 10));

    this.$editable.on('focusin', (event) => {
      this.context.triggerEvent('focusin', event);
    }).on('focusout', (event) => {
      this.context.triggerEvent('focusout', event);
    });

    if (this.options.airMode) {
      if (this.options.overrideContextMenu) {
        this.$editor.on('contextmenu', (event) => {
          this.context.triggerEvent('contextmenu', event);
          return false;
        });
      }
    } else {
      if (this.options.width) {
        this.$editor.outerWidth(this.options.width);
      }
      if (this.options.height) {
        this.$editable.outerHeight(this.options.height);
      }
      if (this.options.maxHeight) {
        this.$editable.css('max-height', this.options.maxHeight);
      }
      if (this.options.minHeight) {
        this.$editable.css('min-height', this.options.minHeight);
      }
    }

    this.selection.initialize();
    this.history.recordUndo();
    this.setLastRange();
  }

  destroy() {
    this.selection.destroy();
    this.$editable.off();
  }

  handleKeyMap(event) {
    const keyMap = this.options.keyMap[env.isMac ? 'mac' : 'pc'];
    const keys = [];

    if (event.metaKey) { keys.push('CMD'); }
    if (event.ctrlKey && !event.altKey) { keys.push('CTRL'); }
    if (event.shiftKey) { keys.push('SHIFT'); }

    const keyName = key.nameFromCode[event.keyCode];
    if (keyName) {
      keys.push(keyName);
    }

    const eventName = keyMap[keys.join('+')];

    if (keyName === 'TAB' && !this.options.tabDisable) {
      this.afterCommand();
    } else if (eventName) {
      if (this.context.invoke(eventName) !== false) {
        event.preventDefault();
        return true;
      }
    } else if (key.isEdit(event.keyCode)) {
      if (key.isRemove(event.keyCode)) {
        this.context.invoke('removed');
      }
      this.afterCommand();
    }
    return false;
  }

  preventDefaultEditableShortCuts(event) {
    // B(Bold, 66) / I(Italic, 73) / U(Underline, 85)
    if ((event.ctrlKey || event.metaKey) &&
      lists.contains([66, 73, 85], event.keyCode)) {
      event.preventDefault();
    }
  }

  isLimited(pad, event) {
    pad = pad || 0;

    if (typeof event !== 'undefined') {
      if (key.isMove(event.keyCode) ||
          key.isNavigation(event.keyCode) ||
          (event.ctrlKey || event.metaKey) ||
          lists.contains([key.code.BACKSPACE, key.code.DELETE], event.keyCode)) {
        return false;
      }
    }

    if (this.options.maxTextLength > 0) {
      if ((this.$editable.text().length + pad) > this.options.maxTextLength) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks link url. Returns empty string if url is valid.
   * @return {String}
   */
  checkLinkUrl(url) {
    url = url?.trim();

    if (url) {
      if (Str.isValidEmail(url)) {
        return 'mailto://' + url;
      } 
      else if (Str.isValidTel(url)) {
        return 'tel://' + url;
      } 
      else if (!Str.startsWithUrlScheme(url)) {
        // Grab only first part
        let url2 = url;
        let slashIndex = url2.indexOf('/');
        if (slashIndex > 1) {
          url2 = url2.substring(0, slashIndex);
        }

        if (Str.isValidHost(url2)) {
          return 'https://' + url;
        }
        else {
          var c = url[0];
          if (c === "/" || c === "~" || c === "\\" || c === "." || c === "#") {
            // Is an app (relative or absolute) path
            return url;
          }
        }
      }
    }

    return '';
  }

  /**
   * create range
   * @return {WrappedRange}
   */
  createRange() {
    this.focus();
    this.setLastRange();
    return this.getLastRange();
  }

  /**
   * create a new range from the list of elements
   *
   * @param {list} dom element list
   * @return {WrappedRange}
   */
  createRangeFromList(lst) {
    const startRange = range.createFromNodeBefore(lists.head(lst));
    const startPoint = startRange.getStartPoint();
    const endRange = range.createFromNodeAfter(lists.last(lst));
    const endPoint = endRange.getEndPoint();

    return range.create(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset
    );
  }

  /**
   * set the last range
   *
   * if given rng exist, set rng as the last range
   * or create a new range at the end of the document
   *
   * @param {WrappedRange} rng
   */
  setLastRange(rng) {
    if (rng) {
      this.lastRange = range.getWrappedRange(rng).cloneRange();
    } 
    else {
      this.lastRange = range.create(this.editable);

      if ($(this.lastRange.sc).closest('.note-editable').length === 0) {
        this.lastRange = range.createFromBodyElement(this.editable);
      }
    }
  }

  /**
   * get the last range
   *
   * if there is a saved last range, return it
   * or create a new range and return it
   *
   * @return {WrappedRange}
   */
  getLastRange() {
    if (!this.lastRange) {
      this.setLastRange();
    }
    return this.lastRange;
  }

  /**
   * saveRange
   *
   * save current range
   *
   * @param {Boolean} [thenCollapse=false]
   */
  saveRange(thenCollapse) {
    if (thenCollapse) {
      this.getLastRange().collapse().select();
    }
  }

  /**
   * restoreRange
   *
   * restore lately range
   */
  restoreRange() {
    if (this.lastRange) {
      this.lastRange.select();
      this.focus();
    }
  }

  getSelection() {
    return window.getSelection ? window.getSelection() : document.selection;
  }

  saveTarget(node) {
    this.$editable.data('target', node);
  }

  clearTarget() {
    this.$editable.removeData('target');
  }

  restoreTarget() {
    return this.$editable.data('target');
  }

  /**
   * currentStyle
   *
   * current style
   * @return {Object|Boolean} unfocus
   */
  currentStyle() {
    let rng = range.create();
    if (rng) {
      rng = rng.normalize();
    }

    return rng ? this.style.current(rng) : this.style.fromNode(this.$editable);
  }

  /**
   * style from node
   *
   * @param {jQuery} $node
   * @return {Object}
   */
  styleFromNode($node) {
    return this.style.fromNode($node);
  }

  /**
   * undo
   */
  undo() {
    this.context.triggerEvent('before.command', this.$editable.html());
    this.history.undo();
    this.context.triggerEvent('change', this.$editable.html(), this.$editable);
  }

  /*
  * commit
  */
  commit() {
    this.context.triggerEvent('before.command', this.$editable.html());
    this.history.commit();
    this.context.triggerEvent('change', this.$editable.html(), this.$editable);
  }

  /**
   * redo
   */
  redo() {
    this.context.triggerEvent('before.command', this.$editable.html());
    this.history.redo();
    this.context.triggerEvent('change', this.$editable.html(), this.$editable);
  }

  /**
   * before command
   */
  beforeCommand() {
    let rng = this.getLastRange();

    this.context.triggerEvent('before.command', this.$editable.html());

    // Set styleWithCSS before run a command
    document.execCommand('styleWithCSS', false, this.options.styleWithCSS);

    // keep focus on editable before command execution
    this.focus();
  }

  /**
   * after command
   * @param {Boolean} isPreventTrigger
   */
  afterCommand(isPreventTrigger) {
    this.normalizeContent();
    this.history.recordUndo();
    if (!isPreventTrigger) {
      this.context.triggerEvent('change', this.$editable.html(), this.$editable);
    }
  }

  /**
   * handle tab key
   */
  tab() {
    const rng = this.getLastRange();
    if (rng.collapsed && rng.isOnCell()) {
      this.table.tab(rng);
    } else {
      if (this.options.tabSize === 0) {
        return false;
      }

      if (!this.isLimited(this.options.tabSize)) {
        this.beforeCommand();
        this.typing.insertTab(rng, this.options.tabSize);
        this.afterCommand();
      }
    }
  }

  /**
   * handle shift+tab key
   */
  untab() {
    const rng = this.getLastRange();
    if (rng.collapsed && rng.isOnCell()) {
      this.table.tab(rng, true);
    } else {
      if (this.options.tabSize === 0) {
        return false;
      }
    }
  }

  /**
   * run given function between beforeCommand and afterCommand
   */
  wrapCommand(fn) {
    return function() {
      this.beforeCommand();
      fn.apply(this, arguments);
      this.afterCommand();
    };
  }
  /**
   * removed (function added by 1der1)
  */
  removed(rng, node, tagName) { // LB
		rng = range.create();
		if (rng.collapsed && rng.isOnCell()) {
			node = rng.ec;
			if( (tagName = node.tagName) &&
				(node.childElementCount === 1) &&
				(node.childNodes[0].tagName === "BR") ){

				if(tagName === "P") {
					node.remove();
				} else if(['TH', 'TD'].indexOf(tagName) >=0) {
					node.firstChild.remove();
				}
			}
		}
	}
  /**
   * insert image
   *
   * @param {String} src
   * @param {String|Function} param
   * @return {Promise}
   */
  insertImage(src, param) {
    return createImage(src, param).then(($image) => {
      this.beforeCommand();

      if (typeof param === 'function') {
        param($image);
      } else {
        if (typeof param === 'string') {
          $image.attr('data-filename', param);
        }
        $image.css('width', Math.min(this.$editable.width(), $image.width()));
      }

      $image.show();
      this.getLastRange().insertNode($image[0]);
      this.setLastRange(range.createFromNodeAfter($image[0]).select());
      this.afterCommand();
    }).fail((e) => {
      this.context.triggerEvent('image.upload.error', e);
    });
  }

  /**
   * insertImages
   * @param {File[]} files
   */
  insertImagesAsDataURL(files) {
    $.each(files, (idx, file) => {
      const filename = file.name;
      if (this.options.maximumImageFileSize && this.options.maximumImageFileSize < file.size) {
        this.context.triggerEvent('image.upload.error', this.lang.image.maximumFileSizeError);
      } else {
        readFileAsDataURL(file).then((dataURL) => {
          return this.insertImage(dataURL, filename);
        }).fail(() => {
          this.context.triggerEvent('image.upload.error');
        });
      }
    });
  }

  /**
   * insertImagesOrCallback
   * @param {File[]} files
   */
  insertImagesOrCallback(files) {
    const callbacks = this.options.callbacks;
    // If onImageUpload set,
    if (callbacks.onImageUpload) {
      this.context.triggerEvent('image.upload', files);
      // else insert Image as dataURL
    } else {
      this.insertImagesAsDataURL(files);
    }
  }

  /**
   * return selected plain text
   * @return {String} text
   */
  getSelectedText() {
    let rng = this.getLastRange();

    // if range on anchor, expand range with anchor
    if (rng.isOnAnchor()) {
      rng = range.createFromNode(dom.ancestor(rng.sc, dom.isAnchor));
    }

    return rng.toString();
  }

  /**
   * Finds the custom css class to apply to tagName nodes.
   */
  getTagStyleClass(tagName) {
    let styleTag = lists.find(this.options.styleTags, x => $.isPlainObject(x) && x.tag.toUpperCase() == tagName.toUpperCase());
    return styleTag?.className;
  }

  onFormatBlock(tagName, $target) {
    this.formatter.toggle(tagName.toLowerCase());
    return;

    let rng = this.createRange();
    let paraNode = dom.findPara(rng.sc);
    let newNode;
    
    if (paraNode) {
      const currentTagName = paraNode.tagName.toUpperCase();

      if (currentTagName == 'LI') {
        // TODO: wrap inner HTML with new tag
      }
      else if (currentTagName != tagName.toUpperCase()) {
        const currentStyleClass = this.getTagStyleClass(currentTagName);
        //console.log(currentStyleClass);
        // Change tag name of found para
        newNode = dom.rename(paraNode, tagName);
        if (newNode && currentStyleClass) {
          // Remove tag styling class
          $(newNode).removeClass(currentStyleClass);
        }

        rng.select();

        // TODO: Implement custom class support.
      }
    }
    else {
      // TODO: What now?
    }

    // Support custom class
    if (newNode) {
      const newStyleClass = this.getTagStyleClass(tagName);
      if (newStyleClass) {
        $(newNode).addClass(newStyleClass);
      }
    }

    // TODO: Creating a new block with ENTER should not copy all attributes from prev block
  }

  onFormatBlock_Old(tagName, $target) {
    // Remove onFormatBlock_Old method
    let currentRange = this.createRange();
    let $block = $([currentRange.sc, currentRange.ec]).closest(tagName);

    // Memoize all attributes of current block before command execution,
    // most of them will be lost after command.
    let attrs = {};
    if ($block.length) {
      for (const attr of $block[0].attributes) {
        if (attr.value) {
          attrs[attr.name] = attr.value;
        }
      }
    }

    // [workaround] for MSIE, IE need `<`
    document.execCommand('FormatBlock', false, env.isMSIE ? '<' + tagName + '>' : tagName);

    currentRange = this.createRange();
    $block = $([currentRange.sc, currentRange.ec]).closest(tagName);

    // Apply all memoized attributes to new block
    if (attrs.hasOwnProperty() && $block?.length) {
      Object.keys(attrs).forEach((key) => {
        $block[0].setAttribute(key, attrs[key]);
      });
    }

    // Support custom class
    if ($target?.length) {
      // Find the exact element that has given tagName
      if ($target[0].tagName.toUpperCase() !== tagName.toUpperCase()) {
        $target = $target.find(tagName);
      }

      if ($target?.length) {
        const className = $target[0].className || '';
        if (className) {
          $block.addClass(className);
        }
      }
    }

    // Cleam empty class or style
    this.cleanEmptyStyling($block);
  }

  formatPara() {
    this.formatBlock('P');
  }

  fontStyling(target, value) {
    const rng = this.getLastRange();

    if (rng !== '') {
      const spans = this.style.styleNodes(rng);
      this.$editor.find('.note-status-output').html('');
      $(spans).css(target, value);

      // [workaround] added styled bogus span for style
      //  - also bogus character needed for cursor position
      if (rng.collapsed) {
        const firstSpan = lists.head(spans);
        if (firstSpan && !dom.nodeLength(firstSpan)) {
          firstSpan.innerHTML = Point.ZERO_WIDTH_NBSP_CHAR;
          range.createFromNode(firstSpan.firstChild).select();
          this.setLastRange();
          this.$editable.data(KEY_BOGUS, firstSpan);
        }
      } else {
        rng.select();
      }
    } else {
      const noteStatusOutput = $.now();
      this.$editor.find('.note-status-output').html('<div id="note-status-output-' + noteStatusOutput + '" class="alert alert-info">' + this.lang.output.noSelection + '</div>');
      setTimeout(function() { $('#note-status-output-' + noteStatusOutput).remove(); }, 5000);
    }
  }

  /**
   * unlink
   *
   * @type command
   */
  unlink() {
    let img = $(this.$editable.data('target'));
    if (img.is('img') && img.parent().is('a')) {
      // Special handling for image unlinking
      this.beforeCommand();
      img.unwrap();
      this.afterCommand(true);
      this.context.modules.imagePopover.hide();
    }
    else {
      let rng = this.getLastRange();
      if (rng.isOnAnchor()) {
        const anchor = dom.ancestor(rng.sc, dom.isAnchor);
        rng = range.createFromNode(anchor);
        rng.select();
        this.setLastRange();
  
        this.beforeCommand();
        document.execCommand('unlink');
        this.afterCommand();
      }
    }
  }

  /**
   * returns link info
   *
   * @return {Object}
   * @return {WrappedRange} return.range
   * @return {String} return.text
   * @return {Boolean} [return.isNewWindow=true]
   * @return {String} [return.url=""]
   */
  getLinkInfo() {
    let img, a, rng;

    img = this.$editable.data('target')
    if (img?.parentElement?.matches('a')) {
      // First check if a linked image is selected
      a = img.parentElement;
      rng = range.create(a, 0, a, a.childNodes.length);
    }

    if (!rng) {
      rng = this.getLastRange().expand(dom.isAnchor);
    }

    if (!a) {
      // Get the first anchor on range (for edit).
      a = lists.head(rng.nodes(dom.isAnchor));
    }

    const linkInfo = {
      range: rng,
      a: a,
      img: img,
      text: img ? null : rng.toString()
    };

    if (a) {
      linkInfo.url = a.getAttribute('href');
      linkInfo.cssClass = a.className;
      linkInfo.cssStyle = a.style.cssText;
      linkInfo.rel = a.rel;
      linkInfo.isNewWindow = a.target == '_blank';
    }

    return linkInfo;
  }

  addRow(position) {
    const rng = this.getLastRange(this.$editable);
    if (rng.collapsed && rng.isOnCell()) {
      this.beforeCommand();
      this.table.addRow(rng, position);
      this.afterCommand();
    }
  }

  addCol(position) {
    const rng = this.getLastRange(this.$editable);
    if (rng.collapsed && rng.isOnCell()) {
      this.beforeCommand();
      this.table.addCol(rng, position);
      this.afterCommand();
    }
  }

  deleteRow() {
    const rng = this.getLastRange(this.$editable);
    if (rng.collapsed && rng.isOnCell()) {
      this.beforeCommand();
      this.table.deleteRow(rng);
      this.afterCommand();
    }
  }

  deleteCol() {
    const rng = this.getLastRange(this.$editable);
    if (rng.collapsed && rng.isOnCell()) {
      this.beforeCommand();
      this.table.deleteCol(rng);
      this.afterCommand();
    }
  }

  deleteTable() {
    const rng = this.getLastRange(this.$editable);
    if (rng.collapsed && rng.isOnCell()) {
      this.beforeCommand();
      this.table.deleteTable(rng);
      this.afterCommand();
    }
  }

  /**
   * @param {Position} pos
   * @param {jQuery} $target - target element
   * @param {Boolean} [bKeepRatio] - keep ratio
   */
  resizeTo(pos, $target, bKeepRatio) {
    let imageSize;
    if (bKeepRatio) {
      const newRatio = pos.y / pos.x;
      const ratio = $target.data('ratio');
      imageSize = {
        width: ratio > newRatio ? pos.x : pos.y / ratio,
        height: ratio > newRatio ? pos.x * ratio : pos.y,
      };
    } else {
      imageSize = {
        width: pos.x,
        height: pos.y,
      };
    }

    $target.css(imageSize);
  }

  /**
   * returns whether editable area has focus or not.
   */
  hasFocus() {
    return this.$editable.is(':focus');
  }

  /**
   * set focus
   */
  focus() {
    // [workaround] Screen will move when page is scolled in IE.
    //  - do focus when not focused
    if (!this.hasFocus()) {
      this.$editable.trigger('focus');
    }
  }

  /**
   * returns whether contents is empty or not.
   * @return {Boolean}
   */
  isEmpty() {
    return dom.isEmpty(this.$editable[0]) || dom.emptyPara === this.$editable.html();
  }

  /**
   * Removes all contents and restores the editable instance to an _emptyPara_.
   */
  empty() {
    this.context.invoke('code', dom.emptyPara);
  }

  /**
   * normalize content
   */
  normalizeContent() {
    this.$editable[0].normalize();
  }

  showPopover($popover, target, placement = 'top') {
    if ($popover?.length) {
      let popper = $popover.data('popper');
      if (popper) {
        popper.destroy();
      }
      popper = new Popper(target, $popover[0], {
        placement: placement,
        modifiers: {
          computeStyle: { gpuAcceleration: false },
          arrow: { element: '.arrow' },
          preventOverflow: { boundariesElement: this.$editable[0] }
        }
      });

      popper.scheduleUpdate();
      this.context.triggerEvent('popover.shown');
      $popover.data('popper', popper).show();
    }
  }

  hidePopover($popover) {
    if ($popover?.length) {
      const popper = $popover.data('popper');
      if (popper) {
        popper.destroy();
        $popover.removeData('popper');     
      }
  
      $popover.hide();
    }
  }
}
