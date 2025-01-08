import LegacyFormatter from './LegacyFormatter';
import MatchFormat from './MatchFormat2';

export default class Formatter {
  constructor(context) {
    this.context = context;
    this.legacyFormatter = new LegacyFormatter();
    // Test only
    this.formats = {
      bold: [
        { inline: 'strong' },
        { inline: 'b' },
        { inline: true, classes: ['fw-bold'], styles: { fontWeight: 'bold' }, compound: false},
        { inline: true, classes: ['fwb'], styles: { fontWeight: 'bold' }, compound: false}
      ]
    };
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
    return name ? this.formats[name] : this.formats;
  }

  /**
   * Returns true or false if a format is registered for the specified name.
   *
   * @method has
   * @param {String} name Format name to check if a format exists.
   * @return {Boolean} True if a format for the specified name exists.
   */
  has(name) {
    return Obj.has(this.formats, name);
  }

  /**
   * Applies the specified format to the current selection or specified node.
   *
   * @method apply
   * @param {String} name Name of format to apply.
   * @param {Object} vars Optional list of variables to replace within format before applying it.
   * @param {Node} node Optional node to apply the format to. Defaults to current selection.
   */
  apply(name, vars = null, node = null) {
    return this.legacyFormatter.apply(name, vars, node);
  }

  /**
   * Removes the specified format from the current selection or specified node.
   *
   * @method remove
   * @param {String} name Name of format to remove.
   * @param {Object} vars Optional list of variables to replace within format before removing it.
   * @param {Node/Range} node Optional node or DOM range to remove the format from. Defaults to current selection.
   */
  remove(name, vars = null, node = null) {
    return this.legacyFormatter.remove(name, vars, node);
  }

  /**
   * Toggles the specified format on/off.
   *
   * @method toggle
   * @param {String} name Name of format to apply/remove.
   * @param {Object} vars Optional list of variables to replace within format before applying/removing it.
   * @param {Node} node Optional node to apply the format to or remove from. Defaults to current selection.
   */
  toggle(name, vars = null, node = null) {
    return this.legacyFormatter.toggle(name, vars, node);
  }

  /**
   * Matches the current selection or specified node against the specified format name.
   *
   * @method match
   * @param {String} name Name of format to match.
   * @param {Object} vars Optional list of variables to replace before checking it.
   * @param {Node} node Optional node to check.
   * @return {Boolean/String} true/false/string if the specified selection/node matches the format.
   */
  match(name, vars = null, node = null) {
    if (this.has(name)) {
      return MatchFormat.match(this.editor, node, name, vars);
    }
    else {
      return this.legacyFormatter.match(name, vars, node); 
    }   
  }
}