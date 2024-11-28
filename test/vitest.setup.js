import $ from 'jquery';
import env from '@/js/core/env';
import { expect } from 'vitest';

expect.extend({
  equalsIgnoreCase(received, expected) {
    if (typeof received !== 'string' || typeof expected !== 'string') {
      return {
        pass: false,
        message: () =>
          `Expected both received and expected to be strings, but got ${typeof received} and ${typeof expected}`,
      };
    }

    let str1 = received.toLowerCase();
    let str2 = expected.toLowerCase();

    // [workaround] IE8-10 use &nbsp; instead of bogus br
    if (env.isMSIE && env.browserVersion < 11) {
      str1 = str1.replace(/<br\/?>/g, '&nbsp;');
      str2 = str2.replace(/<br\/?>/g, '&nbsp;');
    }

    // [workaround] IE8 str1 markup has newline between tags
    if (env.isMSIE && env.browserVersion < 9) {
      str1 = str1.replace(/\r\n/g, '');
    }

    const pass = str1 === str2;

    return {
      pass,
      message: () =>
        pass
          ? `Expected strings not to be equal (case-insensitive):\nReceived: ${received}\nExpected: ${expected}`
          : `Expected strings to be equal (case-insensitive):\nReceived: ${received}\nExpected: ${expected}`,
    };
  },

  equalsStyle($node, expected, style) {
    if (!$node || !$node[0]) {
      return {
        pass: false,
        message: () => `Expected a valid DOM node, but got: ${$node}`,
      };
    }

    const nodeStyle = window.getComputedStyle($node[0]).getPropertyValue(style);
    const testerStyle = $('<div></div>').css(style, expected).css(style);

    const pass = nodeStyle === testerStyle;

    return {
      pass,
      message: () =>
        pass
          ? `Expected styles not to match for property "${style}":\nReceived: ${nodeStyle}\nExpected: ${expected}`
          : `Expected styles to match for property "${style}":\nReceived: ${nodeStyle}\nExpected: ${expected}`,
    };
  },
});
