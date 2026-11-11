// File name buyers see when downloading: no extension, no characters that
// break file systems.
export function cleanFileName(v) {
  return String(v || "")
    .replace(/\.pdf$/i, "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}
