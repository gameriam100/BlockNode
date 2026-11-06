// Keep the local Go process alive while the editor window is active.
// A missed heartbeat window lets the server shut itself down after the app closes.
(() => {
  const heartbeat = () => {
    fetch('/api/heartbeat', { method: 'POST', cache: 'no-store' }).catch(() => {});
  };
  heartbeat();
  window.setInterval(heartbeat, 4000);
})();
