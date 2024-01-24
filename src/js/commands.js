export default {
    'bold': {
        tag: ['strong', 'b'], 
        style: 'font-weight',
        styleMatch: /^bold|bolder|600|700|800|900|950$/,
        classMatch: /^fwb|fwm|fw-bold|fw-medium$/,
        styleInvert: 'normal',
        classInvert: 'fw-normal',
        tagOrStyle: true
      },
      'italic': {
        tag: ['em', 'i'], 
        style: 'font-style',
        styleMatch: /^italic|oblique$/,
        styleInvert: 'normal',
        tagOrStyle: true
      },
      'underline': {
        tag: 'u', 
        style: 'text-decoration',
        styleMatch: 'underline',
        styleInvert: 'none',
        tagOrStyle: true
      },
      'strikethrough': {
        tag: ['s', 'del', 'strike'], 
        style: 'text-decoration',
        styleMatch: 'line-through',
        styleInvert: 'none',
        tagOrStyle: true
      },
      'subscript': {
        tag: 'sub', 
        style: 'vertical-align',
        styleMatch: 'sub',
        styleInvert: 'baseline',
        tagOrStyle: true
      },
      'superscript': {
        tag: 'sup', 
        style: 'vertical-align',
        styleMatch: 'super',
        styleInvert: 'baseline',
        tagOrStyle: true
      },
      'code': { tag: 'code' },
      'fontname': { style: 'font-family' },   
}