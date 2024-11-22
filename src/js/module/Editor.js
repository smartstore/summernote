import $ from 'jquery';
import Str from '../core/Str';
import env from '../core/env';
import key from '../core/key';
import func from '../core/func';
import lists from '../core/lists';
import dom from '../core/dom';
import range from '../core/range';
import Point from '../core/Point';
import Obj from '../core/Obj';
import { readFileAsDataURL, createImage } from '../core/async';
import History from '../editing/History';
import Style from '../editing/Style';
import Typing from '../editing/Typing';
import Table from '../editing/Table';
import Bullet from '../editing/Bullet';
import Selection from '../editing/Selection';
//import Formatter from '../fmt/Formatter';
import HtmlSanitizer from '../util/HtmlSanitizer';

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
    this.snapshot = null;

    this.table = new Table(context);
    this.bullet = new Bullet(context);
    this.typing = new Typing(context, this.bullet);
    this.history = new History(context);
    //this.formatter = new Formatter(context);
    this.style = new Style(context);
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

    // Native commands (with execCommand), generate function for execCommand
    const commands = [
      'bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'code',
      'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull',
      'formatBlock', 'removeFormat', 'backColor',
    ];

    for (let idx = 0, len = commands.length; idx < len; idx++) {
      this[commands[idx]] = ((sCmd) => {
        return (value) => {
          this.beforeCommand();
          document.execCommand(sCmd, false, value);
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

    this.insertParagraph = this.wrapCommand((rng) => {
      this.typing.insertParagraph(rng);
    });

    this.insertOrderedList = this.wrapCommand((rng) => {
      this.bullet.insertOrderedList(rng);
    });

    this.insertUnorderedList = this.wrapCommand((rng) => {
      this.bullet.insertUnorderedList(rng);
    });

    this.indent = this.wrapCommand((rng) => {
      this.bullet.indent(rng);
    });

    this.outdent = this.wrapCommand((rng) => {
      this.bullet.outdent(rng);
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
      const rng = this.selection.getRange();
      rng.insertNode(node);
      this.selection.setRange(range.createFromNodeAfter(node));
    });

    /**
     * Inserts text
     * @param {String} text
     */
    this.insertText = this.wrapCommand((text) => {
      if (this.isLimited(text.length)) {
        return;
      }
      const rng = this.selection.getRange();
      const textNode = rng.insertNode(dom.createText(text));
      this.selection.setRange(range.create(textNode, dom.nodeLength(textNode)));
    });

    /**
     * paste HTML
     * @param {String} markup
     */
    this.pasteHTML = this.wrapCommand((markup) => {
      this.selection.pasteContent(markup);
    });

    /**
     * formatBlock
     *
     * @param {String} tagName
     */
    this.formatBlock = this.wrapCommand((tagName, $target) => {
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
      const hrNode = this.selection.getRange().insertNode(dom.create('HR'));
      if (hrNode.nextSibling) {
        this.selection.setRange(range.create(hrNode.nextSibling, 0).normalize());
      }
    });

    /**
     * lineHeight
     * @param {String} value
     */
    this.lineHeight = this.wrapCommand((value) => {
      this.style.stylePara(this.selection.getRange(), {
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
        let rng = linkInfo.range || this.selection.getRange();
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

      this.selection.setRange(range.createFromNodes(anchors));
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

      const rng = this.selection.getRange().deleteContents();
      rng.insertNode(this.table.createTable(dimension[0], dimension[1], this.options));
      // TODO: Where to put cursor after TABLE create?
    });

    /**
     * Remove media object and Figure Elements if media object is img with Figure.
     */
    this.removeMedia = this.wrapCommand(() => {
      let $target = $(this.restoreTarget()).parent();
      if ($target.closest('figure').length) {
        $target.closest('figure').remove();
      } else {
        $target = $(this.restoreTarget()).detach();
      }
      
      this.selection.setRange(range.createFromSelection($target));
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
    this.selection.initialize(this);

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
        const rng = this.selection.getRange();
        if (rng.eo - rng.so === 0) {
          return false;
        }
      }

      // record undo in the key event except keyMap.
      if (this.options.recordEveryKeystroke) {
        if (this.hasKeyShortCut === false) {
          this.history.recordUndo();
        }
      }
    }).on('keyup mousedown mouseup copy paste copy focus blur scroll', (e) => {
      // Pass all events
      this.context.triggerEvent(e.type, e);
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
    this.$editable.html(dom.value(this.$note) || dom.emptyPara);

    this.$editable.on(env.inputEventName, func.debounce(() => {
      this.context.triggerEvent('change', this.$editable);
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

    this.history.recordUndo();
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
    if (keyName === 'TAB' && this.options.tabDisable) {
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
   * Creates range at end of editor document.
   * @return {WrappedRange}
   */
  createRange() {
    this.focus();
    return this.selection.getRange();
  }

  setLastRange(rng) {
    // Compat
    this.selection.setBookmark(rng);
  }

  getLastRange() {
    // Compat
    if (!this.selection.bookmark) {
      this.selection.setBookmark();
    }
    return this.selection.bookmark;
  }

  saveRange(thenCollapse) {
    // Compat
    if (thenCollapse) {
      this.selection.collapse();
    }
  }

  restoreRange() {
    // Compat
    this.selection.restoreBookmark();
  }

  html(sanitize) {
    let html = this.$editable.html();
    // TODO: How to deal with both opts sanitize & prettify?
    const sanitizeOption = Obj.valueOrDefault(this.options.sanitizeHtml, this.options.prettifyHtml);
    if (Obj.valueOrDefault(sanitize, sanitizeOption)) {
      html = HtmlSanitizer.sanitizeHtml(this.context, html);
    }
    return html;
  }

  saveTarget(node) {
    this.selection.selectedControl = node;
  }

  clearTarget() {
    this.selection.selectedControl = null;
  }

  restoreTarget() {
    return this.selection.selectedControl;
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
      return this.style.current(rng);
    }

    return this.style.fromNode(this.$editable);
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
    this.context.triggerEvent('before.command', this.$editable);
    this.history.undo();
    this.context.triggerEvent('change', this.$editable);
  }

  /*
  * commit
  */
  commit() {
    this.context.triggerEvent('before.command', this.$editable);
    this.history.commit();
    this.context.triggerEvent('change', this.$editable);
  }

  /**
   * redo
   */
  redo() {
    this.context.triggerEvent('before.command', this.$editable);
    this.history.redo();
    this.context.triggerEvent('change', this.$editable);
  }

  /**
   * before command
   */
  beforeCommand() {
    this.context.triggerEvent('before.command', this.$editable);

    // Set styleWithCSS before run a command
    document.execCommand('styleWithCSS', false, this.options.styleWithCSS);

    // keep focus on editable before command execution
    this.focus();
  }

  /**
   * after command
   * @param {Boolean} silent
   */
  afterCommand(silent) {
    this.normalizeContent();
    this.history.recordUndo();
    if (!silent) {
      this.context.triggerEvent('change', this.$editable);
    }
  }

  /**
   * handle tab key
   */
  tab() {
    const rng = this.selection.getRange();
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
    const rng = this.selection.getRange();
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
      this.selection.getRange().insertNode($image[0]);
      this.selection.setRange(range.createFromNodeAfter($image[0]));
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
   * Returns selected plain text
   * @return {String} text
   */
  getSelectedText() {
    // Compat
    return this.selection.getTextContent();
  }

  /**
   * Finds the custom css class to apply to tagName nodes.
   */
  getTagStyleClass(tagName) {
    let styleTag = lists.find(this.options.styleTags, x => $.isPlainObject(x) && x.tag.toUpperCase() == tagName.toUpperCase());
    return styleTag?.className;
  }

  // onFormatBlock_New(tagName) {
  //   this.formatter.toggle(tagName.toLowerCase());
  //   // TODO: Creating a new block with ENTER should not copy all attributes from prev block
  // }

  onFormatBlock(tagName, $target) {
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

    // Clean empty class or style
    this.cleanEmptyStyling($block);
  }

  formatPara() {
    this.formatBlock('P');
  }

  fontStyling(target, value) {
    const rng = this.selection.getRange();

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
          this.selection.setRange(range.createFromNode(firstSpan.firstChild));
          this.$editable.data(KEY_BOGUS, firstSpan);
        }
      } else {
        this.selection.setRange(rng);
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
    let img = $(this.selection.selectedControl);
    if (img.is('img') && img.parent().is('a')) {
      // Special handling for image unlinking
      this.beforeCommand();
      img.unwrap();
      this.afterCommand(true);
      this.context.modules.imagePopover.hide();
    }
    else {
      let rng = this.selection.getRange();
      if (rng.isOnAnchor()) {
        const anchor = dom.ancestor(rng.sc, dom.isAnchor);
        rng = range.createFromNode(anchor);
        this.selection.setRange(rng);
  
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
    if (!this.hasFocus()) {
      this.focus();
    }

    let img, a, rng;

    img = this.selection.selectedControl;
    if (img?.parentElement?.matches('a')) {
      // First check if a linked image is selected
      a = img.parentElement;
      rng = range.create(a, 0, a, a.childNodes.length);
    }

    if (!rng) {
      rng = this.selection.getRange().expand(dom.isAnchor);
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
    const rng = this.selection.getRange();
    if (rng.collapsed && rng.isOnCell()) {
      this.beforeCommand();
      this.table.addRow(rng, position);
      this.afterCommand();
    }
  }

  addCol(position) {
    const rng = this.selection.getRange();
    if (rng.collapsed && rng.isOnCell()) {
      this.beforeCommand();
      this.table.addCol(rng, position);
      this.afterCommand();
    }
  }

  deleteRow() {
    const rng = this.selection.getRange();
    if (rng.collapsed && rng.isOnCell()) {
      this.beforeCommand();
      this.table.deleteRow(rng);
      this.afterCommand();
    }
  }

  deleteCol() {
    const rng = this.selection.getRange();
    if (rng.collapsed && rng.isOnCell()) {
      this.beforeCommand();
      this.table.deleteCol(rng);
      this.afterCommand();
    }
  }

  deleteTable() {
    const rng = this.selection.getRange();
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
