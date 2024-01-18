import $ from 'jquery';
import env from '../core/env';
import lists from '../core/lists';
import dom from '../core/dom';

export default class TablePopover {
  constructor(context) {
    this.context = context;

    this.editor = context.modules.editor;
    this.ui = $.summernote.ui;
    this.options = context.options;
    this.events = {
      'summernote.mousedown': (we, e) => {
        this.update(e?.target, e);
      },
      'summernote.keyup summernote.scroll summernote.change': (we, e) => {
        this.update(e?.target, e);
      },
      'summernote.disable summernote.dialog.shown summernote.popover.shown': () => {
        this.hide();
      },
      'summernote.blur': (we, e) => {
        if (e.originalEvent && e.originalEvent.relatedTarget) {
          if (!this.$popover[0].contains(e.originalEvent.relatedTarget)) {
            this.hide();
          }
        } else {
          this.hide();
        }
      },
    };
  }

  shouldInitialize() {
    return !lists.isEmpty(this.options.popover.table);
  }

  initialize() {
    this.$popover = this.ui.popover({
      className: 'note-table-popover',
    }).render().appendTo(this.options.container);
    const $content = this.$popover.find('.popover-content,.note-popover-content');

    this.context.invoke('buttons.build', $content, this.options.popover.table);

    // [workaround] Disable Firefox's default table editor
    if (env.isFF) {
      document.execCommand('enableInlineTableEditing', false, false);
    }

    this.$popover.on('mousedown', (event) => { event.preventDefault(); });
  }

  destroy() {
    this.$popover.remove();
  }

  update(target, e) {
    if (this.context.isDisabled()) {
      return false;
    }

    const isScroll = e?.type == 'scroll';
    if (isScroll) {
      return false;
    }

    const isCell = dom.isCell(target) || dom.isCell(target?.parentElement);

    if (isCell) {
      const isVoidOrLink = dom.isVoid(target) || dom.isAnchor(target) || dom.isAnchor(target?.parentElement);

      if (!isVoidOrLink) {
        const table = dom.ancestor(target, dom.isTable);
        if (table) {
          this.editor.showPopover(this.$popover, table);
        }

        return true;
      }
    }

    this.hide();
    return false;
  }

  hide() {
    this.editor.hidePopover(this.$popover);
  }
}
