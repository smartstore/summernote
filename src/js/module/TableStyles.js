import $ from 'jquery';
import _ from 'underscore';
import dom from '../core/dom';
import lists from '../core/lists';

// $(function() {
//   $.extend($.summernote.options, {
//     tableStyles: {
//       // Must keep the same order as in lang.tableStyles.styles*
//       stylesExclusive: ["", "table-bordered"],
//       stylesInclusive: ["table-striped", "table-sm", "table-hover"]
//     }
//   });
  
// });

export default class TableStyles {
  constructor(context) {
    this.context = context;

    this.ui = $.summernote.ui;
    this.options = context.options;
    this.lang = this.options.langInfo;
    this.$editor = context.layoutInfo.editor;
    this.$editable = context.layoutInfo.editable;
    this.editable = this.$editable[0];
    this.editor = context.modules.editor;

    // // Fix blur event (?)
    // let module = context.modules.tablePopover;
    // module.events['summernote.disable summernote.blur'] = function (we, e) {
    //   const evt = e.originalEvent;
    //   if (evt.type === 'blur' && !$(evt.relatedTarget).closest('.note-custom').length) {
    //     module.hide();
    //   }
    // };
  }

  initialize() {
    this.context.memo('button.tableStyles', () => {
      const button = this.ui.buttonGroup([
        this.ui.button({
          className: "dropdown-toggle",
          contents: this.ui.dropdownButtonContents(this.ui.icon(this.options.icons.magic), this.options),
          tooltip: this.lang.tableStyles.tooltip,
          click: (e) => this.updateTableMenuState($(e.currentTarget)),
          // callback: (btn) => {
          //   btn.data("placement", "bottom");
          //   btn.data("trigger", "hover");
          //   btn.attr("title", this.lang.tableStyles.tooltip);
          //   btn.attr("tabindex", "-1");
          //   btn.tooltip();

          //   btn.on('click', () => {
          //     this.updateTableMenuState(btn);
          //   });
          // },
          data: {
            toggle: "dropdown"
          }
        }),
        this.ui.dropdownCheck({
          className: "dropdown-table-style",
          checkClassName: this.options.icons.menuCheck,
          items: this.generateListItems(
            this.options.tableStyles.stylesExclusive,
            this.lang.tableStyles.stylesExclusive,
            this.options.tableStyles.stylesInclusive,
            this.lang.tableStyles.stylesInclusive
          ),
          callback: ($dropdown) => {
            $dropdown.on('click', 'a', (e) => {
              this.updateTableStyles(e.currentTarget);
            });
          }
        })
      ]);
      return button.render();
    });
  }

  updateTableStyles(chosenItem) {
    const rng = this.editor.createRange();
    if (rng.collapsed && rng.isOnCell()) {
      this.editor.beforeCommand();
      const table = dom.closest(rng.commonAncestorContainer, dom.isTable);
      this.updateStyles($(table), chosenItem, this.options.tableStyles.stylesExclusive);
    }
  }

  updateTableMenuState($dropdownButton) {
    // Makes sure the check marks are on the currently applied styles
    const rng = this.editor.createRange();
    if (rng.collapsed && rng.isOnCell()) {
      const $table = $(dom.closest(rng.commonAncestorContainer, dom.isTable));
      const $listItems = $dropdownButton.next().find("a");
      this.updateMenuState($table, $listItems, this.options.tableStyles.stylesExclusive);
    }
  }

  updateMenuState($node, $listItems, exclusiveStyles) {
    // The following functions might be turnkey in other menu lists with exclusive and inclusive items that toggle CSS classes.
    let hasAnExclusiveStyle = false;
    $listItems.each(function () {
      let cssClass = $(this).data("value");
      if ($node.hasClass(cssClass)) {
        $(this).addClass("checked");
        if ($.inArray(cssClass, exclusiveStyles) !== -1) {
          hasAnExclusiveStyle = true;
        }
      } 
      else {
        $(this).removeClass("checked");
      }
    });

    // if none of the exclusive styles are checked, then check a blank
    if (!hasAnExclusiveStyle) {
      $listItems.filter('[data-value=""]').addClass("checked");
    }
  }

  updateStyles($node, chosenItem, exclusiveStyles) {
    const cssClass = $(chosenItem).data("value");
    this.editor.beforeCommand();
    // Exclusive class: only one can be applied at a time
    if ($.inArray(cssClass, exclusiveStyles) !== -1) {
      $node.removeClass(exclusiveStyles.join(" "));
      $node.addClass(cssClass);
    } 
    else {
      // Inclusive classes: multiple are ok
      $node.toggleClass(cssClass);
    }
    this.editor.afterCommand();
  }

  generateListItems(
    exclusiveStyles,
    exclusiveLabels,
    inclusiveStyles,
    inclusiveLabels
  ) {
    let list = '';

    lists.each(exclusiveStyles, (style, i) => {
      list += this.getListItem(style, exclusiveLabels[i], true);
    });

    list += '<div class="dropdown-divider"></div>';

    lists.each(inclusiveStyles, (style, i) => {
      list += this.getListItem(style, inclusiveLabels[i], false);
    });

    return list;
  }

  getListItem(value, label, isExclusive) {
    const item = `
      <a href='javascript:;' class='dropdown-item ${isExclusive ? "exclusive-item" : "inclusive-item"}' data-value="${value}">
        <i class="fa fa-check"></i>
        ${label}
      </a>
    `;

    return item;
  }

  destroy() {
    // ???
  }
}