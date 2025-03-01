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
          //e.preventDefault();
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
    this.$handle = $([
      '<div class="note-handle">',
        '<div class="note-control-selection">',
          '<div class="note-control-selection-bg"></div>',
          '<div class="note-control-holder note-control-nw"></div>',
          '<div class="note-control-holder note-control-ne"></div>',
          '<div class="note-control-holder note-control-sw"></div>',
          '<div class="',
            (this.options.disableResizeImage ? 'note-control-holder' : 'note-control-sizing'),
          ' note-control-se"></div>',
          (this.options.disableResizeImage ? '' : '<div class="note-control-selection-info"></div>'),
        '</div>',
      '</div>',
    ].join('')).prependTo(this.$editingArea);

    this.$handle.on('mousedown', (event) => {
      if (dom.isControlSizing(event.target)) {
        event.preventDefault();
        event.stopPropagation();

        const $target = this.$handle.find('.note-control-selection').data('target');
        const posStart = $target.offset();
        const scrollTop = this.$document.scrollTop();

        const onMouseMove = (event) => {
          this.context.invoke('editor.resizeImage', {
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
    this.$handle.remove();
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
    const $selection = this.$handle.find('.note-control-selection');

    if (!isScroll) {
      this.context.invoke('imagePopover.update', target, e);
    }   

    if (isImage) {
      const $image = $(target);

      const areaRect = this.$editingArea[0].getBoundingClientRect();
      const imageRect = target.getBoundingClientRect();

      $selection.css({
        display: 'block',
        left: imageRect.left - areaRect.left,
        top: imageRect.top - areaRect.top,
        width: imageRect.width,
        height: imageRect.height,
      }).data('target', $image); // save current image element.

      const origImageObj = new Image();
      origImageObj.src = $image.attr('src');

      let sizingText = Math.ceil(imageRect.width) + 'x' + Math.ceil(imageRect.height);
      if (origImageObj.width > 0 && origImageObj.height > 0) {
        sizingText += ' (' + this.lang.image.original + ': ' + origImageObj.width + 'x' + origImageObj.height + ')';
      }
      const $info = $selection.find('.note-control-selection-info').text(sizingText);
      const exceeds = $info.outerWidth() > imageRect.width - 10 || $info.outerHeight() > imageRect.height - 10;

      $info.toggle(!exceeds);
      this.context.invoke('editor.saveTarget', target);
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
    this.$handle.children().hide();
    this.context.invoke('editor.clearTarget');
  }
}
