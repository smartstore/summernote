import $ from 'jquery';
import _ from 'underscore';
import dom from '../core/dom';

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

    this.events = {
				// This will be called after modules are initialized.
				'summernote.init': function (we, e) {
					//console.log('summernote initialized', we, e);
				},
				// This will be called when user releases a key on editable.
				'summernote.keyup': function (we, e) {
					//  console.log('summernote keyup', we, e);
				}
    };
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

    if (typeof this.options.cssclass.classes === 'undefined') {
      const rgAlert = /^alert(-.+)?$/;
      const rgBtn = /^btn(-.+)?$/;
      const rgBg = /^bg-.+$/;
      const rgTextColor = /^text-(muted|primary|success|danger|warning|info|dark|white)$/;
      const rgTextAlign = /^text-(start|center|end)$/;
      const rgDisplay = /^display-[1-4]$/;
      const rgWidth = /^w-(25|50|75|100)$/;
      const rgRounded = /^rounded(-.+)?$/;

      this.options.cssclass.classes = {
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
        "text-primary": {inline: true, toggle: rgTextColor },
        "text-success": {inline: true, toggle: rgTextColor },
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
        "list-unstyled": { },
        "display-1": { displayClass: "fs-h1", toggle: rgDisplay },
        "display-2": { displayClass: "fs-h2", toggle: rgDisplay },
        "display-3": { displayClass: "fs-h3", toggle: rgDisplay },
        "display-4": { displayClass: "fs-h4", toggle: rgDisplay },
        "lead": { }
      };
    }

    if (typeof this.options.cssclass.imageShapes === 'undefined') {
      this.options.cssclass.imageShapes = {
        "img-fluid": { inline: true },
        "border": { inline: true },
        "rounded": { toggle: /^(rounded(-.+)?)|img-thumbnail$/, inline: true },
        "rounded-circle": { toggle: /^(rounded(-.+)?)|img-thumbnail$/, inline: true  },
        "img-thumbnail": { toggle: /^rounded(-.+)?$/, inline: true },
        "shadow-sm": { toggle: /^(shadow(-.+)?)$/, inline: true },
        "shadow": { toggle: /^(shadow(-.+)?)$/, inline: true },
        "shadow-lg": { toggle: /^(shadow(-.+)?)$/, inline: true }
      };
    }
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
            items: _.keys(this.options.cssclass.classes),
            template: (item) => {
                const obj = this.options.cssclass.classes[item] || {};

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
              var obj = this.options.cssclass.classes[value] || {};

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
            callback: (btn) => {
              btn.data("placement", "bottom");
              btn.data("trigger", "hover");
              btn.attr("title", this.lang.imageShapes.tooltip);
              btn.tooltip();

              btn.on('click', (e) => {
                this.refreshDropdown($(e.currentTarget).next(), $(this.selection.selectedControl), true);
              });
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
    const rng = this.selection.getRange();
    if (!this.selection.isValidRange(rng)) {
      return;
    }

    const controlNode = $(this.selection.selectedControl);
    const sel = this.selection.nativeSelection;
    let node = $(sel.focusNode.parentElement, ".note-editable");
    const caret = sel.type === 'None' || sel.type === 'Caret';

    const apply = (el) => {
      if (el.is('.' + value.replace(' ', '.'))) {
        // "btn btn-info" > ".btn.btn-info"
        // Just remove the same style
        el.removeClass(value);
        if (!el.attr('class')) {
          el.removeAttr('class');
        }

        if (isInlineElement(el[0]) && !el[0].attributes.length) {
          // Unwrap the node when it is inline and no attributes are present
          el.replaceWith(el.html());
        }
      }
      else {
        if (obj.toggle) {
          // Remove equivalent classes first
          const classNames = (el.attr('class') || '').split(' ');
          _.each(classNames, (name) => {
            if (name && name !== value && obj.toggle.test(name)) {
              el.removeClass(name);
            }
          });
        }

        el.toggleClass(value);
      }
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
        const range = sel.getRangeAt(0).cloneRange();
        const span = $('<span class="' + value + '"></span>');
        range.surroundContents(span[0]);
        sel.removeAllRanges();
        sel.addRange(range);
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
        //obj = options.cssclass.classes[value] || {},
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