import $ from 'jquery';

/**
 * EditorResizer module
 * Resizes only the .note-editable area horizontally while keeping it centered.
 * A docked handle sits flush to the left of the editable content. Minimum width: 400px.
 */
export default class EditorResizer {
  constructor(context) {
    this.context = context;
    this.$editor = context.layoutInfo.editor;
    this.$editingArea = context.layoutInfo.editingArea;
    this.$editable = context.layoutInfo.editable;
    this.options = context.options;
    this.minWidth = 500;
    this.dragging = false;

    this.events = {
      'summernote.disable summernote.codeview.toggled': () => this.hide(),
      'summernote.focusout': () => { if (!this.dragging) this.hide(); },
    };
  }

  shouldInitialize() {
    return !this.options.airMode && !this.options.disableHorizontalResize;
  }

  initialize() {
    if (this.$editingArea.css('position') === 'static') {
      this.$editingArea.css('position', 'relative');
    }

    // Styles are defined in SCSS (theme files); no inline injection required.

    this.$handle = $('<div class="note-hresize-handle" aria-label="Resize editor width" role="separator" aria-orientation="vertical" tabindex="0"></div>').appendTo(this.$editingArea);

    this.$handle.on('pointerdown', (e) => this.startPointerDrag(e));
    this.$handle.on('dblclick', () => this.resetWidth());

    this.resizeObserver = new ResizeObserver(() => this.updateHandlePosition());
    this.resizeObserver.observe(this.$editable[0]);

    // Observe fullscreen class changes to fix centering after toggle
    this.fullscreenObserver = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.attributeName === 'class') {
          this.updateHandlePosition();
        }
      }
    });
    this.fullscreenObserver.observe(this.$editor[0], { attributes: true });

    this.updateHandlePosition();
  }

  startPointerDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    this.dragging = true;
    this.$editor.addClass('resizing');

    const editableEl = this.$editable[0];
    const handleEl = this.$handle[0];
    let parentWidth = this.$editingArea.width();
    const zoom = this.getZoom();
    const handleWidth = handleEl.offsetWidth;
    const areaEl = this.$editingArea[0];
    const areaStyle = getComputedStyle(areaEl);
    const padLeft = parseFloat(areaStyle.paddingLeft) || 0;
    let areaRect = areaEl.getBoundingClientRect();
    const handleRect = handleEl.getBoundingClientRect();
    // Pointer offset inside handle (visible px), to keep cursor centered on handle while dragging
    const grabOffset = e.clientX - handleRect.left;
    // Boundaries for handle-left so width stays within [minWidth, parentWidth]
    const minVisible = this.minWidth; // visible px
    const minLeftCss = Math.max(0, padLeft - handleWidth);
    let maxLeftCss = padLeft + (parentWidth - minVisible) / 2 - handleWidth;
    if (maxLeftCss < minLeftCss) maxLeftCss = minLeftCss;

    // Direct (unbatched) updates for minimal perceived latency
    const onMove = (evt) => {
      if (!this.dragging) return;
      // Re-read layout if container changed (fullscreen, window resize, scroll)
      const pw = this.$editingArea.width();
      if (pw !== parentWidth) {
        parentWidth = pw;
        maxLeftCss = padLeft + (parentWidth - minVisible) / 2 - handleWidth;
        if (maxLeftCss < minLeftCss) maxLeftCss = minLeftCss;
      }
      areaRect = areaEl.getBoundingClientRect();
      // Desired handle-left in CSS px relative to editing-area
      const pointerXInArea = evt.clientX - areaRect.left;
      let newLeftCss = pointerXInArea - grabOffset;
      if (newLeftCss < minLeftCss) newLeftCss = minLeftCss;
      else if (newLeftCss > maxLeftCss) newLeftCss = maxLeftCss;
      // Derive visible width from handle-left, then convert to CSS width by dividing by zoom
      const marginVisible = newLeftCss - padLeft + handleWidth;
      let newVisibleWidth = parentWidth - 2 * marginVisible;
      if (newVisibleWidth < minVisible) newVisibleWidth = minVisible;
      else if (newVisibleWidth > parentWidth) newVisibleWidth = parentWidth;
      const newCssWidth = newVisibleWidth / zoom;
      // If handle is fully left, treat as reset (remove inline styles)
      if (newLeftCss <= 0) {
        editableEl.style.width = '';
        editableEl.style.marginLeft = '';
        editableEl.style.marginRight = '';
        editableEl.style.marginInline = '';
        handleEl.style.left = '0px';
        handleEl.style.top = editableEl.offsetTop + 'px';
        handleEl.style.height = this._getVisibleHeight(editableEl) + 'px';
        return;
      }
      // Apply width (CSS px)
      editableEl.style.width = newCssWidth + 'px';
      // Place handle exactly under the cursor using computed left
      handleEl.style.left = newLeftCss + 'px';
      handleEl.style.top = editableEl.offsetTop + 'px';
      // Height must reflect zoomed (visible) height
      handleEl.style.height = this._getVisibleHeight(editableEl) + 'px';
    };

    const onEnd = () => {
      this.dragging = false;
      this.$editor.removeClass('resizing');
      handleEl.releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onEnd, true);
      $('body').removeClass('note-hresize-cursor');
    };

    handleEl.setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onEnd, true);
    this._addKeyboardSupport();
    $('body').addClass('note-hresize-cursor');
  }

  applyWidth(width, parentWidth) {
    this.$editable.css('width', width + 'px');
  }

  resetWidth() {
    this.$editable.css({ width: '', marginLeft: '', marginRight: '', marginInline: '' });
    this.updateHandlePosition();
  }

  updateHandlePosition() {
    const editableEl = this.$editable[0];
    const handleWidth = this.$handle.outerWidth();
    const parentWidth = this.$editingArea.width();
    const currentWidth = this._getVisibleWidth(editableEl);
    // Use CSS centering; compute theoretical margin for handle docking
    const margin = (parentWidth - currentWidth) / 2;
    const areaStyle = getComputedStyle(this.$editingArea[0]);
    const padLeft = parseFloat(areaStyle.paddingLeft) || 0;
    const left = padLeft + margin - handleWidth;
    const top = editableEl.offsetTop;
    const height = this._getVisibleHeight(editableEl);
    this.$handle.css({ 
      left: (left < 0 ? 0 : left) + 'px', 
      top: top + 'px', 
      height: Math.floor(height) + 'px' 
    });
  }

  _addKeyboardSupport() {
    this.$handle.on('keydown.horizontalresize', (evt) => {
      if (evt.key !== 'ArrowLeft' && evt.key !== 'ArrowRight') return;
      evt.preventDefault();
      const parentWidth = this.$editingArea.width();
      const zoom = this.getZoom();
      const stepVisible = evt.shiftKey ? 40 : 15;
      const stepCss = stepVisible / zoom;
      const editableEl = this.$editable[0];
      let curCssWidth = parseFloat(editableEl.style.width);
      if (!isFinite(curCssWidth)) {
        // Derive from visible width if not explicitly set
        curCssWidth = this._getVisibleWidth(editableEl) / zoom;
      }
      curCssWidth += (evt.key === 'ArrowLeft' ? stepCss : -stepCss); // Left expands, Right shrinks
      const minCssWidth = this.minWidth / zoom;
      const maxCssWidth = parentWidth / zoom;
      curCssWidth = Math.max(minCssWidth, Math.min(curCssWidth, maxCssWidth));
      this.applyWidth(curCssWidth, parentWidth);
      this.updateHandlePosition();
    });
  }

  hide() {
    // Reserved for future (e.g., add class to hide)
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.fullscreenObserver?.disconnect();
    this.$handle?.off('keydown.horizontalresize');
    this.$handle?.off('pointerdown');
    this.$handle?.remove();
    $('body').removeClass('note-hresize-cursor');
  }

  getZoom() {
    const editableEl = this.$editable[0];
    const cs = getComputedStyle(editableEl);
    const varZoom = cs.getPropertyValue('--zoom').trim();
    const directZoom = cs.zoom && String(cs.zoom).trim();
    const parsed = parseFloat(varZoom || directZoom);
    return isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  _getVisibleWidth(el) {
    // Use boundingClientRect to reflect any zoom scaling
    return el.getBoundingClientRect().width;
  }

  _getVisibleHeight(el) {
    return el.getBoundingClientRect().height;
  }
}
