export default class Clipboard {
  constructor(context) {
    this.context = context;
    this.ui = $.summernote.ui;
    this.options = context.options;
    this.lang = this.options.langInfo;
    this.$editable = context.layoutInfo.editable;
  }

  initialize() {
    this.editor = this.context.modules.editor;
    this.$editable.on('paste', this.pasteByEvent.bind(this));
  }

  getPasteDialog() {
    if (!this.$pasteDialog) {
      this.$pasteDialog = this.ui.dialog({
        title: this.lang.paste.title,
        fade: false,
        body: `<div>${this.lang.paste.description}</div>`,
        footer: `
          <button type="button" class="btn btn-secondary note-btn-pasteaction" data-action="keep">${this.lang.paste.keepFormat}</button>
          <button type="button" class="btn btn-warning note-btn-pasteaction" data-action="remove">
            ${this.ui.icon(this.options.icons.eraser)}
            <span>${this.lang.paste.removeFormat}</span>
          </button>`,
        callback: ($modal) => {
          $modal.attr('data-backdrop', 'static');
        }
      }).render().appendTo(document.body);
    }

    return this.$pasteDialog;
  }

  /**
   * paste by clipboard event
   *
   * @param {Event} e
   */
  pasteByEvent(e) {
    if (this.context.isDisabled()) {
      return;
    }

    const data = e.originalEvent.clipboardData;
    if (this.paste(data)) {
      // Prevent default paste behavior if paste was handled
      e.preventDefault();
    }
  }

  paste(data, focus = false) {
    if (!data?.items?.length) return;

    let preventDefault = false;
    let clipboardText = data.getData('Text');

    if (data.files.length > 0 && this.options.allowClipboardImagePasting) {
      // Paste img file
      preventDefault = true;
      if (focus) {
        // Focus editable area if needed
        this.$editable.trigger('focus');
      }
      this.context.invoke('editor.insertImagesOrCallback', data.files);
      // Call editor.afterCommand after proceeding default event handler
      setTimeout(() => this.context.invoke('editor.afterCommand'), 10);
    }
    else if (clipboardText.length) {
      // Check available types
      const types = data.types || [];

      // Determine content type
      const hasText = types.includes('text/plain');
      const hasRTF = types.includes('text/rtf');
      const hasHTML = types.includes('text/html') || data.getData('text/html');
      
      if (hasHTML) {        
        // Paste HTML
        if (this.options.purifyHtml?.enabled) {
          preventDefault = true;
          let html = data.getData('text/html');
          this.showPasteDialog().then((action) => {
            let flags = this.options.purifyHtml.flags['paste'] || [];
            let removeFormatting = action === 'remove';
            if (removeFormatting) {
              flags = [... flags, 'format'];
            }

            this.editor.pasteHTML(html, flags);
          }).fail(() => {
            this.context.invoke('editor.selection.restoreBookmark');
          });
        }
      }
      else if (!hasRTF && hasText) {
        // Paste text
        preventDefault = true;

        let rng = this.editor.selection.getRange();
        let text = clipboardText;
        
        if (!rng.isOnPre()) {
          // If the selection is NOT inside a <pre> tag, we should replace newlines with <br>
          text = text
            .replace(/\n/g, '<br>')
            .replace(/  /g, ' &nbsp;');
        }

        this.editor.pasteHTML(text);
      }
    }

    return preventDefault;
  }

  showPasteDialog() {
    const $dialog = this.getPasteDialog();
    const $btn = $dialog.find('.note-btn-pasteaction');

    return $.Deferred((deferred) => {
      this.ui.onDialogShown($dialog, () => {
        this.context.triggerEvent('dialog.shown');

        $btn.last().focus();
        $btn.one('click', e => {
          deferred.resolve($(e.currentTarget).data('action'));
          this.ui.hideDialog($dialog);
        });
      });

      this.ui.onDialogHidden($dialog, () => {
        $btn.off();
        if (deferred.state() === 'pending') {
          deferred.reject();
        }
      });

      this.ui.showDialog($dialog);
    }).promise();
  }

  destroy() {
    if (this.$pasteDialog) {
      this.ui.hideDialog(this.$pasteDialog);
      this.$pasteDialog.remove();
    }
  }
}
