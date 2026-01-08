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
      'summernote.disable summernote.codeview.toggled': () => { 
        this.hide() 
      },
      'summernote.fullscreen.toggled summernote.editor.resized': () => { 
        this.updateHandlePosition() 
      },
      'summernote.focusout': () => { 
        if (!this.dragging) this.hide(); 
      },
    };
  }

  shouldInitialize() {
    return !this.options.airMode && !this.options.disableHorizontalResize;
  }

  initialize() {
    this.$handle = $('<div class="note-hresize-handle" aria-label="Resize editor width" role="separator" aria-orientation="vertical" tabindex="0"></div>').appendTo(this.$editingArea);

    this.$handle.on('pointerdown', (e) => this.startPointerDrag(e));
    this.$handle.on('dblclick', () => this.resetWidth());

    this.updateHandlePosition();
  }

  startPointerDrag(e) {
    e.preventDefault();
    e.stopPropagation();

    this.dragging = true;
    this.$editor.addClass('resizing');

    const editable = this.$editable[0];
    const handle = this.$handle[0];
    let parentWidth = this.$editingArea.width();
    const zoom = this.context.invoke('statusbar.getZoomLevel');
    const area = this.$editingArea[0];
    const areaStyle = getComputedStyle(area);
    const padLeft = parseFloat(areaStyle.paddingLeft) || 0;
    let areaRect = area.getBoundingClientRect();
    const handleRect = handle.getBoundingClientRect();
    const editorRect = editable.getBoundingClientRect();
    // Pointer offset inside handle (visible px), to keep cursor centered on handle while dragging
    const grabOffset = e.clientX - handleRect.left;
    // Boundaries for handle-left so width stays within [minWidth, parentWidth]
    const minVisible = this.minWidth; // visible px
    const minLeftCss = padLeft; // overlay: start at padding-left (no extra space)
    let maxLeftCss = padLeft + (parentWidth - minVisible) / 2;
    if (maxLeftCss < minLeftCss) maxLeftCss = minLeftCss;

    // Direct (unbatched) updates for minimal perceived latency
    const onMove = (evt) => {
      if (!this.dragging) return;
      // Re-read layout if container changed (fullscreen, window resize, scroll)
      const pw = this.$editingArea.width();
      if (pw !== parentWidth) {
        parentWidth = pw;
        maxLeftCss = padLeft + (parentWidth - minVisible) / 2;
        if (maxLeftCss < minLeftCss) maxLeftCss = minLeftCss;
      }
      areaRect = area.getBoundingClientRect();
      // Desired handle-left in CSS px relative to editing-area
      const pointerXInArea = evt.clientX - areaRect.left;
      let newLeftCss = pointerXInArea - grabOffset;
      if (newLeftCss < minLeftCss) newLeftCss = minLeftCss;
      else if (newLeftCss > maxLeftCss) newLeftCss = maxLeftCss;
      // Derive visible width from handle-left, then convert to CSS width by dividing by zoom
      const marginVisible = newLeftCss - padLeft; // handle overlays, margin = distance from padding
      let newVisibleWidth = parentWidth - 2 * marginVisible;
      if (newVisibleWidth < minVisible) newVisibleWidth = minVisible;
      else if (newVisibleWidth > parentWidth) newVisibleWidth = parentWidth;
      const newCssWidth = newVisibleWidth / zoom;
      // If handle is fully left (at padding), treat as reset (remove inline styles)
      if (newLeftCss <= padLeft) {
        editable.style.width = '';
        handle.style.left = '0px';
        handle.style.top = editable.offsetTop + 'px';
        handle.style.height = editorRect.height + 'px';
        return;
      }
      // Apply width (CSS px)
      editable.style.width = newCssWidth + 'px';
      // Place handle exactly under the cursor using computed left (overlay)
      handle.style.left = newLeftCss + 'px';
      handle.style.top = editable.offsetTop + 'px';
      // Height must reflect zoomed (visible) height
      handle.style.height = editorRect.height + 'px';
    };

    const onEnd = () => {
      this.dragging = false;
      this.$editor.removeClass('resizing');
      handle.releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onEnd, true);
      $('body').css('cursor', '');
    };

    handle.setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onEnd, true);
    $('body').css('cursor', 'col-resize');
  }

  resetWidth() {
    this.$editable.css({ width: '' });
    this.updateHandlePosition();
  }

  updateHandlePosition() {
    const editable = this.$editable[0];
    //const handleWidth = this.$handle.outerWidth();
    const parentWidth = this.$editingArea.width();
    const editorRect = editable.getBoundingClientRect();
    const currentWidth = editorRect.width;
    // Use CSS centering; compute theoretical margin for handle docking
    const margin = (parentWidth - currentWidth) / 2;
    const areaStyle = getComputedStyle(this.$editingArea[0]);
    const padLeft = parseFloat(areaStyle.paddingLeft) || 0;
    // Overlay: handle sits directly on left edge of .note-editable
    const left = padLeft + margin;
    const top = editable.offsetTop;
    const height = editorRect.height;
    this.$handle.css({ 
      left: (left < 0 ? 0 : left) + 'px', 
      top: top + 'px', 
      height: Math.floor(height) + 'px' 
    });
  }

  hide() {
    // Reserved for future (e.g., add class to hide)
  }

  destroy() {
    this.$handle?.off('pointerdown');
    this.$handle?.remove();
    $('body').css('cursor', '');
  }
}
