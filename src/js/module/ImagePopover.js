import $ from 'jquery';
import lists from '../core/lists';
import dom from '../core/dom';

/**
 * Image popover module
 *  mouse events that show/hide popover will be handled by Handle.js.
 *  Handle.js will receive the events and invoke 'imagePopover.update'.
 */
export default class ImagePopover {
  constructor(context) {
    this.context = context;
    this.editor = context.modules.editor;
    this.ui = $.summernote.ui;

    this.editable = context.layoutInfo.editable[0];
    this.options = context.options;

    this.events = {
      'summernote.popover.shown': (e, popover) => {
        if (popover != this.$popover) {
          this.hide();
        }
      },
      'summernote.disable summernote.dialog.shown summernote.media.delete': (e) => {
        this.hide();
      },
      'summernote.blur': (we, event) => {
        if (event.originalEvent?.relatedTarget) {
          if (!this.$popover[0].contains(event.originalEvent.relatedTarget)) {
            this.hide();
          }
        } 
        else {
          this.hide();
        }
      },
    };
  }

  shouldInitialize() {
    return !lists.isEmpty(this.options.popover.image);
  }

  initialize() {
    this.$popover = this.ui.popover({
      className: 'note-image-popover'
    }).render().appendTo(this.options.container);
    const $content = this.$popover.find('.popover-content,.note-popover-content');
    this.context.invoke('buttons.build', $content, this.options.popover.image);

    this.$popover.on('mousedown', (event) => { event.preventDefault(); });
  }

  destroy() {
    this.$popover.remove();
  }

  update(target, e) {
    const isImage = dom.isImg(target);
    const isMedia = !isImage && dom.isMedia(target);
    
    if (isImage || isMedia) {
      const $target = $(target);
      const $btnUnlink = this.$popover.find('.note-unlink');
      let isLinkedImage = false;

      if ($btnUnlink.length) {
        isLinkedImage = $target.parent().is('a');
        // Toggle the unlink button visibility depending on current selection
        $btnUnlink.toggle(isLinkedImage);
      }

      const $btnAttrs = this.$popover.find('.note-image-attributes');
      if ($btnAttrs.length) {
        // Toggle the attrs button visibility depending on current selection
        $btnAttrs.toggle(isImage);
      } 

      if (!isLinkedImage) {
        const $btnLink = this.$popover.find('.note-link');
        if ($btnLink.length) {
          // Toggle the link button visibility depending on current selection
          $btnLink.toggle(isImage);
        } 
      }

      setTimeout(() => {
        this.editor.showPopover(this.$popover, target);
      }, isImage ? 0 : 50);

      
    } 
    else {
      this.hide();
    }
  }

  hide() {
    this.editor.hidePopover(this.$popover);
  }
}
