/**
 * Escapes HTML special characters to prevent XSS attacks
 * when interpolating user-controlled data into HTML strings.
 */
export function escapeHtml(text: string | null | undefined): string {
  if (text == null) return '';
  
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}
