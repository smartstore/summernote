import HtmlSanitizer from '../util/HtmlSanitizer';

export default class LegacyFormatter {
  constructor(context) {
    this.context = context;
  }

  /**
   * Returns the format by name or all formats if no name is specified.
   *
   * @method get
   * @param {String} name Optional name to retrieve by.
   * @return {Array/Object} Array/Object with all registered formats or a specific format.
   */
  get(name) {
    return null;
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
    return this.toggle(name, vars, node);
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
    return this.toggle(name, vars, node);
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
    const result = document.execCommand(name, false, vars);

    if (name == 'removeFormat') {
      // If the command is 'removeFormat', we need to "post" purify the selection
      HtmlSanitizer.purifyRange(this.context, this.context.invoke('editor.selection.getRange'), ['format']);
    }

    return result;
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
    switch (name) {
      case 'backColor':
      case 'fontName':
      case 'fontSize':
      case 'foreColor':
      case 'highlightColor':
        return document.queryCommandValue(name);
      default:
        return document.queryCommandState(name);
    }   
  }
}