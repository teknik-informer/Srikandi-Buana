export function hasUnsavedChanges(form?: HTMLFormElement | null) {
  if (form) return form.dataset.unsaved === "true";
  return typeof document !== "undefined" && !!document.querySelector('form[data-protect-unsaved][data-unsaved="true"]');
}
export function canDiscardChanges(form?: HTMLFormElement | null) {
  return !hasUnsavedChanges(form) || window.confirm("Ada perubahan yang belum disimpan. Tinggalkan perubahan tersebut?");
}
export function markFormSaved(form: HTMLFormElement) {
  delete form.dataset.unsaved;
}
export function markFormDirty(form: HTMLFormElement | null) {
  if (form) form.dataset.unsaved = "true";
}
