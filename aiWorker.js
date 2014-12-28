/**
 * Closure dependency management, require only main worker script of un-compiled version.
 */
if (typeof COMPILED == 'undefined') {
  CLOSURE_BASE_PATH = '../../../closure-library/closure/goog/';
  importScripts(
      CLOSURE_BASE_PATH + 'bootstrap/webworkers.js',
      CLOSURE_BASE_PATH + 'base.js',
      CLOSURE_BASE_PATH + 'deps.js',
      '/your-script.js');
} 