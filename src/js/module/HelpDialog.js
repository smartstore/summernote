import $ from 'jquery';
import env from '../core/env';

export default class HelpDialog {
  constructor(context) {
    this.context = context;

    this.ui = $.summernote.ui;
    this.$body = $(document.body);
    this.$editor = context.layoutInfo.editor;
    this.options = context.options;
    this.lang = this.options.langInfo;
  }

  initialize() {
    const $container = this.options.dialogsInBody ? this.$body : this.options.container;
    const body = [
      '<p class="text-center small m-0">',
        '<a href="http://summernote.org/" target="_blank" rel="noopener noreferrer">Summernote ' + $.summernote.version + '</a> · ',
        '<a href="https://github.com/smartstore/summernote" target="_blank" rel="noopener noreferrer">Fork</a> ',
        //'<a href="https://github.com/summernote/summernote/issues" target="_blank" rel="noopener noreferrer">Issues</a>',
      '</p>',
    ].join('');

    this.$dialog = this.ui.dialog({
      title: this.lang.options.help,
      fade: this.options.dialogsFade,
      body: this.createShortcutList(),
      footer: body,
      callback: ($node) => {
        $node.find('.modal-body,.note-modal-body').css({
          'max-height': 350,
          'overflow-y': 'scroll',
        });
      },
    }).render().appendTo($container);
  }

  destroy() {
    this.ui.hideDialog(this.$dialog);
    this.$dialog.remove();
  }

  createShortcutList() {
    const keyMap = this.options.keyMap[env.isMac ? 'mac' : 'pc'];

    const $root = $('<div><div class="help-list" style="display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px"></div></div>');
    const $list = $root.find('.help-list');

    Object.keys(keyMap).forEach(key => {
      const command = keyMap[key];
      $list
        .append($('<div><kbd class="fwm">' + key + '</kdb></div>'))
        .append($('<div></div>').html(this.context.memo('help.' + command) || command));
    });

    return $root.html();
  }

  /**
   * show help dialog
   *
   * @return {Promise}
   */
  showHelpDialog() {
    return $.Deferred((deferred) => {
      this.ui.onDialogShown(this.$dialog, () => {
        this.context.triggerEvent('dialog.shown');
        deferred.resolve();
      });
      this.ui.showDialog(this.$dialog);
    }).promise();
  }

  show() {
    this.showHelpDialog().then(() => {
      this.context.invoke('editor.selection.restoreBookmark');
    });
  }
}
