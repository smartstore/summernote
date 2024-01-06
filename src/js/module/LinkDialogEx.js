import $ from 'jquery';
import env from '../core/env';
import key from '../core/key';
import func from '../core/func';

const MAILTO_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const TEL_PATTERN = /^(\+?\d{1,3}[\s-]?)?(\d{1,4})[\s-]?(\d{1,4})[\s-]?(\d{1,4})$/;
const URL_SCHEME_PATTERN = /^([A-Za-z][A-Za-z0-9+-.]*\:|#|\/)/;

export default class LinkDialog {
  constructor(context) {
    this.context = context;

    this.ui = $.summernote.ui;
    this.$body = $(document.body);
    this.$editor = context.layoutInfo.editor;
    this.options = context.options;
    this.lang = this.options.langInfo;
    this.editor = context.modules.editor;

    const buttons = context.modules.buttons;

    context.memo('help.linkDialog.show', this.options.langInfo.help['linkDialog.show']);

    context.memo('button.link', () => {
      return this.ui.button({
        contents: this.ui.icon(this.options.icons.link),
        callback: function (btn) {
          btn.data("placement", "bottom");
          btn.data("trigger", "hover");
          btn.attr("title", this.lang.link.link + buttons.representShortcut('linkDialog.show'));
          btn.tooltip();
        },
        click: function () {
          this.show();
        }
      }).render();
    });

    // Create custom "unlink image" button for the image popover
    context.memo('button.unlinkImage', () => {
      return this.ui.button({
        contents: this.ui.icon(this.options.icons.unlink),
        className: 'btn-unlink-image',
        callback: function (btn) {
          btn.data("placement", "bottom");
          btn.data("trigger", "hover");
          //btn.attr("title", this.lang.link.unlink);
          btn.tooltip();
        },
        click: () => {
          this.unlinkImage();
        }
      }).render();
    });
  }

  initialize() {
    const $container = this.options.dialogsInBody ? this.$body : this.options.container;
    const body = [
      '<div class="form-group note-form-group">',
      '	<label class="note-form-label">URL</label>',
      '	<div class="input-group">',
      '		<input id="note-link-url" class="note-link-url form-control note-form-control note-input" type="text" value="http://" />',
      '		<div class="input-group-append">',
      '			<button class="btn btn-secondary btn-browse" type="button">' + this.lang.link.browse + '...</button>',
      '		</div>',
      '	</div>',
      '</div>',
      '<div class="form-group note-form-group form-group-text">',
      '	<label class="note-form-label">' + this.lang.link.textToDisplay + '</label>',
      '	<input class="note-link-text form-control note-form-control note-input" type="text" />',
      '</div>',
      '<div class="form-group note-form-group">',
      '	<label class="note-form-label">' + this.lang.attrs.cssClass + '</label>',
      '	<input class="note-link-class form-control note-form-control note-input" type="text" />',
      '</div>',
      '<div class="form-group note-form-group">',
      '	<label class="note-form-label">' + this.lang.attrs.cssStyle + '</label>',
      '	<input class="note-link-style form-control note-form-control note-input" type="text" />',
      '</div>',
      '<div class="form-group note-form-group">',
      '	<label class="note-form-label">' + this.lang.attrs.rel + ' <small class="text-muted">(alternate, author, help, license, next, nofollow, noreferrer, prefetch, prev,...)</small></label>',
      '	<input class="note-link-rel form-control note-form-control note-input" type="text" />',
      '</div>',
      !this.options.disableLinkTarget
        ? $('<div></div>').append(this.ui.checkbox({
          id: 'sn-checkbox-open-in-new-window',
          className: 'form-switch note-new-window',
          text: this.lang.link.openInNewWindow,
          checked: true
        }).render()).html()
        : '',
    ].join('');

    const buttonClass = 'btn btn-primary note-btn note-btn-primary note-link-btn';
    const footer = [
      '<button type="button" class="btn btn-secondary btn-flat" data-dismiss="modal">' + Res['Common.Cancel'] + '</button>',
      '<button type="submit" class="' + buttonClass + '" disabled>' + Res['Common.OK'] + '</button>',
    ].join('');

    this.$dialog = this.ui.dialog({
      className: 'link-dialog',
      title: this.lang.link.link,
      fade: this.options.dialogsFade,
      body: body,
      footer: footer,
    }).render().appendTo($container);

    this.handleUnlinkButtonState();
  }

  // Hack: toggle our custom "unlink image" button when
  // imagePopover is about to be shown.
  handleUnlinkButtonState() {
    const popover = this.context.modules.imagePopover;

    // save the original summernote method
    const fnImagePopoverUpdate = popover.update;

    // decorate the original method with our cusrom stuff
    popover.update = (target, e) => {
      const btn = popover.$popover.find('.btn-unlink-image');
      const isLinkedImage = $(target).is('img') && $(target).parent().is('a');

      // hide/show the unlink button depending on current selection
      btn.toggle(isLinkedImage);

      // Call the original summernote method
      fnImagePopoverUpdate.apply(popover, [target, e]);
    };
  }

  // Unlinks a linked image from image popover
  unlinkImage(btn) {
    var img = $(this.context.layoutInfo.editable.data('target'));
    
    if (img.is('img') && img.parent().is('a')) {
      img.unwrap();
      
      // Ensure that SN saves the change
      this.context.layoutInfo.note.val(this.context.invoke('code'));
      this.context.layoutInfo.note.change();

      // Hide the popover
      var popover = this.context.modules.imagePopover;
      popover.hide();
    }
  }

  destroy() {
    this.ui.hideDialog(this.$dialog);
    this.$dialog.remove();
  }

  bindEnterKey($btn) {
    this.$dialog.find('.note-input').on('keypress.linkDialog', (e) => {
      if (e.keyCode === key.code.ENTER) {
        e.preventDefault();
        e.stopPropagation();
        $btn.trigger('click');
        return false;
      }
    });
  }

  setAttribute(a, el, name) {
    var val = el.val();
    if (val)
      a.attr(name, val)
    else
      a.removeAttr(name);
  }

  createLinkRange(a) {
    var sc = a[0];
    var so = 0;
    var ec = a[0];
    var eo = a[0].childNodes.length;

    // Create range and assign points again.
    // Something is wrong with Summernote's createRange method.
    var rng = this.editor.createRange(sc, so, ec, eo);
    rng.sc = sc;
    rng.so = so;
    rng.ec = ec;
    rng.eo = eo;

    return rng;
  }

  checkLinkUrl(linkUrl) {
    if (MAILTO_PATTERN.test(linkUrl)) {
      return 'mailto://' + linkUrl;
    } else if (TEL_PATTERN.test(linkUrl)) {
      return 'tel://' + linkUrl;
    } else if (!URL_SCHEME_PATTERN.test(linkUrl)) {
      return 'http://' + linkUrl;
    }
    return linkUrl;
  }

  onCheckLinkUrl($input) {
    $input.on('blur', (event) => {
      event.target.value =
        event.target.value == '' ? '' : this.checkLinkUrl(event.target.value);
    });
  }

  /**
   * toggle update button
   */
  toggleLinkBtn($linkBtn, $linkText, $linkUrl) {
    this.ui.toggleBtn($linkBtn, $linkText.val() && $linkUrl.val());
  }

  /**
   * @param {Object} layoutInfo
   */
  show () {
    let linkInfo, a;
    let img = $(this.context.layoutInfo.editable.data('target'));
    if (img.length) {
      // Hide "text" control
      this.$dialog.find('.form-group-text').hide();

      a = img.parent();
      if (a.is("a")) {
        linkInfo = {
          a: a, // indicates that an existing link should be edited
          img: img,
          range: this.createLinkRange(a),
          url: a.attr('href'),
          cssClass: a.attr("class"),
          cssStyle: a.attr("style"),
          rel: a.attr("rel"),
          isNewWindow: a.attr('target') === '_blank'
        };
      }
    }
    else {
      this.$dialog.find('.form-group-text').show();
    }

    if (!linkInfo) {
      linkInfo = this.context.invoke('editor.getLinkInfo');
      if (img.length) {
        linkInfo.img = img;
      }
      a = $(this.findLinkInRange(linkInfo.range));
      if (a.length) {
        linkInfo.cssClass = a.attr("class");
        linkInfo.cssStyle = a.attr("style");
        linkInfo.rel = a.attr("rel");
      }
    }

    this.context.invoke('editor.saveRange');
    this.showLinkDialog(linkInfo).then((linkInfo) => {
      let enteredUrl = this.$dialog.find('.note-link-url').val();

      if (this.options.onCreateLink) {
        enteredUrl = this.options.onCreateLink(enteredUrl);
      }

      this.context.invoke('editor.restoreRange');

      if (linkInfo.img && !linkInfo.a) {
        // UNlinked image selected
        linkInfo.img.wrap('<a href="' + enteredUrl + '"></a>');
        a = linkInfo.a = linkInfo.img.parent();
        linkInfo.range = this.createLinkRange(a);
      }
      else if (linkInfo.img && linkInfo.a) {
        // linked image selected
        a = linkInfo.a;
        a.attr("href", enteredUrl);
      }
      else {
        // (Un)linked selected text... let SN process the link
        this.context.invoke('editor.createLink', linkInfo);
      }			

      // add our custom attributes
      if (a.length) {
        this.setAttribute(a, this.$dialog.find('.note-link-class'), 'class');
        this.setAttribute(a, this.$dialog.find('.note-link-style'), 'style');
        this.setAttribute(a, this.$dialog.find('.note-link-rel'), 'rel');
        if (linkInfo.img) {
          if (linkInfo.isNewWindow) {
            a.attr('target', '_blank');
          }
          else {
            a.removeAttr('target');
          }
        }
      }

      if (linkInfo.img) {
        // Ensure that SN saves the change
        this.context.layoutInfo.note.val(this.context.invoke('code'));
        this.context.layoutInfo.note.change();
      }
    }).fail(() => {
      this.context.invoke('editor.restoreRange');
    });
  };

  findLinkInRange(rng) {
    var test = [rng.sc, rng.ec, rng.sc.nextSibling, rng.ec.nextSibling, rng.ec.parentNode, rng.ec.parentNode];

    for (var i = 0; i < test.length; i++) {
      if (test[i]) {
        if ($(test[i]).is("a")) {
          return test[i];
        }
      }
    }
  }

  /**
   * Show link dialog and set event handlers on dialog controls.
   *
   * @param {Object} linkInfo
   * @return {Promise}
   */
  showLinkDialog(linkInfo) {
    var $linkText = this.$dialog.find('.note-link-text');
    var $linkUrl = this.$dialog.find('.note-link-url');
    var $linkClass = this.$dialog.find('.note-link-class');
    var $linkStyle = this.$dialog.find('.note-link-style');
    var $linkRel = this.$dialog.find('.note-link-rel');
    var $linkBtn = this.$dialog.find('.note-link-btn');
    var $openInNewWindow = this.$dialog.find('#sn-checkbox-open-in-new-window');
    var $fileBrowse = this.$dialog.find('.btn-browse');

    // if no url was given, copy text to url
    if (!linkInfo.url) {
      linkInfo.url = linkInfo.text;
    }
    $linkText.val(linkInfo.text);
    $linkClass.val(linkInfo.cssClass);
    $linkStyle.val(linkInfo.cssStyle);
    $linkRel.val(linkInfo.rel);

    const toggleLinkBtn = () => {
      var enable = $linkUrl.val();
      if (!linkInfo.img) {
        enable = !!(enable) && !!($linkText.val());
      }
      this.ui.toggleBtn($linkBtn, enable);
    };
    const handleLinkTextUpdate = () => {
      // if linktext was modified by keyup,
      // stop cloning text from linkUrl
      linkInfo.text = $linkText.val();
      toggleLinkBtn();
    };
    const handleLinkUrlUpdate = () => {
      // display same link on `Text to display` input
      // when create a new link
      if (!linkInfo.text) {
        $linkText.val($linkUrl.val());
      }
      toggleLinkBtn();
    };

    $linkText.on('input.linkDialog', handleLinkTextUpdate);
    $linkUrl.on('input.linkDialog', handleLinkUrlUpdate).val(linkInfo.url);

    toggleLinkBtn();

    var isChecked = linkInfo.isNewWindow !== undefined
      ? linkInfo.isNewWindow
      : this.options.linkTargetBlank;
    $openInNewWindow.prop('checked', isChecked);

    return $.Deferred((deferred) => {
      this.ui.onDialogShown(this.$dialog, () => {
        this.context.triggerEvent('dialog.shown');

        $fileBrowse.on('click.linkDialog', (e) => {
          e.preventDefault();

          Smartstore.media.openFileManager({
            el: e.target,
            backdrop: false,
            onSelect: (files) => {
              if (!files.length) return;
              $linkUrl.val(files[0].url).trigger('change').trigger('input');
            }
          });
        });

        if (typeof Modernizr !== "undefined" && !Modernizr.touchevents) {
          $linkUrl.trigger('focus');
        }

        this.bindEnterKey($linkBtn);

        $linkBtn.one('click.linkDialog', (e) => {
          e.preventDefault();
          deferred.resolve({
            img: linkInfo.img,
            a: linkInfo.a,
            range: linkInfo.range,
            url: $linkUrl.val(),
            text: $linkText.val(),
            cssClasss: $linkClass.val(),
            cssStyle: $linkStyle.val(),
            rel: $linkRel.val(),
            isNewWindow: $openInNewWindow.is(':checked')
          });
          this.ui.hideDialog(this.$dialog);
        });
      });
      this.ui.onDialogHidden(this.$dialog, () => {
        // detach events
        this.$dialog.find('.note-input').off('keypress');
        $linkText.off('input');
        $linkUrl.off('input');
        $linkBtn.off('click');
        $fileBrowse.off('click');
        if (deferred.state() === 'pending') {
          deferred.reject();
        }
      });
      this.ui.showDialog(this.$dialog);
    }).promise();
  };
}
