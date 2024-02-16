import lists from '../core/lists';
import Type from '../core/Type';
import Obj from '../core/Obj';
import * as DefaultFormats from './DefaultFormats';
import * as TableFormats from './TableFormats';
import FormatUtils from './FormatUtils';

const prepareGroups = (formats, groups) => {
  lists.each(formats, (format) => {
    lists.each(format, (fmt) => {
      if (fmt.group && groups[fmt.group]) {
        fmt.group = lists.reject(groups[fmt.group], f => f == fmt);
      }
    });
  });
};

export default class FormatRegistry {
  constructor(options) {
    this.formats = {};
    this.groups = {}; // { 'groupname': [...format]  }

    this.register(DefaultFormats.get());
    this.register(TableFormats.get());
    this.register(options.formats);

    prepareGroups(this.formats, this.groups);
  }

  get(name) {
    return name ? this.formats[name] : this.formats;
  }

  has(name) {
    return Obj.has(this.formats, name);
  }

  register(name, format) {
    if (name) {
      if (!Type.isString(name)) {
        lists.each(name, (format, name) => {
          this.register(name, format);
        });
      } else {
        // Force format into array and add it to internal collection
        if (!Type.isArray(format)) {
          format = [format];
        }

        lists.each(format, (format) => {
          // Set deep to false by default on selector formats this to avoid removing
          // alignment on images inside paragraphs when alignment is changed on paragraphs
          if (Type.isUndefined(format.deep)) {
            format.deep = !FormatUtils.isSelectorFormat(format);
          }

          // Default to true
          if (Type.isUndefined(format.split)) {
            format.split = !FormatUtils.isSelectorFormat(format) || FormatUtils.isInlineFormat(format);
          }

          // Default to true
          if (Type.isUndefined(format.remove) && FormatUtils.isSelectorFormat(format) && !FormatUtils.isInlineFormat(format)) {
            format.remove = 'none';
          }

          // Mark format as a mixed format inline + block level
          if (FormatUtils.isSelectorFormat(format) && FormatUtils.isInlineFormat(format)) {
            format.mixed = true;
            format.block_expand = true;
          }

          // Split classes if needed
          if (Type.isString(format.classes)) {
            format.classes = format.classes.split(/\s+/);
          }

          if (format.group) {
            const groups = this.groups[format.group] || (this.groups[format.group] = []);
            groups.push(format);
          }
        });

        this.formats[name] = format;
      }
    }
  }

  unregister(name) {
    if (name && formats[name]) {
      delete this.formats[name];
    }

    return this.formats;
  }
};