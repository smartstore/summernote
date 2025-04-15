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
        //this.handleKeyNav(e);
        console.log('handleKeyNav');
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

  async checkForTrigger() {
    const rng = this.context.invoke('editor.getLastRange');
    if (!rng || !rng.collapsed) return; // Skip if no cursor or selection exists

    const node = rng.startContainer;
    const offset = rng.startOffset;

    // Only work with text nodes
    if (!dom.isText(node)) this.destroyPicker();

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
        const newRange = range.create(node, colonPos, node, offset);
        await this.showPicker(query, newRange);
        return;
      }
    }
    
    this.destroyPicker();
  }

  async showPicker(query, rng) {
    await this.loadEmojiDb();

    const emojis = this.db.findEmojis(query);
    const $picker = this.createPicker().empty();

    if (emojis.length > 0) {
      emojis.slice(0, 8).forEach(emoji => {
        $(`
          <a href="#" class="dropdown-item" 
             data-emoji="${emoji.emoji}">
            <span class="emoji mr-2">${emoji.emoji}</span>
            <span class="shortcode">${emoji.label}</span>
          </a>
        `).appendTo($picker).on('click', (e) => {
          e.preventDefault();
          //this.insertEmoji(emoji.emoji, range);
        });
      });

      // Position dropdown
      const rect = rng.getBoundingClientRect();
      $picker.css({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX
      });
    } 
    else {
      this.destroyPicker();
    }
  }

  createPicker() {
    if (!this.$picker) {
      this.$picker = $(`
        <div class="note-emoji-suggestions dropdown-menu d-block" style="z-index: 9999"></div>
      `).appendTo('body');
    }

    return this.$picker;
  };

  destroyPicker () {
    if (this.$picker) {
      this.$picker.remove();
      this.$picker = null;
    }
  }
}