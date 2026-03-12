export type ActionHandler = (...args: any[]) => void | Promise<void>;

export class Command {
  readonly commands: Command[];
  constructor(name?: string);
  name(value: string): this;
  description(value: string): this;
  showHelpAfterError(): this;
  command(spec: string): Command;
  argument(spec: string, description?: string): this;
  option(flags: string, description?: string, defaultValue?: string): this;
  action(handler: ActionHandler): this;
  parseAsync(argv: string[]): Promise<void>;
  helpInformation(): string;
  opts(): Record<string, unknown>;
}
