export function cancel(message?: string): void;
export function intro(title?: string): void;
export function isCancel(value: unknown): value is symbol;
export function note(message?: string, title?: string): void;
export function outro(message?: string): void;
export function text(options: {
  message: string;
  initialValue?: string;
  validate?: (value: string) => string | Error | undefined;
}): Promise<string | symbol>;
