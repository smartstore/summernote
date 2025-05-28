import Type from '../core/Type';
import HtmlSanitizer from '../util/HtmlSanitizer';

/**
 * Extracts content between <!--StartFragment--> and <!--EndFragment--> comments,
 * or returns the original string if markers are not found.
 * @param {string} html - HTML string to process
 * @returns {string} Extracted fragment or original string
 */
const extractFragmentContent = (html) => {
  if (!html) return '';
  
  const startMarker = '<!--StartFragment-->';
  const endMarker = '<!--EndFragment-->';
  
  const startIndex = html.indexOf(startMarker);
  const endIndex = html.indexOf(endMarker);
  
  // If both markers exist and are properly ordered
  if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
    return html.slice(
      startIndex + startMarker.length,
      endIndex
    ).trim();
  }
  
  // Return original string if markers aren't found
  return html;
}

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

    const clipboardData = e.originalEvent.clipboardData;
    const selection = this.editor.selection;

    if (clipboardData?.items?.length) {
      const clipboardText = clipboardData.getData('Text');

      if (clipboardData.files.length > 0 && this.options.allowClipboardImagePasting) {
        // Paste img file
        this.context.invoke('editor.insertImagesOrCallback', clipboardData.files);
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
          if (this.options.purifyHtml?.enabled) {
            e.preventDefault();
            let html = extractFragmentContent(clipboardData.getData('text/html'));

            this.showPasteDialog(html).then((action) => {
              let flags = this.options.purifyHtml.flags['paste'];
              let removeFormatting = action === 'remove';
              if (removeFormatting) {
                flags = [... flags, 'format'];
              }

              try {
                html = HtmlSanitizer.purify(this.context, html, flags).innerHTML;
              }
              catch (err) {
                console.error('Error purifying HTML (using original HTML):', err);
              }  

              document.execCommand('insertHTML', false, html);
              //selection.getRange().pasteHTML_old(html);
              //const rng = selection.getRange().pasteHTML(html);
              //selection.setRange(rng);
              //this.editor.pasteHTML(html);
            }).fail(() => {
              this.context.invoke('editor.selection.restoreBookmark');
            });
          }
        }
        else if (!hasRTF && hasText) {
          // Paste text
          e.preventDefault();

          let rng = selection.getRange();
          let text = clipboardText;
          
          if (!rng.isOnPre()) {
            // If the selection is NOT inside a <pre> tag, we should replace newlines with <br>
            text = text
              .replace(/\n/g, '<br>')
              .replace(/  /g, ' &nbsp;');
          }

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
