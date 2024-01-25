import func from '../core/func';
import lists from '../core/lists';
import * as DefaultFormats from './DefaultFormats';
import * as TableFormats from './TableFormats';

export const FormatRegistry = (options) => {
  const formats = {};

  const get = name => name ? formats[name] : formats;
  const has = name => formats[name];

  const register = (name, format) => {
    if (name) {
      if (!func.isString(name)) {
        lists.each(name, (format, name) => {
          register(name, format);
        });
      } else {
        // Force format into array and add it to internal collection
        if (!Array.isArray(format)) {
          format = [ format ];
        }

        lists.each(format, (format) => {
          // Set deep to false by default on selector formats this to avoid removing
          // alignment on images inside paragraphs when alignment is changed on paragraphs
          if (typeof format.deep === 'undefined') {
            format.deep = !isSelectorFormat(format);
          }

          // Default to true
          if (typeof format.split === 'undefined') {
            format.split = !isSelectorFormat(format) || isInlineFormat(format);
          }

          // Default to true
          if (typeof format.remove === 'undefined' && isSelectorFormat(format) && !isInlineFormat(format)) {
            format.remove = 'none';
          }

          // Mark format as a mixed format inline + block level
          if (isSelectorFormat(format) && isInlineFormat(format)) {
            format.mixed = true;
            format.block_expand = true;
          }

          // Split classes if needed
          if (func.isString(format.classes)) {
            format.classes = format.classes.split(/\s+/);
          }
        });

        formats[name] = format;
      }
    }
  };

  const unregister = (name) => {
    if (name && formats[name]) {
      delete formats[name];
    }

    return formats;
  };

  register(DefaultFormats.get());
  register(TableFormats.get());
  register(options.formats);

  return {
    get,
    has,
    register,
    unregister
  };
};