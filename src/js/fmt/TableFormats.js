import func from '../core/func';
import lists from '../core/lists';

const genericBase = {
  remove_similar: true,
  inherit: false
};

const cellBase = {
  selector: 'td,th',
  ...genericBase
};

const cellFormats = {
  tablecellbackgroundcolor: {
    styles: { backgroundColor: '%value' },
    ...cellBase
  },
  tablecellverticalalign: {
    styles: {
      'vertical-align': '%value'
    },
    ...cellBase
  },
  tablecellbordercolor: {
    styles: { borderColor: '%value' },
    ...cellBase
  },
  tablecellclass: {
    classes: [ '%value' ],
    ...cellBase
  },
  tableclass: {
    selector: 'table',
    classes: [ '%value' ],
    ...genericBase
  },
  tablecellborderstyle: {
    styles: { borderStyle: '%value' },
    ...cellBase
  },
  tablecellborderwidth: {
    styles: { borderWidth: '%value' },
    ...cellBase
  }
};

const get = func.constant(cellFormats);

export {
  get
};