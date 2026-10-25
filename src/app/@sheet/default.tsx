/**
 * No sheet: the slot on a full page load and on every route but an
 * intercepted /me. While the sheet is open it covers the page, and it only
 * leaves by going back (or a full page load), which restores this.
 */
export default function NoSheet() {
  return null;
}
