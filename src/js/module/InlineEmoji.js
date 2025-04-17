import $ from 'jquery';
import func from '../core/func';
import dom from '../core/dom';
import range from '../core/range';
import EmojiDb from './EmojiDb';

export default class InlineEmoji {
  constructor(context) {
    this.context = context;

    this.ui = $.summernote.ui;
    this.$note = context.layoutInfo.note;
    this.$editor = context.layoutInfo.editor;
    this.$toolbar = context.layoutInfo.toolbar;
    this.options = context.options;
    this.lang = this.options.langInfo;
    this.buttons = context.modules.buttons;
    this.editor = context.modules.editor;
    this.selection = this.editor.selection;
    this.popper = null;
    this.marker = null;
    this.queryRange = null;
  }

  initialize() {
    this.$note.on('summernote.keyup', async (_, e) => {
      // Only trigger on relevant keys (letters, numbers, backspace, colon)
      if (/^[a-z0-9:]$/i.test(e.key) || e.key === 'Backspace') {
        await this.checkForTrigger();
      }
    });

    this.$note.on('summernote.keydown', (_, e) => {
      if (!this.$picker?.is(':visible')) return;

      // Handle arrow navigation
      if ([38, 40, 13, 27].includes(e.keyCode)) {
        e.preventDefault();
        this.handleKeyNav(e);
      }
    });

    // Hide when clicking elsewhere
    $(document).on('click', (e) => {
      if (!this.$picker) return;
      if (!$(e.target).closest('.note-emoji-suggestions').length) {
        this.destroyPicker();
      }
    });
  }

  async loadEmojiDb () {
    if (!this.db) {
      // Use the existing EmojiDb implementation
      this.db = await EmojiDb.create(this.context);
    }
  }

  handleKeyNav(e) {
    if (!this.$picker) return;
    const items = this.$picker.find('.dropdown-item');
    const current = items.filter('.active');
    let index = items.index(current);

    switch (e.keyCode) {
      case 38: index = Math.max(0, index - 1); break; // Up
      case 40: index = Math.min(items.length - 1, index + 1); break; // Down
      case 13: if (current.length) this.insertEmoji(current.data('emoji')); return; // Enter
      case 27: return this.destroyPicker(); // Escape
    }

    items.removeClass('active');
    items.eq(index).addClass('active');
  };

  async checkForTrigger() {
    const rng = this.selection.nativeSelection.getRangeAt(0);
    if (!rng || !rng.collapsed) return; // Skip if no cursor or selection exists

    const node = rng.startContainer;
    const offset = rng.startOffset;

    // Only work with text nodes
    if (!dom.isText(node)) return this.destroyPicker();

    // Get text up to AND INCLUDING the current cursor position
    const textBefore = node.textContent.substring(0, offset);
    
    // Match the last uncompleted :shortcode pattern
    const matches = textBefore.match(/:([^\s:]*)$/);
    
    if (matches) {
      const fullMatch = matches[0]; // includes colon and all chars
      const query = matches[1]; // only chars after colon
      
      // Verify:
      // 1. There's actually a query (not just ":")
      // 2. It's not part of a URL (like "http://")
      if (query.length > 0 && !textBefore.match(/:\/\/\S*$/)) {
        const colonPos = textBefore.length - fullMatch.length;
      
        // Create precise range starting at colon
        this.queryRange = document.createRange();
        this.queryRange.setStart(node, colonPos);
        this.queryRange.setEnd(node, offset);

        return await this.showPicker(query);
      }
    }
    
    return this.destroyPicker();
  }

  async showPicker(query) {
    const getMatchingShortcode = (emoji) => emoji.shortcodes.find(code => code.includes(query));

    await this.loadEmojiDb();

    const emojis = this.db.findEmojisByShortcode(query);
    const $picker = this.createPicker().empty();

    if (emojis.length > 0) {
      emojis.slice(0, 8).forEach(emoji => {
        const label = getMatchingShortcode(emoji);
        $(`
          <a href="#" class="dropdown-item" data-emoji="${emoji.emoji}">
            <span class="mr-2">${emoji.emoji}</span>
            <span class="text-truncate" style="max-width: 250px" title="${label}">${label}</span>
          </a>
        `).appendTo($picker);
      });

      $picker.children().first().addClass('active');

      // Initialize or update Popper
      if (!this.popper) {
        if (this.queryRange && !this.marker) {
          // Create marker span before range to properly position the dropdown
          this.marker = document.createElement('span');
          this.marker.className = 'note-marker note-emoji-marker';
          this.marker.textContent = '\u200B'; // Zero-width space
          this.queryRange.insertNode(this.marker);
        }

        this.popper = new Popper(this.marker, $picker[0], {
          placement: 'bottom-start',
          removeOnDestroy: true,
          modifiers: {
            preventOverflow: { boundariesElement: 'viewport' }
          }
        });
      } 
      else {
        this.popper.scheduleUpdate();
      }

      $picker.show();
      return true;
    } 
    else {
      return this.destroyPicker();
    }
  }

  insertEmoji(emoji) {
    if (!this.queryRange) return false;

    this.queryRange.deleteContents(); // Remove the shortcode query

    // Insert emoji as new text node
    const textNode = document.createTextNode(emoji);
    this.queryRange.insertNode(textNode);

    // // Normalize to merge adjacent text nodes
    // if (dom.isText(this.queryRange.startContainer)) {
    //   this.queryRange.startContainer.parentNode.normalize();
    // }

    // let rng = range.createFromNativeRange(this.queryRange);
    this.editor.focus();
    this.selection.setRange(range.createFromNodeAfter(textNode));

    this.destroyPicker();
  }

  createPicker() {
    if (!this.$picker) {
      this.$picker = $(`
        <div class="note-emoji-suggestions dropdown-menu" style="z-index: 9999"></div>
      `).appendTo('body').hide().on('click', '.dropdown-item', (e) => {
        e.preventDefault();
        const emoji = $(e.currentTarget).data('emoji');
        this.insertEmoji(emoji);
      });
    }

    return this.$picker;
  };

  destroyPicker () {
    this.queryRange = null;
    if (this.popper) {
      this.popper.destroy();
      this.popper = null;
    }
    if (this.$picker) {
      this.$picker = null;
    }
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
    return false;
  }
}