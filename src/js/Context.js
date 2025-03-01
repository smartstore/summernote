import $ from 'jquery';
import Str from './core/Str';
import Type from './core/Type';
import func from './core/func';
import lists from './core/lists';
import dom from './core/dom';

export default class Context {
  /**
   * @param {jQuery} $note
   * @param {Object} options
   */
  constructor($note, options) {
    this.$note = $note;

    this.memos = {};
    this.modules = {};
    this.layoutInfo = {};
    this.options = $.extend(true, {}, options);

    // init ui with options
    $.summernote.ui = $.summernote.ui_template(this.options);
    this.ui = $.summernote.ui;

    // Special handling for change event: trigger only all 50 ms.
    this.triggerChangeEvent = func.debounce(this.triggerChangeEvent.bind(this), 50);

    this.initialize();
  }

  /**
   * create layout and initialize modules and other resources
   */
  initialize() {
    this.layoutInfo = this.ui.createLayout(this.$note);
    this._initialize();
    this.$note.hide();
    return this;
  }

  /**
   * destroy modules and other resources and remove layout
   */
  destroy() {
    this._destroy();
    this.$note.removeData('summernote');
    this.ui.removeLayout(this.$note, this.layoutInfo);
  }

  /**
   * destory modules and other resources and initialize it again
   */
  reset() {
    const disabled = this.isDisabled();
    this.code(dom.emptyPara);
    this._destroy();
    this._initialize();

    if (disabled) {
      this.disable();
    }
  }

  _initialize() {
    // set own id
    this.options.id = func.uniqueId($.now());
    // set default container for tooltips, popovers, and dialogs
    this.options.container = this.options.container || this.layoutInfo.editor;

    // add optional buttons
    const buttons = $.extend({}, this.options.buttons);
    Object.keys(buttons).forEach((key) => {
      this.memo('button.' + key, buttons[key]);
    });

    const modules = $.extend({}, this.options.modules, $.summernote.plugins || {});

    // add and initialize modules
    Object.keys(modules).forEach((key) => {
      this.module(key, modules[key], true);
    });

    Object.keys(this.modules).forEach((key) => {
      this.initializeModule(key);
    });
  }

  _destroy() {
    // destroy modules with reversed order
    Object.keys(this.modules).reverse().forEach((key) => {
      this.removeModule(key);
    });

    Object.keys(this.memos).forEach((key) => {
      this.removeMemo(key);
    });
    // trigger custom onDestroy callback
    this.triggerEvent('destroy', this);
  }

  code(html) {
    const isCodeView = this.invoke('codeview.isActivated');

    if (html === undefined) {
      // Get
      this.invoke('codeview.sync');
      return isCodeView ? this.layoutInfo.codable.val() : this.layoutInfo.editable.html();
    } else {
      // Set
      if (isCodeView) {
        this.invoke('codeview.sync', html);
      } 
      else {
        this.layoutInfo.editable.html(html);
      }

      this.$note.val(html);
      this.triggerEvent('change', this.layoutInfo.editable);
    }
  }

  isDisabled() {
    return this.layoutInfo.editable.attr('contenteditable') === 'false';
  }

  enable() {
    this.layoutInfo.editable.attr('contenteditable', true);
    this.invoke('toolbar.activate', true);
    this.triggerEvent('disable', false);
    this.options.editing = true;
  }

  disable() {
    // close codeview if codeview is open
    if (this.invoke('codeview.isActivated')) {
      this.invoke('codeview.deactivate');
    }
    this.layoutInfo.editable.attr('contenteditable', false);
    this.options.editing = false;
    this.invoke('toolbar.deactivate', true);

    this.triggerEvent('disable', true);
  }

  triggerChangeEvent($editable) {
    this.triggerEvent('change', $editable);
  }

  triggerEvent() {
    const name = lists.head(arguments);
    const args = lists.tail(lists.from(arguments));

    const callback = this.options.callbacks[Str.namespaceToCamel(name, 'on')];
    if (callback) {
      callback.apply(this.$note[0], args);
    }

    this.$note.trigger('summernote.' + name, args);
  }

  initializeModule(key) {
    const module = this.modules[key];
    module.shouldInitialize = module.shouldInitialize || func.ok;
    if (!module.shouldInitialize()) {
      return;
    }

    // initialize module
    if (module.initialize) {
      module.initialize();
    }

    // attach events
    if (module.events) {
      dom.attachEvents(this.$note, module.events);
    }
  }

  module(key, ModuleClass, withoutIntialize) {
    if (arguments.length === 1) {
      return this.modules[key];
    }

    this.modules[key] = new ModuleClass(this);

    if (!withoutIntialize) {
      this.initializeModule(key);
    }
  }

  removeModule(key) {
    const module = this.modules[key];
    if (module.shouldInitialize()) {
      if (module.events) {
        dom.detachEvents(this.$note, module.events);
      }

      if (module.destroy) {
        module.destroy();
      }
    }

    delete this.modules[key];
  }

  memo(key, obj) {
    if (arguments.length === 1) {
      return this.memos[key];
    }
    this.memos[key] = obj;
  }

  removeMemo(key) {
    if (this.memos[key] && this.memos[key].destroy) {
      this.memos[key].destroy();
    }

    delete this.memos[key];
  }

  /**
   * Some buttons need to change their visual style immediately once they get pressed
   */
  createInvokeHandlerAndUpdateState(namespace, value) {
    return (event) => {
      this.createInvokeHandler(namespace, value)(event);
      this.invoke('buttons.updateCurrentStyle');
    };
  }

  createInvokeHandler(namespace, value) {
    return (event) => {
      event.preventDefault();
      const $target = $(event.target);
      this.invoke(namespace, value || $target.closest('[data-value]').data('value'), $target);
    };
  }

  invoke() {
    // TODO: Allow multiple splits, e.g. "editor.selection.getRange"
    const namespace = lists.head(arguments);
    const args = lists.tail(lists.from(arguments));

    const splits = namespace.split('.');
    const moduleName = splits.length > 1 && splits[0];
    const propertyName = splits.length > 2 ? splits[1] : null; // e.g.: editor.*selection*.getRange
    const methodName = splits.length > 1 ? lists.last(splits) : splits[0]; // e.g.: editor.*unlink*
    let module = this.modules[moduleName || 'editor'];

    if (!moduleName && this[methodName]) {
      return this[methodName].apply(this, args);
    } 
    else if (module && module[propertyName || methodName] && module.shouldInitialize()) {
      if (propertyName) {
        // Get editor.*selection*
        module = Type.isFunction(module[propertyName]) ? module[propertyName].apply(module) : module[propertyName];
      }

      return module[methodName].apply(module, args);
    }
  }
}
