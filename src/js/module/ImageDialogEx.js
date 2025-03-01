import $ from 'jquery';
import env from '../core/env';
import key from '../core/key';
import dom from '../core/dom';

export default class ImageDialog {
  constructor(context) {
    this.context = context;
    this.editor = context.modules.editor;
    this.ui = $.summernote.ui;
    this.$body = $(document.body);
    this.$editor = context.layoutInfo.editor;
    this.options = context.options;
    this.lang = this.options.langInfo;

    this.context.memo('button.imageAttributes', () => {
      var button = this.ui.button({
        contents: this.ui.icon(this.options.icons.pencil),
        callback: (btn) => {
          btn.data("placement", "bottom");
          btn.data("trigger", "hover");
          btn.attr("title", this.lang.image.imageProps);
          btn.tooltip();
        },
        click: () => {
          this.show();
        }
      });
      return button.render();
    });
  }

  initialize() {
    const $container = this.options.dialogsInBody ? this.$body : this.options.container;
    const body = [
      '<div class="form-group note-group-image-url">',
      `	<label for="note-dialog-image-url-${this.options.id}" class="note-form-label">${this.lang.image.url}</label>`,
      '	<div class="input-group">',
      `		<input id="note-dialog-image-url-${this.options.id}" class="note-image-src form-control note-form-control note-input" type="text" />`,
          this.options.callbacks.onFileBrowse 
            ? `<div class="input-group-append"><button class="btn btn-secondary btn-browse" type="button">${this.lang.link.browse}...</button></div>`
            : '',
      '	</div>',
      '</div>',
      '<div class="form-group note-form-group form-group-text">',
      `	<label for="note-dialog-image-alt-${this.options.id}" class="note-form-label">Alt</label>`,
      `	<input id="note-dialog-image-alt-${this.options.id}" class="note-image-alt form-control note-form-control note-input" type="text" />`,
      '</div>',
      '<div class="form-group note-form-group form-group-text">',
      `	<label for="note-dialog-image-title-${this.options.id}" class="note-form-label">Title</label>`,
      `	<input id="note-dialog-image-title-${this.options.id}" class="note-image-title form-control note-form-control note-input" type="text" />`,
      '</div>',
      '<div class="form-group note-form-group">',
      `	<label for="note-dialog-image-class-${this.options.id}" class="note-form-label">${this.lang.attrs.cssClass}</label>`,
      `	<input id="note-dialog-image-class-${this.options.id}" class="note-image-class form-control note-form-control note-input" type="text" />`,
      '</div>',
      '<div class="form-group note-form-group">',
      `	<label for="note-dialog-image-style-${this.options.id}" class="note-form-label">${this.lang.attrs.cssStyle}</label>`,
      `	<input id="note-dialog-image-style-${this.options.id}" class="note-image-style form-control note-form-control note-input" type="text" />`,
      '</div>'
    ].join('');
    const footer = [
      '<button type="button" class="btn btn-secondary btn-flat" data-dismiss="modal">' + this.lang.common.cancel + '</button>',
      '<button type="submit" class="btn btn-primary note-image-btn" disabled>' + this.lang.common.ok + '</button>'
    ].join('');

    this.$dialog = this.ui.dialog({
      className: 'image-dialog',
      title: this.lang.image.image,
      fade: this.options.dialogsFade,
      body: body,
      footer: footer,
    }).render().appendTo($container);
  }

  destroy() {
    this.ui.hideDialog(this.$dialog);
    this.$dialog.remove();
  }

  bindEnterKey($btn) {
    this.$dialog.find('.note-input').on('keypress.imageDialog', (e) => {
      if (e.keyCode === key.code.ENTER) {
        e.preventDefault();
        e.stopPropagation();
        $btn.trigger('click');
        return false;
      }
    });
  }

  show() {
    let imgInfo = {},
        img = $(this.editor.selection.selectedControl);

    if (img.length) {
      imgInfo = {
        img: img,
        src: img.attr('src'),
        alt: img.attr("alt"),
        title: img.attr("title"),
        cssClass: img.attr("class"),
        cssStyle: img.attr("style"),
      }
    }

    this.showImageDialog(imgInfo).then((imgInfo) => {
      // [workaround] hide dialog before restore range for IE range focus
      this.ui.hideDialog(this.$dialog);
      this.context.invoke('editor.selection.restoreBookmark');

      const setAttrs = (img, withSrc) => {
        if (withSrc) {
          dom.setAttr(img, 'src', this.$dialog.find('.note-image-src').val());
        }
        
        dom.setAttr(img, 'alt', this.$dialog.find('.note-image-alt').val());
        dom.setAttr(img, 'title', this.$dialog.find('.note-image-title').val());
        dom.setAttr(img, 'class', this.$dialog.find('.note-image-class').val());
        dom.setAttr(img, 'style', this.$dialog.find('.note-image-style').val());
      }

      if (!imgInfo.img) {
        // Insert mode
        this.context.invoke('editor.insertImage', this.$dialog.find('.note-image-src').val(), setAttrs);
      }
      else {
        // Edit mode
        setAttrs(imgInfo.img, true);

        // Ensure that SN saves the change
        this.context.layoutInfo.note.val(this.context.invoke('code'));
        this.context.layoutInfo.note.change();
      }
    }).fail(() => {
      this.context.invoke('editor.selection.restoreBookmark');
    });
  };

  /**
   * show image dialog
   *
   * @param {jQuery} $dialog
   * @return {Promise}
   */
  showImageDialog(imgInfo) {
    return $.Deferred((deferred) => {
      let $imageUrl = this.$dialog.find('.note-image-src');
      let $imageClass = this.$dialog.find('.note-image-class');
      let $imageStyle = this.$dialog.find('.note-image-style');
      let $imageAlt = this.$dialog.find('.note-image-alt');
      let $imageTitle = this.$dialog.find('.note-image-title');
      let $imageBtn = this.$dialog.find('.note-image-btn');
      let $imageBrowse = this.$dialog.find('.btn-browse');
      let browsePromise;
      
      $imageUrl.on('input.imageDialog', (e) => {
        this.ui.toggleBtn($imageBtn, $imageUrl.val());
      });
  
      $imageUrl.val(imgInfo.src);
      $imageClass.val(imgInfo.cssClass);
      $imageStyle.val(imgInfo.cssStyle);
      $imageAlt.val(imgInfo.alt);
      $imageTitle.val(imgInfo.title);
  
      this.ui.toggleBtn($imageBtn, imgInfo.src);

      this.ui.onDialogShown(this.$dialog, () => {
        this.context.triggerEvent('dialog.shown');

        function setInputFocus() {
          if (!env.isSupportTouch) {
            $imageUrl.trigger('focus');
          }
        }
        setInputFocus();

        $imageBrowse.on('click.imageDialog', e => {
          e.preventDefault();

          browsePromise = $.Deferred((deferredBrowse) => {
            this.context.triggerEvent('file.browse', e, 'image', deferredBrowse);
          }).promise();

          browsePromise
            .then(url => {
              $imageUrl.val(url).trigger('change').trigger('input');
            })
            .always(() =>{
              setInputFocus();
            });
        });

        this.bindEnterKey($imageBtn);

        $imageBtn.one('click', (e) => {
          e.preventDefault();
          deferred.resolve({
            img: imgInfo.img,
            src: imgInfo.src,
            alt: imgInfo.alt,
            title: imgInfo.title,
            cssClass: imgInfo.cssClass,
            cssStyle: imgInfo.cssStyle
          });
          this.ui.hideDialog(this.$dialog);
        });
      });

      this.ui.onDialogHidden(this.$dialog, () => {
        this.$dialog.find('.note-input').off('keypress');
        $imageUrl.off();
        $imageBtn.off();
        $imageBrowse.off();

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
}
