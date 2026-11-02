export function spaced(id: string): string {
  return id.replaceAll("_", " ");
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function humanize(id: string): string {
  return capitalize(spaced(id));
}
