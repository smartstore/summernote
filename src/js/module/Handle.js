import $ from 'jquery';
import dom from '../core/dom';

export default class Handle {
  constructor(context) {
    this.context = context;
    this.editor = context.modules.editor;
    this.$document = $(document);
    this.$editingArea = context.layoutInfo.editingArea;
    this.options = context.options;
    this.lang = this.options.langInfo;

    this.events = {
      'summernote.mousedown': (we, e) => {
        if (this.update(e.target, e)) {
          this.editor.selection.triggerChangeEvent(e.target);
        }
      },
      'summernote.keyup summernote.scroll summernote.change summernote.dialog.shown': (_, e) => {
        this.update(e?.target, e);
      },
      'summernote.disable': () => {
        this.hide();
      },
      'summernote.focusout': (we, e) => {
        if (dom.isContainedTarget(e)) {
          return;
        }
        this.hide();
      },
      'summernote.codeview.toggled': () => {
        this.hide();
      },
    };
  }

  initialize() {
    this.frame = this.context.modules.selectionFrame;
    this.$handle = this.frame.$container;
    this.$controls = this.options.disableResizeImage ? $() : $(
      '<div class="note-control-sizing note-control-se"></div>' +
      '<div class="note-control-selection-info"></div>');

    this.$handle.on('mousedown', (event) => {
      if (dom.isControlSizing(event.target)) {
        event.preventDefault();
        event.stopPropagation();

        if (this.frame.owner !== this) return;
        const $target = $(this.frame.target);
        const posStart = $target.offset();
        const scrollTop = this.$document.scrollTop();

        const onMouseMove = (event) => {
          this.context.invoke('editor.resizeControl', {
            x: event.clientX - posStart.left,
            y: event.clientY - (posStart.top - scrollTop),
          }, $target, !event.shiftKey);

          this.update($target[0], event);
        };

        this.$document
          .on('mousemove', onMouseMove)
          .one('mouseup', (e) => {
            //e.preventDefault();
            this.$document.off('mousemove', onMouseMove);
            this.context.invoke('editor.afterCommand');
          });

        if (!$target.data('ratio')) { // original ratio.
          $target.data('ratio', $target.height() / $target.width());
        }
      }
    });

    // Listen for scrolling on the handle overlay.
    this.$handle.on('wheel', (event) => {
      event.preventDefault();
      this.update();
    });
  }

  destroy() {
    this.hide();
    this.$handle.off();
    this.$controls.remove();
  }

  update(target, e) {
    if (this.context.isDisabled()) {
      return false;
    }

    target = target || this.editor.selection.selectedControl;

    const isScroll = e?.type == 'scroll';
    if (isScroll) {
      target = this.editor.selection.selectedControl;
    }

    const isImage = dom.isImg(target);
    const isMedia = !isImage && dom.isMedia(target);

    const $selection = this.frame.$frame;

    if (!isScroll) {
      this.context.invoke('imagePopover.update', target, e);
    }   

    if (isImage || isMedia) {
      const $control = $(target);

      const controlRect = this.frame.show(target, this, { controls: this.$controls });
      if (!controlRect) return false;

      let sizingText = Math.ceil(controlRect.width) + 'x' + Math.ceil(controlRect.height);

      if (isImage) {
        const origImageObj = new Image();
        origImageObj.src = $control.attr('src');

        if (origImageObj.width > 0 && origImageObj.height > 0) {
          sizingText += ' (' + this.lang.image.original + ': ' + origImageObj.width + 'x' + origImageObj.height + ')';
        }
      }

      const $info = $selection.find('.note-control-selection-info').text(sizingText);
      const exceeds = $info.outerWidth() > controlRect.width - 10 || $info.outerHeight() > controlRect.height - 10;

      $info.toggle(!exceeds);

    } 
    else {
      this.hide();
    }

    return isImage;
  }

  /**
   * hide
   *
   * @param {jQuery} $handle
   */
  hide() {
    this.frame?.hide(this);
  }
}
