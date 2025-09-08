// Map simple detectors to web-features IDs (best-effort, extendable)
export const FEATURE_MAP = {
  // JS APIs
  'js:IntersectionObserver': 'intersection-observer',
  'js:ResizeObserver': 'resize-observer',
  'js:Notification': 'web-notifications',
  'js:navigator.clipboard': 'async-clipboard',
  'js:navigator.serviceWorker': 'service-workers',

  // CSS features
  'css:backdrop-filter': 'css-backdrop-filter',
  'css:container-queries': 'css-container-queries',
  'css:subgrid': 'css-subgrid',

  // HTML features
  'html:dialog': 'html-dialog-element',
  'html:autocomplete.one-time-code': 'autocomplete-one-time-code'
};
