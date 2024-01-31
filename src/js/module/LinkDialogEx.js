import $ from 'jquery';
import env from '../core/env';
import key from '../core/key';
import Str from '../core/Str';

export default class LinkDialog {
  constructor(context) {
    this.context = context;

    this.ui = $.summernote.ui;
    this.$body = $(document.body);
    this.$editor = context.layoutInfo.editor;
    this.options = context.options;
    this.lang = this.options.langInfo;
    this.editor = context.modules.editor;

    context.memo('help.linkDialog.show', this.options.langInfo.help['linkDialog.show']);
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

  onCheckLinkUrl($input) {
    $input.on('blur', (e) => {
      let url = this.editor.checkLinkUrl(e.target.value);
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
        linkInfo.url = this.editor.checkLinkUrl(linkInfo.text);
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
          linkInfo.text = Str.escape($linkText.val());
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
    const linkInfo = this.context.invoke('editor.getLinkInfo');
    // Hide "text" control if img is selected
    this.$dialog.find('.form-group-text').toggle(!linkInfo.img);

    this.context.invoke('editor.saveRange');

    this.showLinkDialog(linkInfo).then((linkInfo) => {
      this.context.invoke('editor.restoreRange');
      this.context.invoke('editor.createLink', linkInfo);

    }).fail(() => {
      this.context.invoke('editor.restoreRange');
    });
  };
}
