/// Builds the shortcut string the Rust side parses, e.g. "Alt+KeyM".
/// Returns null while only modifiers are held, so a chord can be captured as
/// the user presses it.

const MODIFIER_CODES = [
  "AltLeft",
  "AltRight",
  "ControlLeft",
  "ControlRight",
  "ShiftLeft",
  "ShiftRight",
  "MetaLeft",
  "MetaRight",
];

export function shortcutFromEvent(event: {
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}): string | null {
  if (MODIFIER_CODES.includes(event.code) || event.code === "") {
    return null;
  }

  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Control");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  if (event.metaKey) parts.push("Super");
  parts.push(event.code);
  return parts.join("+");
}

/// "Alt+KeyM" reads as "Alt + M" to a person.
export function shortcutLabel(shortcut: string): string {
  return shortcut
    .split("+")
    .map((part) => part.replace(/^Key/, "").replace(/^Digit/, ""))
    .join(" + ");
}
