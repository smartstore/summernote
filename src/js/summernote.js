import $ from 'jquery';
import env from './core/env';
import Type from './core/Type';
import lists from './core/lists';
import Context from './Context';

$.fn.extend({
  /**
   * Summernote API
   *
   * @param {Object|String}
   * @return {this}
   */
  summernote: function() {
    const param = lists.head(arguments);
    const hasOptions = Type.isNullOrUndefined() || Type.isPlainObject(param);

    let options;
    if (hasOptions) {
      options = $.extend({}, $.summernote.options, param || {});

      // Update options
      options.langInfo = $.extend(true, {}, $.summernote.lang['en-US'], $.summernote.lang[options.lang]);
      options.icons = $.extend(true, {}, $.summernote.options.icons, options.icons);
      options.tooltip = options.tooltip === 'auto' ? !env.isSupportTouch : options.tooltip;
    }

    if (options) {
      this.each((_i, el) => {
        let $note = $(el);
        let context = $note.data('summernote');

        if (!context) {
          context = new Context($note, options);
          $note.data('summernote', context);
          context.triggerEvent('init', context.layoutInfo);
        }
      });
    }

    const $note = this.first();
    if ($note.length) {
      const context = $note.data('summernote');
      if (context) {
        if (Type.isString(param)) {
          return context.invoke.apply(context, lists.from(arguments));
        } 
        else if (options.focus) {
          context.invoke('editor.focus');
        }
      }
    }

    return this;
  },
});
