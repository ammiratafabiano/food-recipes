/**
 * Copy text to the clipboard with a robust fallback for older browsers,
 * iOS Safari, and contexts where navigator.clipboard is unavailable.
 *
 * Returns `true` on success, `false` on failure.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Modern async API (requires HTTPS + secure context)
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy method
    }
  }

  // Legacy fallback using a temporary textarea
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    // Prevent scrolling on iOS
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    // iOS specific range selection
    if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
      const range = document.createRange();
      range.selectNodeContents(textarea);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      textarea.setSelectionRange(0, text.length);
    }

    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
