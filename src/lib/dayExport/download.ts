// Hand a generated file to the browser. The app has no other download path — every
// existing CSV helper is fetch-and-parse only — so this is the single place that owns
// the object-URL lifecycle.
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  // Safari ignores a click on a detached anchor, so the link has to be in the document.
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Deferred: revoking synchronously can cancel the download in Firefox.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
