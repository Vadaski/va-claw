class Command {
  constructor(name = "") {
    this._name = name;
    this._description = "";
    this._action = null;
    this._arguments = [];
    this._options = [];
    this._parsedOptions = {};
    this.commands = [];
    this.parent = null;
  }

  name(value) { this._name = value; return this; }
  description(value) { this._description = value; return this; }
  showHelpAfterError() { return this; }

  command(spec) {
    const child = new Command(spec.trim().split(/\s+/)[0]);
    child.parent = this;
    this.commands.push(child);
    return child;
  }

  argument(spec) {
    this._arguments.push({ required: spec.startsWith("<"), name: spec.slice(1, -1) });
    return this;
  }

  option(flags, _description, defaultValue) {
    const long = flags.match(/--([a-z0-9-]+)/i)?.[1];
    if (!long) throw new Error(`Unsupported option flags: ${flags}`);
    const key = long.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    this._options.push({ key, flag: `--${long}`, requiresValue: /<.+>/.test(flags), defaultValue });
    return this;
  }

  action(handler) { this._action = handler; return this; }
  opts() { return { ...this._parsedOptions }; }

  async parseAsync(argv) {
    await this._dispatch(argv.slice(2));
  }

  async _dispatch(tokens) {
    if (tokens.includes("--help") || tokens.includes("-h")) {
      process.stdout.write(`${this.helpInformation()}\n`);
      return;
    }
    const child = tokens[0] ? this.commands.find((command) => command._name === tokens[0]) : null;
    if (child) {
      await child._dispatch(tokens.slice(1));
      return;
    }
    const { options, positionals } = this._parseTokens(tokens);
    this._parsedOptions = options;
    const required = this._arguments.filter((argument) => argument.required).length;
    if (positionals.length < required) {
      throw new Error(`Missing required argument for ${this._commandPath()}.`);
    }
    if (!this._action) {
      process.stdout.write(`${this.helpInformation()}\n`);
      return;
    }
    await this._action(...positionals, options, this);
  }

  _parseTokens(tokens) {
    const options = Object.fromEntries(this._options.map((option) => [option.key, option.defaultValue]));
    const positionals = [];
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      const option = this._options.find((entry) => entry.flag === token);
      if (!option) {
        positionals.push(token);
        continue;
      }
      options[option.key] = option.requiresValue ? tokens[++index] : true;
    }
    return { options, positionals };
  }

  helpInformation() {
    const lines = [`Usage: ${this._commandPath()}${this.commands.length ? " [command]" : ""}`];
    if (this._description) lines.push("", this._description);
    const commands = this._flattenCommands();
    if (commands.length) {
      lines.push("", "Commands:");
      for (const entry of commands) lines.push(`  ${entry}`);
    }
    return lines.join("\n");
  }

  _flattenCommands(prefix = "") {
    const nextPrefix = prefix ? `${prefix} ${this._name}`.trim() : this._name;
    return this.commands.flatMap((command) => {
      const label = `${nextPrefix} ${command._name}`.trim();
      return [label, ...command._flattenCommands(nextPrefix)];
    });
  }

  _commandPath() {
    const names = [];
    for (let current = this; current; current = current.parent) {
      if (current._name) names.push(current._name);
    }
    return names.reverse().join(" ");
  }
}

export { Command };
