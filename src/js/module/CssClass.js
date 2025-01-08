import $ from 'jquery';
import _ from 'underscore';
import dom from '../core/dom';
import range from '../core/range';
import lists from '../core/lists';

const isInlineElement = (el) => dom.isInline(el);

export default class CssClass {
  constructor(context) {
    this.context = context;

    this.ui = $.summernote.ui;
    this.$body = $(document.body);
    this.$editor = context.layoutInfo.editor;
    this.options = context.options;
    this.lang = this.options.langInfo;
    this.buttons = context.modules.buttons;
    this.editor = context.modules.editor;
    this.selection = this.editor.selection;
  }

  initialize() {
    this.addFormats();
    this.initializeButtons();

    $('.note-toolbar', this.$editor).on('click', '.btn-group-cssclass .dropdown-item', (e) => {
      // Prevent dropdown close
      e.preventDefault();
      e.stopPropagation();

      this.refreshDropdown($(e.currentTarget).parent());
    });

    $('.note-toolbar', this.$editor).on('mousedown', '.btn-group-cssclass > .btn', (e) => {
      this.refreshDropdown($(e.currentTarget).next());
    });
  }

  addFormats() {
    if (typeof this.options.cssclass === 'undefined') {
      this.options.cssclass = {};
    }

    const rgAlert = /^alert(-.+)?$/;
    const rgBtn = /^btn(-.+)?$/;
    const rgBg = /^bg-.+$/;
    const rgTextColor = /^text-(muted|primary|success|danger|warning|info|dark|white)$/;
    const rgFontSize = /^fs-(xs|sm)$/;
    const rgDisplay = /^display-[1-4]$/;
    const rgWidth = /^w-(25|50|75|100)$/;
    const rgRounded = /^rounded(-.+)?$/;

    const metadata = {
      imageShapes: {
        "img-fluid": { inline: true },
        "border": { inline: true },
        "rounded": { toggle: /^(rounded(-.+)?)|img-thumbnail$/, inline: true },
        "rounded-circle": { toggle: /^(rounded(-.+)?)|img-thumbnail$/, inline: true },
        "img-thumbnail": { toggle: /^rounded(-.+)?$/, inline: true },
        "shadow-sm": { toggle: /^(shadow(-.+)?)$/, inline: true },
        "shadow": { toggle: /^(shadow(-.+)?)$/, inline: true },
        "shadow-lg": { toggle: /^(shadow(-.+)?)$/, inline: true }
      },
      formats: {
        "fs-xs": { inline: true, toggle: rgFontSize },
        "fs-sm": { inline: true, toggle: rgFontSize },
        "lead": {},
        "display-4": { displayClass: "fs-h4", toggle: rgDisplay },
        "display-3": { displayClass: "fs-h3", toggle: rgDisplay },
        "display-2": { displayClass: "fs-h2", toggle: rgDisplay },
        "display-1": { displayClass: "fs-h1", toggle: rgDisplay },
        "alert alert-primary": { toggle: rgAlert },
        "alert alert-secondary": { toggle: rgAlert },
        "alert alert-success": { toggle: rgAlert },
        "alert alert-danger": { toggle: rgAlert },
        "alert alert-warning": { toggle: rgAlert },
        "alert alert-info": { toggle: rgAlert },
        "alert alert-light": { toggle: rgAlert },
        "alert alert-dark": { toggle: rgAlert },
        "bg-primary": { displayClass: "px-2 py-1 text-white", inline: true, toggle: rgBg },
        "bg-secondary": { displayClass: "px-2 py-1", inline: true, toggle: rgBg },
        "bg-success": { displayClass: "px-2 py-1 text-white", inline: true, toggle: rgBg },
        "bg-danger": { displayClass: "px-2 py-1 text-white", inline: true, toggle: rgBg },
        "bg-warning": { displayClass: "px-2 py-1 text-white", inline: true, toggle: rgBg },
        "bg-info": { displayClass: "px-2 py-1 text-white", inline: true, toggle: rgBg },
        "bg-light": { displayClass: "px-2 py-1", inline: true, toggle: rgBg },
        "bg-dark": { displayClass: "px-2 py-1 text-white", inline: true, toggle: rgBg },
        "bg-white": { displayClass: "px-2 py-1 border", inline: true, toggle: rgBg },
        "rtl": { displayClass: "text-uppercase", inline: true, toggle: /^ltr$/ },
        "ltr": { displayClass: "text-uppercase", inline: true, toggle: /^rtl$/ },
        "text-muted": { inline: true, toggle: rgTextColor },
        "text-primary": { inline: true, toggle: rgTextColor },
        "text-success": { inline: true, toggle: rgTextColor },
        "text-danger": { inline: true, toggle: rgTextColor },
        "text-warning": { inline: true, toggle: rgTextColor },
        "text-info": { inline: true, toggle: rgTextColor },
        "text-dark": { inline: true, toggle: rgTextColor },
        "text-white": { displayClass: "bg-gray", inline: true, toggle: rgTextColor },
        "font-weight-medium": { inline: true },
        "w-25": { displayClass: "px-2 py-1 bg-light border", toggle: rgWidth },
        "w-50": { displayClass: "px-2 py-1 bg-light border", toggle: rgWidth },
        "w-75": { displayClass: "px-2 py-1 bg-light border", toggle: rgWidth },
        "w-100": { displayClass: "px-2 py-1 bg-light border", toggle: rgWidth },
        "btn btn-primary": { inline: true, toggle: rgBtn, predicate: "a" },
        "btn btn-secondary": { inline: true, toggle: rgBtn, predicate: "a" },
        "btn btn-success": { inline: true, toggle: rgBtn, predicate: "a" },
        "btn btn-danger": { inline: true, toggle: rgBtn, predicate: "a" },
        "btn btn-warning": { inline: true, toggle: rgBtn, predicate: "a" },
        "btn btn-info": { inline: true, toggle: rgBtn, predicate: "a" },
        "btn btn-light": { inline: true, toggle: rgBtn, predicate: "a" },
        "btn btn-dark": { inline: true, toggle: rgBtn, predicate: "a" },
        "rounded-0": { displayClass: "px-2 py-1 bg-light border", toggle: rgRounded },
        "rounded-1": { displayClass: "px-2 py-1 bg-light border rounded-1", toggle: rgRounded },
        "rounded-2": { displayClass: "px-2 py-1 bg-light border rounded-2", toggle: rgRounded },
        "rounded-3": { displayClass: "px-2 py-1 bg-light border rounded-3", toggle: rgRounded },
        "rounded-4": { displayClass: "px-2 py-2 bg-light border rounded-4", toggle: rgRounded },
        "rounded-5": { displayClass: "px-2 py-2 bg-light border rounded-5", toggle: rgRounded },
        "rounded-pill": { displayClass: "px-2 py-1 bg-light border rounded-pill", toggle: rgRounded },
        "list-unstyled": {}
      }
    };

    this.options.cssclass = $.extend(true, metadata, this.options.cssclass);
  }

  initializeButtons() {
    this.context.memo('button.cssclass', () => {
      return this.ui.buttonGroup({
        className: 'btn-group-cssclass',
        children: [
          this.ui.button({
            className: 'dropdown-toggle',
            contents: this.ui.icon("fab fa-css3"), // TODO
            callback: (btn) => {
              btn.data("placement", "bottom")
                .data("trigger", 'hover')
                .attr("title", this.lang.attrs.cssClass)
                .tooltip();
            },
            data: {
              toggle: 'dropdown'
            }
          }),
          this.ui.dropdown({
            className: 'dropdown-cssclass scrollable-menu',
            items: _.keys(this.options.cssclass.formats),
            template: (item) => {
              const obj = this.options.cssclass.formats[item] || {};

              let cssClass = item;
              if (obj.displayClass) {
                cssClass += " " + obj.displayClass;
              }
              if (!obj.inline) {
                cssClass += " d-block";
              }

              const cssStyle = obj.style ? ' style="{0}"'.format(obj.style) : '';
              return `<span class="${cssClass}" title="${item}"${cssStyle}>${item}</span>`;
            },
            click: (e, namespace, value) => {
              e.preventDefault();

              var ddi = $(e.target).closest('[data-value]');
              value = value || ddi.data('value');
              var obj = this.options.cssclass.formats[value] || {};

              this.applyClassToSelection(value, obj);
            }
          })
        ]
      }).render();
    });

    // Image shape stuff
    this.context.memo('button.imageShapes', () => {
      const imageShapes = Object.keys(this.options.cssclass.imageShapes);
      const button = this.ui.buttonGroup({
        className: 'btn-group-imageshape',
        children: [
          this.ui.button({
            className: 'dropdown-toggle',
            contents: this.ui.icon("fab fa-css3"),
            tooltip: this.lang.imageShapes.tooltip,
            click: (e) => {
              this.refreshDropdown($(e.currentTarget).next(), $(this.selection.selectedControl), true);
            },
            data: {
              toggle: 'dropdown'
            }
          }),
          this.ui.dropdownCheck({
            className: 'dropdown-shape',
            checkClassName: this.options.icons.menuCheck,
            items: imageShapes,
            template: (item) => {
              const index = imageShapes.indexOf(item);
              return this.lang.imageShapes.tooltipShapeOptions[index];
            },
            click: (e) => {
              e.preventDefault();

              const ddi = $(e.target).closest('[data-value]');
              const value = ddi.data('value');
              const obj = this.options.cssclass.imageShapes[value] || {};

              this.applyClassToSelection(value, obj);
            }
          })
        ]
      });

      return button.render();
    });
  }

  applyClassToSelection(value, obj) {
    let rng = this.selection.getRange();
    if (!this.selection.isValidRange(rng)) {
      return;
    }

    const controlNode = $(this.selection.selectedControl);
    const sel = this.selection.nativeSelection;
    let node = $(sel.focusNode.parentElement, ".note-editable");
    const caret = sel.type === 'None' || sel.type === 'Caret';

    const apply = (el) => {
      const $el = $(el);
      if ($el.is('.' + value.replace(' ', '.'))) {
        // "btn btn-info" > ".btn.btn-info"
        // Just remove the same style
        $el.removeClass(value);
        if (!$el.attr('class')) {
          $el.removeAttr('class');
        }

        if (isInlineElement(el) && !el.attributes.length) {
          // Unwrap the node when it is inline and no attributes are present
          $el.replaceWith($el.html());
        }
      }
      else {
        if (obj.toggle) {
          // Remove equivalent classes first
          const classNames = ($el.attr('class') || '').split(' ');
          _.each(classNames, (name) => {
            if (name && name !== value && obj.toggle.test(name)) {
              $el.removeClass(name);
            }
          });
        }

        $el.toggleClass(value);
      }

      return el;
    }

    this.editor.beforeCommand();

    if (controlNode.length) {
      // Most likely IMG is selected
      if (obj.inline) {
        apply(controlNode);
      }
    }
    else {
      if (!obj.inline) {
        // Apply a block-style only to a block-level element
        if (isInlineElement(node[0])) {
          // Traverse parents until a block-level element is found
          node = $(dom.closest(node, n => !isInlineElement(n)));
        }

        if (node.length && !dom.isEditableRoot(node[0])) {
          apply(node);
        }
      }
      else if (obj.inline && caret) {
        apply(node);
      }
      else if (sel.rangeCount) {
        const spans = this.editor.style.styleNodes(rng).map(apply);
        this.selection.setRange(range.createFromNodes(spans));
      }
    }

    this.editor.afterCommand();
  }

  refreshDropdown(drop, node /* selectedNode */, noBubble) {
    node = node || $(this.selection.nativeSelection.focusNode, ".note-editable");

    drop.find('> .dropdown-item').each(function () {
      let ddi = $(this),
        curNode = node,
        value = ddi.data('value'),
        //obj = options.cssclass.formats[value] || {},
        expr = '.' + value.replace(' ', '.'),
        match = false;

      while (curNode.length) {

        if (curNode.is(expr)) {
          match = true;
          break;
        }

        if (noBubble) {
          break;
        }

        if (dom.isEditableRoot(curNode)) {
          break;
        }

        curNode = curNode.parent();
      }

      ddi.toggleClass('checked', match);
    });
  }

  destroy() {
    // ???
  }
}