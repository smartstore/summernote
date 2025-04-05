import $ from 'jquery';
import _ from 'underscore';
import dom from '../core/dom';
import range from '../core/range';
import EmojiDb from './EmojiDb';

export default class Emoji {
  constructor(context) {
    this.context = context;

    this.ui = $.summernote.ui;
    this.$editor = context.layoutInfo.editor;
    this.$toolbar = context.layoutInfo.toolbar;
    this.options = context.options;
    this.lang = this.options.langInfo;
    this.buttons = context.modules.buttons;
    this.editor = context.modules.editor;
    this.selection = this.editor.selection;
  }

  initialize() {
    this.context.memo('button.emoji', () => {
      return this.ui.buttonGroup({
        className: 'btn-group-emoji dropdown',
        children: [
          this.ui.button({
            className: 'note-btn-emoji dropdown-toggle no-chevron',
            contents: this.ui.icon(this.options.icons.smiley),
            tooltip: this.lang.common.emoji,
            data: { toggle: 'dropdown' }
          }),
          this.ui.dropdown({
            className: 'dropdown-menu note-dropdown-emoji p-0',
            data: { initialized: false }
          })
        ],
        callback: ($dropdown) => {
          $dropdown.one('show.bs.dropdown', async (e) => { 
            // Show loading state
            $dropdown.find('> .dropdown-menu').html('<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div></div>');

            const db = await EmojiDb.create(this.context);
            await this.buildPicker($dropdown, db);
          });
        }
      }).render();
    });
  }

  async buildPicker($dropdown, db) {
    const $menu = $dropdown.find('> .dropdown-menu');

    try {
      // Build navigation
      const $nav = $('<div>').addClass('nav nav-tabs nav-tabs-line nav-emoji mb-2');
      db.getGroups().forEach(category => {
        const $navItem = $('<a>').addClass('nav-link px-2 py-2')
          .attr({
            'href': '#',
            'title': category.name,
            'data-category': category.id
          })
          .text(category.icon);
        $nav.append($navItem);
      });

      // Build search box
      const $searchBox = $('<form>').addClass('note-emoji-searchbox');
      const $searchInput = $('<input>').addClass('form-control form-control-sm note-emoji-searchterm bg-secondary')
        .attr('placeholder', 'Search emojis...')
        .attr('type', 'text');
      $searchBox.append($searchInput);

      // Add container for emojis
      const $emojiContainer = $('<div>').addClass('note-emoji-list scrollbar-thin d-flex flex-wrap');

      // Compose HTML
      $menu.empty()
        .append($nav)
        .append($searchBox)
        .append($emojiContainer);

      // Event handlers
      $dropdown.on('shown.bs.dropdown', () => {
        $searchInput.trigger('focus');
      });
  
      $menu.on('click', (e) => {
        // Prevent dropdown close
        e.stopPropagation();
      });

      $nav.on('click', '.nav-link', (e) => {
        e.preventDefault();
        $nav.find('.nav-link').removeClass('active');
        $(e.currentTarget).addClass('active');
        this.showCategoryEmojis(db, $(e.currentTarget).data('category'), $emojiContainer);
      });

      $searchInput.on('keydown keyup mousedown mouseup click', (e) => {
        e.stopPropagation();
      });

      $searchInput.on('input', () => {
        this.filterEmojis(db, $searchInput.val().toLowerCase(), $emojiContainer);
      });

      $emojiContainer.on('click', '.note-emoji', (e) => {
        const emoji = $(e.currentTarget).text();
        this.insertEmoji(emoji);
      });

      // Initial state
      $nav.find('> .nav-link').first().addClass('active').trigger('click');
      $searchInput.trigger('focus');
    }
    catch (ex) {
      $menu.html(`<div class="text-danger p-2">Failed to load emojis: ${ex}</div>`);
    }
  }

  showCategoryEmojis(db, category, $container) {
    $container.empty();
    db.getEmojis(category).forEach(emoji => this.renderEmoji(emoji, $container));
    $container.scrollTop(0); // Reset scroll position
  }

  filterEmojis(db, term, $container) {
    $container.empty();

    if (!term.trim()) {
      const activeCategory = $container.closest('.note-dropdown-emoji').find('.nav-link.active').data('category');
      this.showCategoryEmojis(db, activeCategory, $container);
      return;
    }
    
    db.findEmojis(term).forEach(emoji => {
      this.renderEmoji(emoji, $container);
    });

    $container.scrollTop(0); // Reset scroll position
  }

  renderEmoji(emoji, $container) {
    // TODO: Double Emojis ausblenden oder anders darstellen
    // TODO: Such Handling besser machen (ab 2 Buchstaben)

    const $emoji = $('<button>').addClass('note-emoji btn btn-clear-dark btn-icon btn-sm')
      .attr('title', emoji.label)
      .attr('type', 'button')
      .text(emoji.emoji);
  
    $container.append($emoji);
  }

  insertEmoji(emoji) {
    this.context.invoke('editor.insertText', emoji);
  }

  destroy() {
    // ???
  }
}