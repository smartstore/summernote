import Type from '../core/Type';
import lists from '../core/lists';
import range from '../core/range';
import dom from '../core/dom';
import Point from '../core/Point';
import MatchFormat from './MatchFormat2';
import Str from '../core/Str';

const each = lists.each;

const applyFormatInternal = (editor, name, vars = null, node = null) => {
  const sel = editor.selection;
  let rng = sel.getRange();
  const formatList = editor.formatter.get(name);
  const format = formatList[0];
  const isCollapsed = !node && rng.collapsed;
};

const applyFormat = (editor, name, vars = null, node = null) => {
    applyFormatInternal(editor, name, vars, node);
};

export default {
  applyFormat
}