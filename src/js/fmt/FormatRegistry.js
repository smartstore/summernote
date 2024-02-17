import lists from '../core/lists';
import Type from '../core/Type';
import Obj from '../core/Obj';
import * as DefaultFormats from './DefaultFormats';
import * as TableFormats from './TableFormats';
import FormatUtils from './FormatUtils';

const resolveGroups = (formats, groups) => {
  lists.each(formats, (format, name) => {
    const fmt = format[0];
    if (fmt.group && Type.isString(fmt.group) && groups[fmt.group]) {
      fmt.group = lists.reject(groups[fmt.group], n => n == name);
    }
  });
};

export default class FormatRegistry {
  constructor(options) {
    this.formats = {};
    this.groups = {}; // { 'groupname': [...format]  }

    this.register(DefaultFormats.get());
    this.register(TableFormats.get());
    this.register(options.formats);

    resolveGroups(this.formats, this.groups);
    delete this.groups;
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
          const isSelectorFormat = FormatUtils.isSelectorFormat(format);
          const isInlineFormat = FormatUtils.isInlineFormat(format);

          // Set deep to false by default on selector formats to avoid removing
          // alignment on images inside paragraphs when alignment is changed on paragraphs
          if (Type.isUndefined(format.deep)) {
            format.deep = !isSelectorFormat;
          }

          // Default to true
          if (Type.isUndefined(format.split)) {
            format.split = !isSelectorFormat || isInlineFormat;
          }

          // Default to true
          if (Type.isUndefined(format.remove) && isSelectorFormat && !isInlineFormat) {
            format.remove = 'none';
          }

          // Mark format as a mixed format inline + block level
          if (isSelectorFormat && isInlineFormat) {
            format.mixed = true;
            format.block_expand = true;
          }

          // Split classes if needed
          if (Type.isString(format.classes)) {
            format.classes = format.classes.split(/\s+/);
          }

          if (Type.isNullOrUndefined(format.compound)) {
            // compound true should be default
            format.compound = true;
          }

          if (format.group && Type.isString(format.group)) {
            const groups = this.groups[format.group] || (this.groups[format.group] = []);
            groups.push(name);
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