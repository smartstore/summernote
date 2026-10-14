import $ from 'jquery';
import func from '../core/func';
import dom from '../core/dom';
import range from '../core/range';
import Type from '../core/Type';
import EmojiDb from './EmojiDb';

let pickerId = 0;

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
    this.pickerTabs = new Map();
    this.pickerId = ++pickerId;
  }

  initialize() {
    for (const tab of this.options.emojiPickerTabs) this.addTab(tab);
    this.context.memo('button.emoji', () => {
      return this.ui.button({
        className: 'note-btn-emoji',
        contents: this.ui.icon(this.options.icons.smiley),
        tooltip: this.lang.emoji.emoji,
        data: { initialized: false },
        callback: ($btn) => {
          this.$btn = $btn;

          $btn.on('click', async (e) => {
            e.preventDefault();

            if (!this.$popover) {
              // Create popover if it doesn't exist
              this.$popover = this.createPopover();
              // Show early to visualize progress
              this.showPopover();
              // Initialize and build popover content
              await this.initializePopover(this.$popover);
            }
            else {
              if ($btn.hasClass('active')) {
                this.closePopover(e);
              } else {
                this.showPopover();
              }
            }

            return false;
          });
        }
      }).render();
    });
  }

  showPopover() {
    if (this.selection.selectedControl) return; // Prevent opening if a control is selected
    this.$btn.addClass('active');

    // Clone the current range
    const originalRange = this.editor.getLastRange().getNativeRange().cloneRange();

    // Collapse a second Range at the start of the original
    const insertRange = originalRange.cloneRange();
    insertRange.collapse(true);

    // Create marker span before range to properly position the dropdown
    this.marker = document.createElement('span');
    this.marker.className = 'note-marker note-emoji-marker';
    this.marker.textContent = '\u200B'; // Zero-width space

    // Insert the marker at the start of the current selection
    insertRange.insertNode(this.marker);

    // Restore native Selection
    this.pickerRange = originalRange;
    this.editor.selection.setRange(originalRange);

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

  createPopover() {
    const $popover = this.ui.popover({
      className: 'note-emoji-popover',
    }).render()
      .appendTo(this.options.container)
      .on('mousedown', e => {
        if (!$(e.target).closest('input, textarea, select, button').length) e.preventDefault();
      });

    // Show loading state
    $popover
      .find('> .popover-content')
      .removeClass('note-toolbar')
      .addClass('popover-content-emoji')
      .html('<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div></div>');

    // Hide when clicking elsewhere
    this.onDocumentMouseDown = e => this.closePopover(e);
    $(document).on('mousedown', this.onDocumentMouseDown);

    return $popover;
  }

  /** Registers an application-owned picker tab without introducing dependencies. */
  addTab(tab) {
    if (!tab.id || tab.id === 'emoji' || this.pickerTabs.has(tab.id)) {
      throw new Error('Picker tab IDs must be unique and cannot be emoji.');
    }
    this.pickerTabs.set(tab.id, { ...tab });
    if (this.$tabs) this.mountTab(this.pickerTabs.get(tab.id));
  }

  createTabs($popover) {
    const $body = $popover.find('> .popover-content');
    this.$emojiPane = $('<div>').append($body.contents());
    this.$panes = $('<div class="flex-grow-1">').css('min-height', 0).appendTo($body);
    const $switcher = $('<div class="d-flex justify-content-center flex-shrink-0 p-2 pb-0"></div>').prependTo($body);
    this.$tabs = $('<div class="nav nav-segmented" role="tablist"></div>').css({ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: '1fr', '--nav-link-padding-y': '0.25rem', '--nav-link-padding-x': '1rem', '--nav-link-font-size': '0.875rem' }).appendTo($switcher);
    this.mountTab({ id: 'emoji', label: this.lang.emoji.emoji, icon: '😀', $pane: this.$emojiPane, activate: pane => $(pane).find('input').trigger('focus') });
    for (const tab of this.pickerTabs.values()) this.mountTab(tab);
    this.activateTab('emoji');
    this.$tabs.on('keydown', 'button', e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const buttons = this.$tabs.find('button').toArray();
      let index = buttons.indexOf(e.currentTarget);
      index = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1
        : (index + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length;
      buttons[index].click();
      buttons[index].focus();
    });
  }

  mountTab(tab) {
    const id = 'note-picker-' + this.pickerId + '-' + this.$tabs.children().length;
    const $icon = tab.icon?.nodeType === 1
      ? $(tab.icon.cloneNode(true))
      : $('<span>').text(tab.icon || '◇');
    $icon.attr('aria-hidden', 'true');
    const $button = $('<button type="button" class="nav-link" role="tab"></button>')
      .append($icon)
      .append(document.createTextNode(tab.label)).attr({ id, 'aria-controls': id + '-pane' })
      .data('picker-tab', tab.id).appendTo(this.$tabs)
      .on('click', () => this.activateTab(tab.id));
    tab.$pane = (tab.$pane || $('<div>')).css({ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }).attr({ id: id + '-pane', role: 'tabpanel', 'aria-labelledby': id })
      .appendTo(this.$panes);
    if (tab.id !== 'emoji') tab.$pane.css('padding', 'var(--note-emoji-padding)');
    $button.data('definition', tab);
    const hasTabs = this.$tabs.children().length > 1;
    this.$tabs.parent().toggleClass('d-flex', hasTabs).toggleClass('d-none', !hasTabs);
    tab.$pane.toggle(tab.id === this.activeTab);
  }

  async activateTab(id) {
    this.activeTab = id;
    for (const button of this.$tabs.children().toArray()) {
      const tab = $(button).data('definition');
      const active = tab.id === id;
      $(button).toggleClass('active', active).attr({ 'aria-selected': String(active), tabindex: active ? 0 : -1 });
      tab.$pane.toggle(active);
      if (active && tab.render && !tab.initialized) {
        tab.initialized = true;
        await tab.render(tab.$pane[0], {
          context: this.context,
          insertHtml: html => {
            const insertion = this.pickerRange.cloneRange();
            this.closePopover();
            this.editor.focus();
            const wrappedRange = range.createFromNativeRange(insertion);
            this.selection.setRange(wrappedRange);
            this.editor.pasteHTML(html, [], wrappedRange);
          },
          close: () => this.closePopover(),
        });
      }
      if (active && this.activeTab === id) tab.activate?.(tab.$pane[0]);
    }
  }

  async initializePopover($popover) {
    this.createTabs($popover);
    const db = await EmojiDb.create(this.context);
    await this.buildPicker($popover, db);
  }

  async buildPicker($popover, db) {
    const $menu = this.$emojiPane || $popover.find('> .popover-content');

    try {
      // Build navigation
      const $nav = $('<div>').addClass('nav nav-tabs nav-tabs-line nav-emoji mb-2');
      this.$nav = $nav;

      // Recent emojis
      if (db.hasRecentEmojis()) {
        const $navItem = $('<a>').addClass('nav-link p-2')
          .attr({
            'href': '#',
            'title': this.lang.emoji.recent,
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
        .attr('placeholder', this.lang.emoji.search)
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
          if ($p == this.$popover && this.activeTab === 'emoji') setTimeout(() => $searchInput.trigger('focus'), 0);
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
      this.$nav.prepend(`<a class="nav-link nav-link-search p-2 active" href="#" title="${this.lang.common.search}" data-group="-10">🔍️</a>`);
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
        $container.html('<div class="text-center w-100">' + this.lang.emoji.typeTwo + '</div>');
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
    const rng = this.editor.lastRange.getNativeRange();
    rng.deleteContents();
    let textNode = dom.createText($btn.text());
    rng.insertNode(textNode);

    this.editor.setLastRange(range.create(textNode, dom.nodeLength(textNode)));

    db.addRecentEmoji($btn.data('emoji-base') || $btn.text(), $btn.data('tone'));
  }

  destroy() {
    $(document).off('mousedown', this.onDocumentMouseDown);
    for (const tab of this.pickerTabs.values()) tab.destroy?.(tab.$pane?.[0]);
    this.marker?.remove();
    this.$popover?.remove();
    this.$popover = null;
  }
}