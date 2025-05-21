import Type from '../core/Type';
import HtmlSanitizer from '../util/HtmlSanitizer';

export default class Clipboard {
  constructor(context) {
    this.context = context;
    this.ui = $.summernote.ui;
    this.options = context.options;
    this.$editable = context.layoutInfo.editable;
  }

  initialize() {
    this.$pasteDialog = this.ui.dialog({
      title: 'Paste Formatting Options',
      fade: false,
      body: `<div>Choose to keep or remove formatting in the pasted content.</div>`,
      footer: `
        <button type="button" class="btn btn-secondary note-btn-pasteaction" data-action="remove">
          ${this.ui.icon(this.options.icons.eraser)}
          <span>Remove formatting</span>
        </button>
        <button type="button" class="btn btn-warning note-btn-pasteaction" data-action="keep">Keep formatting</button>`,
      callback: ($modal) => {
        $modal.attr('data-backdrop', 'static');
      }
    }).render().appendTo(document.body);

    this.$editable.on('paste', this.pasteByEvent.bind(this));
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

    const clipboardData = e.originalEvent.clipboardData;

    if (clipboardData?.items?.length) {
      const clipboardFiles = clipboardData.files;
      const clipboardText = clipboardData.getData('Text');

      if (clipboardFiles.length > 0 && this.options.allowClipboardImagePasting) {
        // Paste img file
        this.context.invoke('editor.insertImagesOrCallback', clipboardFiles);
        e.preventDefault();
      }
      else if (clipboardText.length > 0 && this.context.invoke('editor.isLimited', clipboardText.length)) {
        // Paste text with maxTextLength check
        e.preventDefault();
      }
      else if (clipboardText.length > 0) {
        // Check available types
        const types = clipboardData.types || [];

        // Determine content type
        const hasText = types.includes('text/plain');
        const hasRTF = types.includes('text/rtf');
        const hasHTML = types.includes('text/html') || clipboardData.getData('text/html');
        
        if (hasHTML) {
          // Paste HTML
          e.preventDefault();
          let html = clipboardData.getData('text/html');
          if (this.options.purifyHtml?.enabled) {
            this.showPasteDialog(html).then((action) => {
              let flags = this.options.purifyHtml.flags['paste'];
              let removeFormatting = action === 'remove';
              if (removeFormatting) {
                flags = [... flags, 'format'];
              }
              html = HtmlSanitizer.purify(this.context, html, flags).innerHTML;
              document.execCommand('insertHTML', false, html);
            }).fail(() => {
              this.context.invoke('editor.selection.restoreBookmark');
            });
          }
          else {
            document.execCommand('insertHTML', false, html);
          }
        }
        else if (!hasRTF && hasText) {
          // Paste text
          e.preventDefault();
          let text = clipboardText
            .replace(/\n/g, '<br>')
            .replace(/  /g, ' &nbsp;');

          document.execCommand('insertHTML', false, text);
        }
      }
    }

    // Call editor.afterCommand after proceeding default event handler
    setTimeout(() => {
      this.context.invoke('editor.afterCommand');
    }, 10);
  }

  showPasteDialog() {
    const $btn = this.$pasteDialog.find('.note-btn-pasteaction');

    return $.Deferred((deferred) => {
      this.ui.onDialogShown(this.$pasteDialog, () => {
        this.context.triggerEvent('dialog.shown');

        $btn.one('click', e => {
          deferred.resolve($(e.currentTarget).data('action'));
          this.ui.hideDialog(this.$pasteDialog);
        });
      });

      this.ui.onDialogHidden(this.$pasteDialog, () => {
        $btn.off();
        if (deferred.state() === 'pending') {
          deferred.reject();
        }
      });

      this.ui.showDialog(this.$pasteDialog);
    }).promise();
  }

  destroy() {
    this.ui.hideDialog(this.$pasteDialog);
    this.$pasteDialog.remove();
  }
}
