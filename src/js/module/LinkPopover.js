import $ from 'jquery';
import lists from '../core/lists';
import dom from '../core/dom';

export default class LinkPopover {
  constructor(context) {
    this.context = context;

    this.editor = context.modules.editor;
    this.ui = $.summernote.ui;
    this.options = context.options;
    this.events = {
      'summernote.popover.shown': (e, popover) => {
        if (popover != this.$popover) {
          this.hide();
        }
      },
      'summernote.keyup summernote.mouseup summernote.change summernote.scroll': () => {
        this.update();
      },
      'summernote.disable summernote.dialog.shown': () => {
        this.hide();
      },
      'summernote.blur': (we, event) => {
        if (event.originalEvent && event.originalEvent.relatedTarget) {
          if (!this.$popover[0].contains(event.originalEvent.relatedTarget)) {
            this.hide();
          }
        } else {
          this.hide();
        }
      },
      'summernote.codeview.toggled': () => {
        this.hide();
      },
    };
  }

  shouldInitialize() {
    return !lists.isEmpty(this.options.popover.link);
  }

  initialize() {
    this.$popover = this.ui.popover({
      className: 'note-link-popover',
      callback: ($node) => {
        const $content = $node.find('.popover-content,.note-popover-content');
        $content.prepend('<span class="text-truncate d-inline-block ml-1" style="max-width: 300px"><a target="_blank" class="text-truncate"></a>&nbsp;</span><span class="vr"></span>');
      },
    }).render().appendTo(this.options.container);
    const $content = this.$popover.find('.popover-content,.note-popover-content');

    this.context.invoke('buttons.build', $content, this.options.popover.link);

    this.$popover.on('mousedown', (event) => { event.preventDefault(); });
  }

  destroy() {
    this.$popover.remove();
  }

  update() {
    // Prevent focusing on editable when invoke('code') is executed
    if (!this.context.invoke('editor.hasFocus')) {
      this.hide();
      return;
    }

    const rng = this.context.invoke('editor.selection.getRange');
    if (rng.collapsed && rng.isOnAnchor()) {
      const anchor = dom.ancestor(rng.sc, dom.isAnchor);
      const href = $(anchor).attr('href');
      this.$popover.find('a')
        .attr('href', href)
        .attr('title', href)
        .text(href);

      this.editor.showPopover(this.$popover, anchor);
    } 
    else {
      this.hide();
    }
  }

  hide() {
    this.editor.hidePopover(this.$popover);
  }
}
