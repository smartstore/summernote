import FormatRegistry from './FormatRegistry';
import MatchFormat from './MatchFormat';
import ApplyFormat from './ApplyFormat';
import RemoveFormat from './RemoveFormat';
import CaretFormat from './CaretFormat';

export default class Formatter {
  constructor(context) {
    this.context = context;
    this.formats = new FormatRegistry(context.options);

    CaretFormat.setup(context);
  }

  get editor() {
    return this.context.modules.editor;
  }

  /**
   * Returns the format by name or all formats if no name is specified.
   *
   * @method get
   * @param {String} name Optional name to retrieve by.
   * @return {Array/Object} Array/Object with all registered formats or a specific format.
   */
  get(name) {
    return this.formats.get(name);
  }

  /**
   * Returns true or false if a format is registered for the specified name.
   *
   * @method has
   * @param {String} name Format name to check if a format exists.
   * @return {Boolean} True/False if a format for the specified name exists.
   */
  has(name) {
    return this.formats.has(name);
  }

  /**
   * Registers a specific format by name.
   *
   * @method register
   * @param {Object/String} name Name of the format, for example "bold".
   * @param {Object/Array} format Optional format object or array of format variants
   * can only be omitted if the first arg is an object.
   */
  register(name, format) {
    return this.formats.register(name, format);
  }

  /**
   * Unregister a specific format by name.
   *
   * @method unregister
   * @param {String} name Name of the format, for example "bold".
   */
  unregister(name) {
    return this.formats.unregister(name);
  }

  /**
   * Applies the specified format to the current selection or specified node.
   *
   * @method apply
   * @param {String} name Name of format to apply.
   * @param {Object} vars Optional list of variables to replace within format before applying it.
   * @param {Node} node Optional node to apply the format to. Defaults to current selection.
   */
  apply(name, vars, node) {
    ApplyFormat.applyFormat(this.editor, name, vars, node);
  }

  /**
   * Removes the specified format from the current selection or specified node.
   *
   * @method remove
   * @param {String} name Name of format to remove.
   * @param {Object} vars Optional list of variables to replace within format before removing it.
   * @param {Node/Range} node Optional node or DOM range to remove the format from defaults to current selection.
   */
  remove(name, vars, node, similar) {
    RemoveFormat.removeFormat(this.editor, name, vars, node, similar);
  }

  /**
   * Toggles the specified format on/off.
   *
   * @method toggle
   * @param {String} name Name of format to apply/remove.
   * @param {Object} vars Optional list of variables to replace within format before applying/removing it.
   * @param {Node} node Optional node to apply the format to or remove from. Defaults to current selection.
   */
  toggle(name, vars, node) {
    const fmt = this.get(name);
    if (fmt) {
      if (MatchFormat.match(this.editor, name, vars, node) && (!('toggle' in fmt[0]) || fmt[0].toggle)) {
        RemoveFormat.removeFormat(this.editor, name, vars, node);
      } else {
        ApplyFormat.applyFormat(this.editor, name, vars, node);
      }
    }
  }

  /**
   * Matches the current selection or specified node against the specified format name.
   *
   * @method match
   * @param {String} name Name of format to match.
   * @param {Object} vars Optional list of variables to replace before checking it.
   * @param {Node} node Optional node to check.
   * @param {Boolean} similar Optional argument to specify that similar formats should be checked instead of only exact formats.
   * @return {Boolean} true/false if the specified selection/node matches the format.
   */
  match(name, vars, node, similar) {
    return MatchFormat.match(this.editor, name, vars, node, similar);
  }

  /**
   * Finds the closest matching format from a set of formats for the current selection.
   *
   * @method closest
   * @param {Array} names Format names to check for.
   * @return {String} The closest matching format name or null.
   */
  closest(names) {
    // TODO: Implement MatchFormat.closest()
    return MatchFormat.closest(this.editor, names);
  }

  /**
   * Matches the current selection against the array of formats and returns a new array with matching formats.
   *
   * @method matchAll
   * @param {Array} names Name of format to match.
   * @param {Object} vars Optional list of variables to replace before checking it.
   * @return {Array} Array with matched formats.
   */
  matchAll(names, vars) {
    return MatchFormat.matchAll(this.editor, names, vars);
  }

  /**
   * Return true/false if the specified node has the specified format.
   *
   * @method matchNode
   * @param {Node} node Node to check the format on.
   * @param {String} name Format name to check.
   * @param {Object} vars Optional list of variables to replace before checking it.
   * @param {Boolean} similar Match format that has similar properties.
   * @return {Object} Returns the format object it matches or undefined if it doesn't match.
   */
  matchNode(node, name, vars, similar) {
    return MatchFormat.matchNode(this.editor, node, name, vars, similar);
  }

  /**
   * Returns true/false if the specified format can be applied to the current selection or not. It
   * will currently only check the state for selector formats, it returns true on all other format types.
   *
   * @method canApply
   * @param {String} name Name of format to check.
   * @return {Boolean} true/false if the specified format can be applied to the current selection/node.
   */
  canApply(name) {
    return MatchFormat.canApply(this.editor, name);
  }
}