/*
 * Frontend configuration.
 * Change this one value when you deploy the backend.
 */
const isLocalHost = ['127.0.0.1', 'localhost'].includes(window.location.hostname);

window.IRONLOG_CONFIG = {
  // On Render the website and API share one origin. Keep port 5000 for
  // local development when the frontend is opened through another server.
  API_BASE: isLocalHost && window.location.port !== '5000'
    ? 'http://127.0.0.1:5000'
    : window.location.origin
};
