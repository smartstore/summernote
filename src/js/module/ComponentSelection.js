import $ from 'jquery';
import range from '../core/range';

// Inline components are selectable objects, but never resizable image controls.
export default class ComponentSelection {
  constructor(context) {
    this.context = context;
    this.originalAttributes = new WeakMap();
    this.events = {
      'summernote.codeview.toggled summernote.disable': () => this.hide(),
      'summernote.scroll': () => this.position(),
    };
  }

  shouldInitialize() {
    return this.context.options.atomicElements.length > 0;
  }

  initialize() {
    this.editor = this.context.modules.editor;
    this.root = this.editor.editable;
    this.selector = this.context.options.atomicElements.join(',');
    this.onOutsideInteraction = e => {
      if (!this.target) return;
      const owner = e.target.closest?.('[data-note-owner]');
      if (!this.context.layoutInfo.editor[0].contains(e.target)
        && owner?.getAttribute('data-note-owner') !== String(this.context.options.id)) this.hide();
    };
    this.root.ownerDocument.addEventListener('mousedown', this.onOutsideInteraction, true);
    this.root.ownerDocument.addEventListener('focusin', this.onOutsideInteraction, true);
    this.$frame = $('<div class="note-control-selection note-component-selection">' +
      '<div class="note-control-holder note-control-nw"></div>' +
      '<div class="note-control-holder note-control-ne"></div>' +
      '<div class="note-control-holder note-control-sw"></div>' +
      '<div class="note-control-holder note-control-se"></div></div>')
      .css('pointer-events', 'none').appendTo(this.context.layoutInfo.editingArea);
    this.resizeObserver = new ResizeObserver(() => this.position());
    this.prepare();
    this.observer = new MutationObserver(() => { this.prepare(); this.position(); });
    this.observer.observe(this.root, { childList: true, subtree: true });
    this.onMouseDown = e => {
      const target = e.target.closest?.(this.selector);
      if (!target || !this.root.contains(target) || this.context.isDisabled()) {
        this.hide();
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      this.root.focus();
      this.context.invoke('handle.hide');
      this.context.invoke('imagePopover.hide');
      const nativeRange = this.root.ownerDocument.createRange();
      nativeRange.selectNode(target);
      const rect = target.getBoundingClientRect();
      const edge = Math.min(4, rect.width / 4);
      const left = e.clientX - rect.left <= edge;
      const right = rect.right - e.clientX <= edge;
      if (left || right) {
        const rtl = getComputedStyle(target).direction === 'rtl';
        nativeRange.collapse(left !== rtl);
        this.editor.selection.setRange(range.createFromNativeRange(nativeRange));
        this.hide();
        return;
      }
      this.resizeObserver.disconnect();
      this.target = target;
      this.resizeObserver.observe(target, { box: 'border-box' });
      this.editor.selection.setRange(range.createFromNativeRange(nativeRange));
      this.editor.saveTarget(target);
      this.editor.selection.triggerChangeEvent(target);
      this.position();
      this.context.triggerEvent('component.selected', target);
    };
    this.onKeyDown = e => {
      if (!this.target || !this.root.contains(this.target)) return;
      if (['ArrowLeft', 'ArrowRight'].includes(e.key) && !e.shiftKey) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const nativeRange = this.root.ownerDocument.createRange();
        nativeRange.selectNode(this.target);
        const rtl = getComputedStyle(this.target).direction === 'rtl';
        nativeRange.collapse((e.key === 'ArrowLeft') !== rtl);
        this.editor.selection.setRange(range.createFromNativeRange(nativeRange));
        this.hide();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.editor.history.recordUndo();
        this.editor.beforeCommand();
        const node = this.target;
        const nativeRange = this.root.ownerDocument.createRange();
        nativeRange.setStartBefore(node);
        nativeRange.collapse(true);
        node.remove();
        this.editor.selection.setRange(range.createFromNativeRange(nativeRange));
        this.hide();
        this.editor.afterCommand();
      } else {
        this.hide();
      }
    };
    this.root.addEventListener('mousedown', this.onMouseDown, true);
    this.root.addEventListener('keydown', this.onKeyDown, true);
  }

  prepare() {
    for (const node of this.root.querySelectorAll(this.selector)) {
      if (node.parentElement.closest(this.selector)) continue;
      if (!this.originalAttributes.has(node)) {
        this.originalAttributes.set(node, node.getAttribute('contenteditable'));
        node.setAttribute('contenteditable', 'false');
      }
    }
  }

  cleanSource(node, clone) {
    if (this.originalAttributes.has(node)) {
      const value = this.originalAttributes.get(node);
      if (value === null) clone.removeAttribute('contenteditable');
      else clone.setAttribute('contenteditable', value);
    }
    return clone;
  }

  position() {
    if (!this.target?.isConnected) return this.hide();
    const area = this.context.layoutInfo.editingArea[0].getBoundingClientRect();
    const rect = this.target.getBoundingClientRect();
    this.$frame.css({ display: 'block', left: rect.left - area.left,
      top: rect.top - area.top, width: rect.width, height: rect.height });
  }

  hide() {
    this.resizeObserver?.disconnect();
    if (this.target) this.editor.clearTarget();
    this.target = null;
    this.$frame?.hide();
  }

  destroy() {
    this.root?.ownerDocument.removeEventListener('mousedown', this.onOutsideInteraction, true);
    this.root?.ownerDocument.removeEventListener('focusin', this.onOutsideInteraction, true);
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    this.root?.removeEventListener('mousedown', this.onMouseDown, true);
    this.root?.removeEventListener('keydown', this.onKeyDown, true);
    this.$frame?.remove();
  }
}
