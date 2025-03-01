import $ from 'jquery';

export default class Fullscreen {
  constructor(context) {
    this.context = context;

    this.$editor = context.layoutInfo.editor;
    this.$toolbar = context.layoutInfo.toolbar;
    this.$editable = context.layoutInfo.editable;
    this.$codable = context.layoutInfo.codable;

    this.$window = $(window);
    this.$scrollbar = $('html, body');
    this.scrollbarClassName = 'note-fullscreen-body';
  }

  /**
   * toggle fullscreen
   */
  toggle() {
    this.$editor.toggleClass('fullscreen');
    const isFullscreen = this.isFullscreen();
    this.$scrollbar.toggleClass(this.scrollbarClassName, isFullscreen);
    this.context.invoke('toolbar.updateFullscreen', isFullscreen);

    this.context.invoke('editor.' + (isFullscreen ? 'unobserveResize' : 'observeResize'));
  }

  isFullscreen() {
    return this.$editor.hasClass('fullscreen');
  }

  destroy() {
    this.$scrollbar.removeClass(this.scrollbarClassName);
  }
}
