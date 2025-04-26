import $ from 'jquery';
import func from '../core/func';
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
    this.$popover = null;
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

      // Recent emojis
      if (db.hasRecentEmojis()) {
        const $navItem = $('<a>').addClass('nav-link p-2')
          .attr({
            'href': '#',
            'title': 'Recently used',
            'data-group': -1
          })
          .text('🕒');
        $nav.append($navItem);
      }

      // Normal groups
      db.getGroups().forEach(group => {
        const $navItem = $('<a>').addClass('nav-link p-2')
          .attr({
            'href': '#',
            'title': `${group.name} (${group.emojis.length})`,
            'data-group': group.id
          })
          .text(group.icon);
        $nav.append($navItem);
      });

      // Build search input
      const $searchBox = $('<form>').addClass('note-emoji-searchbox d-flex align-items-center gap-3');
      const $searchInput = $('<input>').addClass('form-control form-control-sm note-emoji-searchterm bg-secondary')
        .attr('placeholder', 'Search emojis...')
        .attr('type', 'text');

      // Build skin tone chooser
      const $toneChooser = this.$toneChooser = $('<div>').addClass('note-emoji-skin-list d-flex align-items-center gap-2 pr-1 d-none');
      const $defaultTone = $('<span>').addClass('note-emoji-skin').attr({ 'title': "Default skin tone", 'data-tone': 0 });
      $toneChooser.append($defaultTone);  // Default tone (no skin tone)
      for (let tone of db.getSkinTones()) {
        const $tone = $('<span>').addClass('note-emoji-skin')
          .css('--c', tone.color)
          .attr({ 'title': tone.label, 'data-tone': tone.id });
        $toneChooser.append($tone);
      }
      const lastTone = localStorage.getItem('note:emojis:tone') || 0;
      $toneChooser.find(`.note-emoji-skin[data-tone=${lastTone}]`).addClass('active'); // Set last used skin tone as active

      // Add search input & tone chooser to search box
      $searchBox.append($searchInput).append($toneChooser);

      // Add container for emojis
      const $emojiContainer = $('<div>').addClass('note-emoji-list scrollbar-thin d-flex flex-wrap');

      // Compose HTML
      $menu.empty()
        .append($nav)
        .append($searchBox)
        .append($emojiContainer);

      // Event handlers
      $dropdown
        .on('shown.bs.dropdown', () => {
          $searchInput.trigger('focus');
        })
        .on('hidden.bs.dropdown', () => {
          this.context.invoke('editor.selection.restoreBookmark');
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

        const groupId = $link.data('group');
        if (groupId == -10) {
          // Search mode
          this.searchEmojis(db, this.lastSearchTerm, $emojiContainer);
        }
        else {
          // Normal group mode
          this.activateGroup(db, groupId, $emojiContainer);
        }
      });

      $searchInput.on('keydown keyup mousedown mouseup click', (e) => {
        // BS dropdown "eats" these events otherwise.
        e.stopPropagation();

        if (e.type == 'mousedown') {
          // Prevent dropdown close when clicking on the search input and "moving" outside
          $(document.body).one('click.emoji', (e) => {
            e.stopPropagation();
            $(document.body).off('click.emoji');
          });
        }
        else if (e.type == 'mouseup') {
          $(document.body).off('click.emoji');
        }
      });

      $toneChooser.on('click', '.note-emoji-skin', (e) => {
        if ($(e.currentTarget).hasClass('active')) {
          return; // Already active, do nothing
        }

        $toneChooser.find('> .note-emoji-skin').removeClass('active');
        const tone = $(e.currentTarget).addClass('active').data('tone');
        localStorage.setItem('note:emojis:tone', tone); // Store selected skin tone in local storage

        const currentGroupId = this.currentGroupId;
        if (currentGroupId == -10) {
          // Search mode
          this.searchEmojis(db, this.lastSearchTerm, $emojiContainer, false);
        }
        else {
          // Normal group mode
          this.activateGroup(db, currentGroupId, $emojiContainer, false);
        }
      });

      $emojiContainer.on('click', '.note-emoji', (e) => {
        this.insertEmoji(db, $(e.currentTarget));
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

  get currentGroupId() {
    return this.$nav.find('> .nav-link.active').data('group');
  }

  get currentSkinTone() {
    return this.$toneChooser?.find('> .note-emoji-skin.active').data('tone') || 0;
  }

  activateGroup(db, groupId, $container, scroll = true) {
    $container.empty();

    this.$nav.find(`> .nav-link[data-group=${groupId}]`).addClass('active');
    this.$toneChooser.toggleClass('d-none', !db.getGroup(groupId)?.hasSkinTones);

    db.getEmojis(groupId, this.currentSkinTone).forEach(emoji => this.renderEmoji(emoji, $container));
    this.lastActiveGroup = groupId; // Store last active group

    if (scroll) $container.scrollTop(0); // Reset scroll position
  }

  searchEmojis(db, term, $container, scroll = true) {
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

      this.$toneChooser.removeClass('d-none');
      this.$nav.find('> .nav-link.active').removeClass('active');
      this.$nav.find('.nav-link-search').addClass('active');
      if (term.length === 1) {
        // Show hint for single character input
        $container.html('<div class="text-center w-100">Type at least 2 characters...</div>');
      }
      else {
        db.findEmojis(term, this.currentSkinTone).forEach(emoji => {
          this.renderEmoji(emoji, $container);
        });
      }
    }

    if (scroll) $container.scrollTop(0); // Reset scroll position
  }

  renderEmoji(emoji, $container) {
    const $emoji = $('<button>').addClass('note-emoji btn btn-clear-dark btn-icon btn-sm')
      .toggleClass('combined', emoji.combined)
      .attr('title', emoji.label)
      .attr('type', 'button')
      .attr('data-tone', emoji.tone || 0)
      .text(emoji.emoji);
    
    if (emoji.emojiBase) {
      $emoji.attr('data-emoji-base', emoji.emojiBase);
    }
  
    $container.append($emoji);
  }

  insertEmoji(db, $btn) {
    this.context.invoke('editor.insertText', $btn.text());
    db.addRecentEmoji($btn.data('emoji-base') || $btn.text(), $btn.data('tone'));
  }

  destroy() {
    // ???
  }
}