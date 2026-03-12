import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const CANCEL = Symbol("clack-cancel");

export function intro(title = "") {
  if (title) {
    stdout.write(`\n${title}\n`);
  }
}

export function note(message = "", title = "") {
  const prefix = title ? `${title}: ` : "";
  stdout.write(`${prefix}${message}\n`);
}

export function outro(message = "") {
  if (message) {
    stdout.write(`${message}\n`);
  }
}

export function cancel(message = "") {
  if (message) {
    stdout.write(`${message}\n`);
  }
}

export function isCancel(value) {
  return value === CANCEL;
}

export async function text({ message, initialValue = "", validate }) {
  const rl = createInterface({ input: stdin, output: stdout });

  while (true) {
    const suffix = initialValue ? ` [${initialValue}]` : "";
    const answer = await rl.question(`${message}${suffix}: `);
    const value = answer === "" ? initialValue : answer;

    if (value.toLowerCase() === ":cancel") {
      rl.close();
      return CANCEL;
    }

    const error = validate?.(value);
    if (!error) {
      rl.close();
      return value;
    }

    const detail = error instanceof Error ? error.message : String(error);
    stdout.write(`${detail}\n`);
  }
}
