import $ from 'jquery';
import dom from '../core/dom';

export default class Toolbar {
  constructor(context) {
    this.context = context;

    this.$window = $(window);
    this.$document = $(document);

    this.ui = $.summernote.ui;
    this.$note = context.layoutInfo.note;
    this.$editor = context.layoutInfo.editor;
    this.$toolbar = context.layoutInfo.toolbar;
    this.$editable = context.layoutInfo.editable;
    this.$statusbar = context.layoutInfo.statusbar;
    this.options = context.options;

    this.isFollowing = false;
    this.followScroll = this.followScroll.bind(this);
  }

  shouldInitialize() {
    return !this.options.airMode;
  }

  initialize() {
    this.options.toolbar = this.options.toolbar || [];

    if (!this.options.toolbar.length) {
      this.$toolbar.hide();
    } else {
      this.context.invoke('buttons.build', this.$toolbar, this.options.toolbar);
    }

    if (this.options.toolbarContainer) {
      this.$toolbar.appendTo(this.options.toolbarContainer);
    }

    this.changeContainer(false);

    this.$note.on('summernote.keyup summernote.mouseup summernote.change', () => {
      this.context.invoke('buttons.updateCurrentStyle');
    });

    this.$note.on('summernote.change', () => {
      let history = this.context.modules.editor.history;
      this.$toolbar.find('.note-undo').toggleClass('disabled', !history.canUndo());
      this.$toolbar.find('.note-redo').toggleClass('disabled', !history.canRedo());
    });

    this.context.invoke('buttons.updateCurrentStyle');

    this.$toolbar.on('mousedown touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    if (this.options.followingToolbar) {
      this.$window.on('scroll resize', this.followScroll);
      this.$editor.on('focusin', this.followScroll);
      this.$editor.on('focusout', (e) => {
        if (dom.isContainedTarget(e)) {
          return;
        }
        this.followScroll();
      });
    }
  }

  destroy() {
    this.$toolbar.children().remove();

    if (this.options.followingToolbar) {
      this.$window.off('scroll resize', this.followScroll);
    }
  }

  followScroll() {
    if (this.$editor.hasClass('fullscreen')) {
      return false;
    }

    const editorHeight = this.$editor.outerHeight();
    const editorWidth = this.$editor.width();
    // const toolbarHeight = this.$toolbar.outerHeight();
    // const statusbarHeight = this.$statusbar.outerHeight();

    // check if the web app is currently using another static bar
    let otherBarHeight = 0;
    if (this.options.otherStaticBar) {
      otherBarHeight = $(this.options.otherStaticBar).outerHeight();
    }

    let stickyOffset = parseInt(getComputedStyle(document.body).getPropertyValue('--content-offset') || 0);

    const currentOffset = this.$document.scrollTop();
    const editorOffsetTop = this.$editor.offset().top;
    const editorOffsetBottom = editorOffsetTop + editorHeight;
    const activateOffset = editorOffsetTop - otherBarHeight - stickyOffset;
    const deactivateOffsetBottom = editorOffsetBottom - otherBarHeight - stickyOffset;
    const hasFocus = this.context.modules.editor.hasFocus();
    
    if (hasFocus && !this.isFollowing && 
      (currentOffset > activateOffset && currentOffset < deactivateOffsetBottom)) {
      this.isFollowing = true;
      this.$toolbar.addClass('note-toolbar-sticky').css({
        top: stickyOffset,
        width: editorWidth
      });
    } 
    else if (this.isFollowing &&
      (!hasFocus || currentOffset < activateOffset || currentOffset > deactivateOffsetBottom)) {
      this.isFollowing = false;
      this.$toolbar.removeClass('note-toolbar-sticky').css({ top: '', bottom: '', width: '' });
    }
  }

  changeContainer(isFullscreen) {
    if (isFullscreen) {
      this.$toolbar.prependTo(this.$editor);
    } else {
      if (this.options.toolbarContainer) {
        this.$toolbar.appendTo(this.options.toolbarContainer);
      }
    }
    if (this.options.followingToolbar) {
      this.followScroll();
    }
  }

  updateFullscreen(isFullscreen) {
    this.ui.toggleBtnActive(this.$toolbar.find('.btn-fullscreen'), isFullscreen);

    this.changeContainer(isFullscreen);
  }

  updateCodeview(isCodeview) {
    this.ui.toggleBtnActive(this.$toolbar.find('.btn-codeview'), isCodeview);
    if (isCodeview) {
      this.deactivate();
    } else {
      this.activate();
    }
  }

  activate(isIncludeCodeview) {
    let $btn = this.$toolbar.find('button');
    if (!isIncludeCodeview) {
      $btn = $btn.not('.note-codeview-keep');
    }
    this.ui.toggleBtn($btn, true);
  }

  deactivate(isIncludeCodeview) {
    let $btn = this.$toolbar.find('button');
    if (!isIncludeCodeview) {
      $btn = $btn.not('.note-codeview-keep');
    }
    this.ui.toggleBtn($btn, false);
  }

  getHeight() {
    return this.$toolbar.outerHeight();
  }
}
