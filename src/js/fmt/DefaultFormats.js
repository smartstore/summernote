import func from '../core/func';
import lists from '../core/lists';
import dom from '../core/dom';

const alignSelector = 'figure,p,h1,h2,h3,h4,h5,h6,td,th,tr,div,ul,ol,li,pre';

const formats = {
  valigntop: [
    { selector: 'td,th', classes: 'align-top', styles: { verticalAlign: 'top' }, group: 'valign'}
  ],

  valignmiddle: [
    { selector: 'td,th', classes: 'align-middle', styles: { verticalAlign: 'middle' }, group: 'valign'}
  ],

  valignbottom: [
    { selector: 'td,th', classes: 'align-bottom', styles: { verticalAlign: 'bottom' }, group: 'valign'}
  ],

  alignleft: [
    { 
      selector: alignSelector, 
      classes: 'text-left', 
      styles: { textAlign: 'left' }, 
      compound: false, 
      inherit: false, 
      preview: 'font-family font-size', 
      group: 'align' 
    },
    {
      selector: 'img,figure,audio,video',
      collapsed: false,
      classes: 'float-left',
      styles: { float: 'left' },
      compound: false, 
      preview: 'font-family font-size'
    },
    // {
    //   selector: 'table',
    //   collapsed: false,
    //   styles: {
    //     marginLeft: '0px',
    //     marginRight: 'auto',
    //   },
    //   onformat: (table) => {
    //     // Remove conflicting float style
    //     dom.setStyle(table, 'float', null);
    //   },
    //   preview: 'font-family font-size'
    // },
  ],

  aligncenter: [
    { 
      selector: alignSelector, 
      classes: 'text-center', 
      styles: { textAlign: 'center' }, 
      compound: false, 
      inherit: false, 
      preview: 'font-family font-size', 
      group: 'align' 
    },
    {
      selector: 'img,figure,audio,video',
      collapsed: false,
      classes: 'd-block mx-auto',
      styles: { display: 'block', marginLeft: 'auto', marginRight: 'auto' },
      compound: false, 
      preview: false
    },
    // {
    //   selector: 'table',
    //   collapsed: false,
    //   styles: {
    //     marginLeft: 'auto',
    //     marginRight: 'auto'
    //   },
    //   preview: 'font-family font-size'
    // },
  ],

  alignright: [
    { 
      selector: alignSelector, 
      classes: 'text-right', 
      styles: { textAlign: 'right' },
      compound: false,
      inherit: false, 
      preview: 'font-family font-size', 
      group: 'align' 
    },
    { 
      selector: 'img,figure,audio,video', 
      collapsed: false, 
      classes: 'float-right', 
      styles: { float: 'right' },
      compound: false,
      preview: 'font-family font-size' 
    },
    // {
    //   selector: 'table',
    //   collapsed: false,
    //   styles: {
    //     marginRight: '0px',
    //     marginLeft: 'auto',
    //   },
    //   onformat: (table) => {
    //     // Remove conflicting float style
    //     dom.setStyle(table, 'float', null);
    //   },
    //   preview: 'font-family font-size'
    // },
  ],

  alignjustify: [
    { 
      selector: alignSelector, 
      classes: 'text-justify',
      styles: { textAlign: 'justify' },
      compound: false,
      inherit: false, 
      preview: 'font-family font-size', 
      group: 'align' 
    }
  ],

  bold: [
    { inline: 'strong', remove: 'all', preserve_attributes: [ 'class', 'style' ] },
    { inline: 'span', classes: 'fw-bold', styles: { fontWeight: 'bold' }},
    { inline: 'span', classes: 'fw-medium', styles: { fontWeight: 'bold' }},
    { inline: 'b', remove: 'all', preserve_attributes: [ 'class', 'style' ] }
  ],

  italic: [
    { inline: 'em', remove: 'all', preserve_attributes: [ 'class', 'style' ] },
    { inline: 'span', styles: { fontStyle: 'italic' }},
    { inline: 'i', remove: 'all', preserve_attributes: [ 'class', 'style' ] }
  ],
  // TODO: Remove test formats
  // italic: [
  //   { inline: 'span', classes: 'text-primary'},
  // ],

  underline: [
    { inline: 'u', remove: 'all', preserve_attributes: [ 'class', 'style' ] },
    { inline: 'span', styles: { textDecoration: 'underline' }, exact: true },
  ],
  // underline: [
  //   { inline: 'span', classes: 'bg-success-subtle'},
  // ],

  strikethrough: [
    { inline: 's', remove: 'all', preserve_attributes: [ 'class', 'style' ] },
    { inline: 'span', styles: { textDecoration: 'line-through' }, exact: true },
    { inline: 'strike', remove: 'all', preserve_attributes: [ 'class', 'style' ] },
    { inline: 'del', remove: 'all', preserve_attributes: [ 'class', 'style' ] }
  ],

  forecolor: { inline: 'span', styles: { color: '%value' }, links: true, remove_similar: true, clear_child_styles: true },
  hilitecolor: { inline: 'span', styles: { backgroundColor: '%value' }, links: true, remove_similar: true, clear_child_styles: true },
  fontname: { inline: 'span', toggle: false, styles: { fontFamily: '%value' }, clear_child_styles: true },
  fontsize: { inline: 'span', toggle: false, styles: { fontSize: '%value' }, clear_child_styles: true },
  lineheight: { selector: 'h1,h2,h3,h4,h5,h6,p,li,td,th,div', styles: { lineHeight: '%value' }},
  fontsize_class: { inline: 'span', attributes: { class: '%value' }},
  blockquote: { block: 'blockquote', classes: 'blockquote', wrapper: true, remove: 'all' },
  subscript: { inline: 'sub', group: 'scriptalign' },
  superscript: { inline: 'sup', group: 'scriptalign' },
  code: { inline: 'code' },

  link: {
    inline: 'a', selector: 'a', remove: 'all', split: true, deep: true,
    onmatch: (node, _fmt, _itemName) => {
      return dom.isElement(node) && node.hasAttribute('href');
    },

    onformat: (elm, _fmt, vars = null) => {
      lists.each(vars, (value, key) => {
        dom.setAttr(elm, key, value);
      });
    }
  },

  removeformat: [
    {
      selector: 'b,strong,em,i,font,u,strike,s,sub,sup,dfn,code,samp,kbd,var,cite,mark,q,del,ins,small',
      remove: 'all',
      split: true,
      expand: false,
      block_expand: true,
      deep: true
    },
    { selector: 'span', attributes: [ 'style', 'class' ], remove: 'empty', split: true, expand: false, deep: true },
    { selector: '*', attributes: [ 'style', 'class' ], split: false, expand: false, deep: true }
  ]
};

lists.each('p h1 h2 h3 h4 h5 h6 div address pre dt dd samp'.split(/\s/), (name) => {
  formats[name] = { block: name, remove: 'all' };
});

//formats['alert'] = { block: 'div', classes: 'alert alert-info', remove: 'all' };

const get = func.constant(formats);

export {
  get
};