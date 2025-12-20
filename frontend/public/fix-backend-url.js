// Force override any backend references
window.addEventListener('DOMContentLoaded', () => {
  // Override fetch globally
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (typeof url === 'string' && url.includes('backend:8000')) {
      url = url.replace('http://backend:8000', 'http://localhost:8000');
      url = url.replace('https://backend:8000', 'http://localhost:8000');
    }
    return originalFetch.call(this, url, options);
  };
});

// Also override XMLHttpRequest
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...args) {
  if (typeof url === 'string' && url.includes('backend:8000')) {
    url = url.replace('http://backend:8000', 'http://localhost:8000');
    url = url.replace('https://backend:8000', 'http://localhost:8000');
  }
  return originalOpen.call(this, method, url, ...args);
};