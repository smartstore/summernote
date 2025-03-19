import $ from 'jquery';
import func from '../core/func';
import lists from '../core/lists';
import dom from '../core/dom';
import range from '../core/range';

export default class Statusbar {
  constructor(context) {
    this.context = context;
    this.$document = $(document);
    this.$statusbar = context.layoutInfo.statusbar;
    this.$resizer = this.$statusbar.find('> .note-resizebar');
    this.$selectionPath = this.$statusbar.find('.note-selection-path');
    this.$zoomer = this.$statusbar.find('.note-zoomer');
    this.$editor = context.layoutInfo.editor;
    this.$editable = context.layoutInfo.editable;
    this.$codable = context.layoutInfo.codable;
    this.options = context.options;

    this.currentZoomLevel = 1;
    this.zoomLevels = [.25, .33, .5, .67, .75, .8, .9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];

    this.events = {
      'summernote.change summernote.selectionchange': func.debounce((e, rng) => {
        if (e.namespace == 'selectionchange') {
          this.updateSelectionPath(rng, false);
        }
        else {
          this.updateSelectionPath(this.context.invoke('editor.selection.getRange'), true);
        }
      }, 200, true),
    };
  }

  initialize() {
    if (this.options.airMode || this.options.disableResizeEditor) {
      this.destroy();
      return;
    }

    this.setZoomLevel(this.currentZoomLevel);

    this.$selectionPath.on('mouseenter mouseleave click', '.note-path-item', (e) => {
      // Selects the HTML element that was clicked in bottom selection path
      e.preventDefault();

      const target = $(e.currentTarget).data('referencedElement');
      if (target) {
        if (e.type == 'click') {
          this.removeGlimpse();
          const rng = range.createFromNode(target);
          this.context.invoke('editor.selection.setRange', rng);
        }
        else if (e.type == 'mouseleave') {
          this.removeGlimpse();
        }
        else if (e.type == 'mouseenter') {
          this.glimpseNode(target);
        }
      }
    });

    this.$zoomer.find('.note-zoom-action').on('click', e => {
      e.preventDefault();

      const incr = $(e.target).attr('data-action') == 'incr';
      const curIndex = this.zoomLevels.indexOf(this.currentZoomLevel);
      if (curIndex > -1) {
        const nextIndex = incr ? curIndex + 1 : curIndex - 1;
        if (nextIndex >= 0 && nextIndex < this.zoomLevels.length) {
          this.setZoomLevel(this.zoomLevels[nextIndex]);
        }
      }
    });

    this.$resizer.on('mousedown touchstart', e => {
      e.preventDefault();
      e.stopPropagation();

      const editorTop = this.$editor.offset().top - this.$document.scrollTop();

      const onStatusbarMove = e => {
        const originalEvent = (e.type == 'mousemove') ? e : e.originalEvent.touches[0];
        const height = originalEvent.clientY - editorTop + 4;

        this.context.invoke('editor.setHeight', height);
      };

      this.$document.on('mousemove touchmove', onStatusbarMove).one('mouseup touchend', () => {
        this.$document.off('mousemove touchmove', onStatusbarMove);
      });
    });
  }
  
  getZoomLevel() {
    return this.currentZoomLevel;
  }

  setZoomLevel(value) {
    const $label = this.$zoomer.find('.note-zoom-value');
    $label.attr('data-value', value);
    $label.text((value * 100).toFixed(0) + ' %');

    this.$editable.css('--zoom', value);

    const $decr = this.$zoomer.find('> .note-zoom-action[data-action=decr]');
    const $incr = this.$zoomer.find('> .note-zoom-action[data-action=incr]');
    
    if (value <= this.zoomLevels[0]) {
      $decr.attr('disabled', 'disabled');
    }
    else {
      $decr.removeAttr('disabled');
    }

    if (value >= lists.last(this.zoomLevels)) {
      $incr.attr('disabled', 'disabled');
    }
    else {
      $incr.removeAttr('disabled');
    }

    this.currentZoomLevel = value;
  }

  updateSelectionPath(rng, force) {
    let startNode = dom.isElement(rng) ? rng : rng?.sc;
    if (startNode) {
      const isTextNode = dom.isText(startNode);
      if (isTextNode) {
        startNode = startNode.parentNode;
      }

      if (!force && isTextNode && this.$selectionPath.data('selectedNode') === startNode) {
        // Don't bother rebuilding path if the selected start node hasn't changed.
        return;
      }

      this.removeGlimpse();
      this.$selectionPath.html('');

      const nodes = dom.parents(startNode, null, true);
      if (nodes.length) {
        nodes.reverse();

        // (perf) Remember the last selected node
        this.$selectionPath.data('selectedNode', startNode);

        nodes.forEach(n => {
          if (dom.isElement(n)) {
            let label = n.tagName.toLowerCase();
            if (n.classList.length) {
              label += `<span class="text-muted">.${n.classList[0]}</span>`;
            }
            const item = $(`<span class="note-path-item">${label}</span>`);
            item.data('referencedElement', n);
            this.$selectionPath.append(item);
  
            if (n != startNode) {
              this.$selectionPath.append($('<span class="note-path-item-divider p-1">\u203A</span>'));
            }
          }
        });
      }
      else {
        this.$selectionPath.html('&nbsp;').removeData('selectedNode');
      }
    }
  }

  glimpseNode(node) {
    if (!node) return;

    // Get the element's bounding rectangle
    const rect = node.getBoundingClientRect();
  
    // Create an overlay div
    const overlay = document.createElement('div');
    overlay.setAttribute('class', 'note-tag-glimpse');
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  
    // Append the overlay to the document body
    document.body.appendChild(overlay);
    node.glimpseOverlay = overlay;
  
    // Return the overlay element so it can be removed later if needed
    return overlay;
  }

  removeGlimpse() {
    this.$selectionPath.find('> .note-path-item').each((_, node) => {
      const overlay = $(node).data('referencedElement')?.glimpseOverlay;
      if (overlay) {
        node.glimpseOverlay = null;
        overlay.remove();
      }
    });
  }

  getHeight() {
    return this.$statusbar.outerHeight();
  }

  getContentHeight() {
    return this.$statusbar.find('> .note-statusbar-content').outerHeight();
  }

  getResizerHeight() {
    return this.$statusbar.find('> .note-resizebar').outerHeight();
  }

  destroy() {
    this.$resizer.off();
    this.$statusbar.addClass('locked');
  }
}
