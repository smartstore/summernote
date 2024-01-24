import MatchCommand from './MatchCommand';
import ApplyCommand from './ApplyCommandNew';
import RemoveCommand from './RemoveCommand';

export default class CommandController {
  constructor(context) {
    this.context = context;
    this.options = context.options;
  }

  /**
   * Gets style command object.
   * @param {String} commandName - Name of command to return.
   * @return {null|Object}
   */
  get(commandName) {
    const command = typeof commandName == "string" ? this.options.commands[commandName] : commandName;
    if (!command) {
      console.error(`The command ${commandName} does not exist. Add a command object to the options.commands list.`);
      return null;
    }

    return command;
  }

  /**
   * Tests whether the given command matches any node within the passed range.
   * @param {String|Object} command - Command object or name
   * @param {WrappedRange} rng - The range to query within
   * @param {null|Array} ancestors - Array of ancestor nodes to walk up. If null, ancestors are resolved from the current selection range.
   * @return {null|boolean|Object}
   */
  matchRange(command, rng, ancestors = null) {
    command = this.get(command);
    if (!command) {
      return null;
    }

    return MatchCommand.matchRange(command, rng, ancestors);
  }

  matchNode(command, node) {
    return MatchCommand.matchNode(command, node);
  }

  /**
   * Applies a style style command to the current selection.
   * @param {String|Object} command - Command object or name
   * @param {WrappedRange} rng - The range to query within
   * @param {String} variant - Optional command variant (or command argument) as defined by the command metadata.
   */
  apply(command, rng, variant = null) {
    command = this.get(command);
    if (!command) {
      return null;
    }

    return ApplyCommand.apply(command, rng, variant);
  }

  remove(command, rng, variant = null) {
    command = this.get(command);
    if (!command) {
      return null;
    }

    const match = MatchCommand.matchRange(command, rng);
    if (match) {
      return RemoveCommand.remove(command, rng, match, variant);
    }
    else {
      return false;
    }
  }

  toggle(command, rng, variant = null) {
    command = this.get(command);
    if (!command) {
      return null;
    }

    const match = MatchCommand.matchRange(command, rng);
    if (match) {
      return RemoveCommand.remove(command, rng, match, variant);
    }
    else {
      return ApplyCommand.apply(command, rng, variant);
    }
  }
}