import $ from 'jquery';
import func from '../core/func';
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
      this.$nav = $nav;
      db.getGroups().forEach(group => {
        const $navItem = $('<a>').addClass('nav-link p-2')
          .attr({
            'href': '#',
            'title': group.name,
            'data-group': group.id
          })
          .text(group.icon);
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
        const $link = $(e.currentTarget);
        if ($link.hasClass('active')) {
          return; // Already active, do nothing
        }

        $nav.find('.nav-link').removeClass('active');
        $link.addClass('active');

        const group = $link.data('group');
        if (group == -10) {
          // Search mode
          this.searchEmojis(db, this.lastSearchTerm, $emojiContainer);
        }
        else {
          // Normal group mode
          this.activateGroup(db, group, $emojiContainer);
        }
      });

      $searchInput.on('keydown keyup mousedown mouseup click', (e) => {
        // BS dropdown "eats" these events otherwise.
        e.stopPropagation();
      });

      $emojiContainer.on('click', '.note-emoji', (e) => {
        const emoji = $(e.currentTarget).text();
        this.insertEmoji(emoji);
      });

      // Search
      const debouncedSearch = func.debounce((term) => {
        this.searchEmojis(db, term, $emojiContainer);
      }, 180, false);

      $searchInput.on('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        debouncedSearch(term);
      });

      // Initial state
      const $firstLink = $nav.find('> .nav-link').first().addClass('active');
      this.activateGroup(db, $firstLink.data('group'), $emojiContainer);
      $searchInput.trigger('focus');
    }
    catch (ex) {
      $menu.html(`<div class="text-danger p-2">Failed to load emojis: ${ex}</div>`);
    }
  }

  activateGroup(db, group, $container) {
    $container.empty();
    this.$nav.find(`> .nav-link[data-group=${group}]`).addClass('active');
    db.getEmojis(group).forEach(emoji => this.renderEmoji(emoji, $container));
    this.lastActiveGroup = group; // Store last active group
    $container.scrollTop(0); // Reset scroll position
  }

  searchEmojis(db, term, $container) {
    $container.empty();

    if (!this.lastSearchTerm) {
      // Entering search mode
      this.$nav.find('> .nav-link.active').removeClass('active');
      this.$nav.prepend('<a class="nav-link nav-link-search p-2 active" href="#" title="Search" data-group="-10">🔍️</a>');
    }

    this.lastSearchTerm = term; // Store last search term

    if (term.length === 0) {
      // Leaving search mode
      this.$nav.find('.nav-link-search').remove();
      // Restore last active group
      this.activateGroup(db, this.lastActiveGroup, $container);
      return;
    }
    else {
      // Re-entering search mode
      this.$nav.find('> .nav-link.active').removeClass('active');
      this.$nav.find('.nav-link-search').addClass('active');
      if (term.length === 1) {
        // Show hint for single character input
        $container.html('<div class="text-center w-100">Type at least 2 characters...</div>');
      }
      else {
        db.findEmojis(term).forEach(emoji => {
          this.renderEmoji(emoji, $container);
        });
      }
    }

    $container.scrollTop(0); // Reset scroll position
  }

  renderEmoji(emoji, $container) {
    const $emoji = $('<button>').addClass('note-emoji btn btn-clear-dark btn-icon btn-sm')
      .toggleClass('combined', emoji.combined)
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