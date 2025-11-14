// options.js
document.addEventListener('DOMContentLoaded', () => {
  const enabledEl = document.getElementById('opt-enabled');
  const volEl = document.getElementById('opt-volume');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');

  // load
  chrome.storage.local.get({ enabled: true, restoreVolumeAfterAd: true }, (items) => {
    enabledEl.checked = !!items.enabled;
    volEl.checked = !!items.restoreVolumeAfterAd;
  });

  saveBtn.addEventListener('click', () => {
    const enabled = !!enabledEl.checked;
    const restoreVolumeAfterAd = !!volEl.checked;

    chrome.storage.local.set({ enabled, restoreVolumeAfterAd }, () => {
      status.textContent = 'Saved!';
      setTimeout(() => status.textContent = '', 1400);

      // notify youtube tabs
      chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { type: 'OPTIONS_UPDATED' }, () => {
            if (chrome.runtime.lastError) {
              // ignore tabs where the content script isn't present
              // console.warn('options -> tab message error', chrome.runtime.lastError.message);
            }
          });
        });
      });
    });
  });
});
