import $ from 'jquery';

// One selection frame shared by image handles and atomic components.
export default class SelectionFrame {
  constructor(context) {
    this.context = context;
    this.events = {
      'summernote.scroll': () => this.position(),
      'summernote.codeview.toggled summernote.disable': () => this.hide(),
    };
  }

  initialize() {
    this.editor = this.context.modules.editor;
    this.$area = this.context.layoutInfo.editingArea;
    this.$container = $('<div class="note-handle"></div>').prependTo(this.$area);
    this.$frame = $('<div class="note-control-selection"></div>').appendTo(this.$container);
    this.resizeObserver = new ResizeObserver(() => this.position());
  }

  show(target, owner, { controls, className = '', pointerEvents = '' } = {}) {
    if (this.target !== target || this.owner !== owner) {
      this.resizeObserver.disconnect();
      this.target = target;
      this.owner = owner;
      this.$frame.children().detach();
      if (controls) this.$frame.append(controls);
      this.$frame.attr('class', 'note-control-selection' + (className ? ' ' + className : ''))
        .css('pointer-events', pointerEvents);
      this.resizeObserver.observe(target, { box: 'border-box' });
    }
    this.editor.saveTarget(target);
    return this.position();
  }

  position() {
    if (!this.target?.isConnected) return this.hide();
    const area = this.$area[0].getBoundingClientRect();
    const rect = this.target.getBoundingClientRect();
    this.$frame.css({ display: 'block', left: rect.left - area.left,
      top: rect.top - area.top, width: rect.width, height: rect.height });
    return rect;
  }

  hide(owner) {
    // A late event from the previous owner must not clear the current selection.
    if (owner && owner !== this.owner) return;
    this.resizeObserver?.disconnect();
    if (this.target && this.editor.selection.selectedControl === this.target) this.editor.clearTarget();
    this.target = null;
    this.owner = null;
    this.$frame?.hide();
  }

  destroy() {
    this.hide();
    this.$container?.remove();
  }
}
