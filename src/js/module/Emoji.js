import $ from 'jquery';
import func from '../core/func';
import dom from '../core/dom';
import range from '../core/range';
import Type from '../core/Type';
import EmojiDb from './EmojiDb';

export default class Emoji {
  constructor(context) {
    this.context = context;
    this.ui = $.summernote.ui;
    this.$note = context.layoutInfo.note;
    this.options = context.options;
    this.lang = this.options.langInfo;
    this.editor = context.modules.editor;
    this.selection = this.editor.selection;

    this.$btn = null;
    this.marker = null;
    this.$popover = null;
  }

  initialize() {
    this.context.memo('button.emoji', () => {
      return this.ui.button({
        className: 'note-btn-emoji',
        contents: this.ui.icon(this.options.icons.smiley),
        tooltip: this.lang.common.emoji,
        data: { initialized: false },
        callback: ($btn) => {
          this.$btn = $btn;

          $btn.on('click', async (e) => {
            if (!this.$popover) {
              // Create popover if it doesn't exist
              this.$popover = await this.initializePopover();
            }

            if ($btn.hasClass('active')) {
              this.closePopover(e);
            } else {
              this.showPopover();
            }
          });
        }
      }).render();
    });
  }

  showPopover() {
    if (this.selection.selectedControl) return; // Prevent opening if a control is selected
    this.$btn.addClass('active');
              
    // Create marker span before range to properly position the dropdown
    const rng = this.editor.getLastRange();
    this.marker = document.createElement('span');
    this.marker.className = 'note-marker note-emoji-marker';
    this.marker.textContent = '\u200B'; // Zero-width space
    rng.getNativeRange().insertNode(this.marker);

    this.editor.showPopover(this.$popover, this.marker, 'bottom', 'viewport'); 
  }

  closePopover(e) {
    if (!this.$popover) return;
    if (Type.isNullOrUndefined(e) || !$(e.target).closest('.note-emoji-popover').length) {
      this.$btn.removeClass('active');
      this.editor.hidePopover(this.$popover);
      this.marker?.remove();
      this.marker = null;
    } 
  }

  async initializePopover() {
    const $popover = this.ui.popover({
      className: 'note-emoji-popover',
    }).render()
      .appendTo(this.options.container)
      .on('mousedown', e => e.preventDefault());

    // Show loading state
    $popover
      .find('> .popover-content')
      .removeClass('note-toolbar')
      .addClass('popover-content-emoji')
      .html('<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div></div>');

    const db = await EmojiDb.create(this.context);
    await this.buildPicker($popover, db);

    // Hide when clicking elsewhere
    $(document).on('mousedown', (e) => this.closePopover(e));

    return $popover;
  }

  async buildPicker($popover, db) {
    const $menu = $popover.find('> .popover-content');

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
      this.$note
        .on('summernote.popover.shown', (_, $p) => {
          if ($p == this.$popover) $searchInput.trigger('focus');
        })
        .on('summernote.popover.hidden', (_, $p) => {
          if ($p == this.$popover) this.editor.selection.restoreBookmark();
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
    this.editor.selection.restoreBookmark();
    this.editor.insertText($btn.text(), true);
    db.addRecentEmoji($btn.data('emoji-base') || $btn.text(), $btn.data('tone'));
  }

  destroy() {
    this.$popover?.remove();
    this.$popover = null;
  }
}