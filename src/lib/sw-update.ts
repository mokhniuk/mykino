type UpdateFn = (reloadPage?: boolean) => Promise<void>;

let _updateSW: UpdateFn | null = null;

export function setUpdateSW(fn: UpdateFn) {
  _updateSW = fn;
}

export function triggerSWUpdate() {
  if (_updateSW) {
    _updateSW(true);
  } else {
    window.location.reload();
  }
}
