/**
 * Load polyfills conditionally - only if the feature doesn't exist
 * This prevents loading unnecessary code for modern browsers
 */

// Check if toSorted exists, load polyfill if not
if (typeof Array.prototype.toSorted !== 'function') {
  // @ts-ignore - Dynamic import of polyfill, types not needed
  import('core-js/modules/es.array.to-sorted');
}

// Add other conditional polyfills as needed when you use ES2023+ features
// if (typeof Array.prototype.toReversed !== 'function') {
//   import('core-js/modules/es.array.to-reversed');
// }
// if (typeof Array.prototype.with !== 'function') {
//   import('core-js/modules/es.array.with');
// }
