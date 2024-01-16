import $ from 'jquery';
import env from '../core/env';
import key from '../core/key';
import func from '../core/func';
import dom from '../core/dom';

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
  }

  initialize() {
    const $container = this.options.dialogsInBody ? this.$body : this.options.container;
    const body = [
      '<div class="form-group note-form-group">',
      `	<label for="note-dialog-link-txt-${this.options.id}" class="note-form-label">URL</label>`,
      '	<div class="input-group">',
      `		<input id="note-dialog-link-txt-${this.options.id}" class="note-link-url form-control note-form-control note-input" type="text" value="http://" />`,
          this.options.callbacks.onFileBrowse 
            ? `<div class="input-group-append"><button class="btn btn-secondary btn-browse" type="button">${this.lang.link.browse}...</button></div>`
            : '',
      '	</div>',
      '</div>',
      '<div class="form-group note-form-group form-group-text">',
      `	<label for="note-dialog-link-url-${this.options.id}" class="note-form-label">${this.lang.link.textToDisplay}</label>`,
      `	<input id="note-dialog-link-url-${this.options.id}" class="note-link-text form-control note-form-control note-input" type="text" />`,
      '</div>',
      '<div class="form-group note-form-group">',
      `	<label for="note-dialog-link-class-${this.options.id}" class="note-form-label">${this.lang.attrs.cssClass}</label>`,
      `	<input id="note-dialog-link-class-${this.options.id}" class="note-link-class form-control note-form-control note-input" type="text" />`,
      '</div>',
      '<div class="form-group note-form-group">',
      `	<label for="note-dialog-link-style-${this.options.id}" class="note-form-label">${this.lang.attrs.cssStyle}</label>`,
      `	<input id="note-dialog-link-style-${this.options.id}" class="note-link-style form-control note-form-control note-input" type="text" />`,
      '</div>',
      '<div class="form-group note-form-group">',
      `	<label for="note-dialog-link-rel-${this.options.id}" class="note-form-label">${this.lang.attrs.rel} <small class="text-muted">(alternate, author, help, license, next, nofollow, noreferrer, prefetch, prev,...)</small></label>`,
      `	<input id="note-dialog-link-rel-${this.options.id}" class="note-link-rel form-control note-form-control note-input" type="text" />`,
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

    const footer = [
      '<button type="button" class="btn btn-secondary btn-flat" data-dismiss="modal">' + this.lang.common.cancel + '</button>',
      '<button type="submit" class="btn btn-primary note-btn note-btn-primary note-link-btn" disabled>' + this.lang.common.ok + '</button>',
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
      this.context.modules.imagePopover.hide();
    }
  }

  destroy() {
    this.ui.hideDialog(this.$dialog);
    this.$dialog.remove();
  }

  bindEnterKey($input, $btn) {
    $input.on('keypress', (e) => {
      if (e.keyCode === key.code.ENTER) {
        e.preventDefault();
        e.stopPropagation();
        $btn.trigger('click');
        return false;
      }
    });
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

  checkLinkUrl(url) {
    url = url?.trim();

    if (url) {
      if (func.isValidEmail(url)) {
        return 'mailto://' + url;
      } 
      else if (func.isValidTel(url)) {
        return 'tel://' + url;
      } 
      else if (!func.startsWithUrlScheme(url)) {
        // Grab only first part
        let url2 = url;
        let slashIndex = url2.indexOf('/');
        if (slashIndex > 1) {
          url2 = url2.substring(0, slashIndex);
        }

        if (func.isValidHost(url2)) {
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

    return "";
  }

  onCheckLinkUrl($input) {
    $input.on('blur', (e) => {
      let url = this.checkLinkUrl(e.target.value);
      if (url) {
        e.target.value = url;
      }
    });
  }

  /**
   * Show link dialog and set event handlers on dialog controls.
   *
   * @param {Object} linkInfo
   * @return {Promise}
   */
  showLinkDialog(linkInfo) {
    return $.Deferred((deferred) => {
      let self = this;
      let $linkText = this.$dialog.find('.note-link-text');
      let $linkUrl = this.$dialog.find('.note-link-url');
      let $linkClass = this.$dialog.find('.note-link-class');
      let $linkStyle = this.$dialog.find('.note-link-style');
      let $linkRel = this.$dialog.find('.note-link-rel');
      let $linkBtn = this.$dialog.find('.note-link-btn');
      let $openInNewWindow = this.$dialog.find('#sn-checkbox-open-in-new-window');
      let $fileBrowse = this.$dialog.find('.btn-browse');
      let browsePromise;
  
      function toggleLinkBtn() {
        var enable = $linkUrl.val();
        if (!linkInfo.img) {
          enable = !!(enable) && !!($linkText.val());
        }
        self.ui.toggleBtn($linkBtn, enable);
      };

      function setInputFocus() {
        if (!env.isSupportTouch) {
          $linkUrl.trigger('focus');
        }
      }

      // if no url was given, copy text to url
      if (!linkInfo.url && linkInfo.text) {
        linkInfo.url = this.checkLinkUrl(linkInfo.text);
      }

      $linkText.val(linkInfo.text);
      $linkUrl.val(linkInfo.url);
      $linkClass.val(linkInfo.cssClass);
      $linkStyle.val(linkInfo.cssStyle);
      $linkRel.val(linkInfo.rel);

      const isNewWindowChecked = linkInfo.isNewWindow !== undefined
        ? linkInfo.isNewWindow
        : this.options.linkTargetBlank;
          $openInNewWindow.prop('checked', isNewWindowChecked);

      this.ui.onDialogShown(this.$dialog, () => {
        this.context.triggerEvent('dialog.shown');

        $linkText.on('input paste propertychange', () => {
          // If linktext was modified by input events,
          // cloning text from linkUrl will be stopped.
          linkInfo.text = $linkText.val();
          toggleLinkBtn();
        });
  
        $linkUrl.on('input paste propertychange', () => {
          // Display same text on `Text to display` as default
          // when linktext has no text
          if (!linkInfo.text) {
            $linkText.val($linkUrl.val());
          }
          toggleLinkBtn();       
        });

        $fileBrowse.on('click.linkDialog', (e) => {
          e.preventDefault();

          browsePromise = $.Deferred((deferredBrowse) => {
            this.context.triggerEvent('file.browse', e, null, deferredBrowse);
          }).promise();

          browsePromise
            .then(url => {
              $linkUrl.val(url).trigger('change').trigger('input');
            })
            .always(() =>{
              setInputFocus();
            });
        });

        setInputFocus();
        toggleLinkBtn();
        this.bindEnterKey($linkUrl, $linkBtn);
        this.bindEnterKey($linkText, $linkBtn);
        this.onCheckLinkUrl($linkUrl);

        $linkBtn.one('click', (e) => {
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
        $linkText.off();
        $linkUrl.off();
        $linkBtn.off();
        $fileBrowse.off();

        if (deferred.state() === 'pending') {
          deferred.reject();
        }

        if (browsePromise && browsePromise.state() === 'pending') {
          browsePromise.reject();
        }
      });
      this.ui.showDialog(this.$dialog);
    }).promise();
  };

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
        dom.setAttribute(a, 'class', this.$dialog.find('.note-link-class').val());
        dom.setAttribute(a, 'style', this.$dialog.find('.note-link-style').val());
        dom.setAttribute(a, 'rel', this.$dialog.find('.note-link-rel').val());
        if (linkInfo.img) {
          dom.setAttribute(a, 'target', linkInfo.isNewWindow ? '_blank' : null);
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
}
