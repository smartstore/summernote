import $ from 'jquery';
import lists from '../core/lists';
import key from '../core/key';

const defaultScheme = 'http://';
const linkPattern = /^([A-Za-z][A-Za-z0-9+-.]*\:[\/]{2}|tel:|mailto:[A-Z0-9._%+-]+@|xmpp:[A-Z0-9._%+-]+@)?(www\.)?(.+)$/i;

export default class AutoLink {
  constructor(context) {
    this.context = context;
    this.options = context.options;
    this.$editable = context.layoutInfo.editable;
    this.events = {
      'summernote.keyup': (we, event) => {
        if (!event.isDefaultPrevented()) {
          this.handleKeyup(event);
        }
      },
      'summernote.keydown': (we, event) => {
        this.handleKeydown(event);
      },
    };
  }

  initialize() {
    this.lastWordRange = null;
  }

  destroy() {
    this.lastWordRange = null;
  }

  replace() {
    if (!this.lastWordRange) {
      return;
    }

    const keyword = this.lastWordRange.toString();
    const match = keyword.match(linkPattern);

    if (match && (match[1] || match[2])) {
      const link = match[1] ? keyword : defaultScheme + keyword;
      const urlText = this.options.showDomainOnlyForAutolink ?
        keyword.replace(/^(?:https?:\/\/)?(?:tel?:?)?(?:mailto?:?)?(?:xmpp?:?)?(?:www\.)?/i, '').split('/')[0]
        : keyword;
      const node = $('<a></a>').html(urlText).attr('href', link)[0];
      if (this.context.options.linkTargetBlank) {
        $(node).attr('target', '_blank');
      }

      this.lastWordRange.insertNode(node);
      this.lastWordRange = null;
      this.context.invoke('editor.focus');
      this.context.triggerEvent('change', this.$editable);
    }
  }

  handleKeydown(event) {
    if (lists.contains([key.code.ENTER, key.code.SPACE], event.keyCode)) {
      const wordRange = this.context.invoke('editor.createRange').getWordRange({ trim: true });
      this.lastWordRange = wordRange;
    }
  }

  handleKeyup(event) {
    if (key.code.SPACE === event.keyCode || (key.code.ENTER === event.keyCode && !event.shiftKey)) {
      this.replace();
    }
  }
}
