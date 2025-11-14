// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const muteBtn = document.getElementById('muteBtn');
  const optionsBtn = document.getElementById('optionsBtn');
  const countEl = document.getElementById('count');
  const resetBtn = document.getElementById('resetBtn');

  function safeSend(tabId, msg) {
    chrome.tabs.sendMessage(tabId, msg, () => {
      if (chrome.runtime.lastError) {
        // Prevent popup errors
        // console.warn('Message ignored:', chrome.runtime.lastError.message);
      }
    });
  }

  function refreshUI() {
    chrome.storage.local.get(
      { enabled: true, restoreVolumeAfterAd: true, blockedAds: 0 },
      (data) => {
        toggleBtn.textContent = data.enabled ? 'Disable Adblocker' : 'Enable Adblocker';
        toggleBtn.className = data.enabled ? 'green' : 'red';

        muteBtn.textContent = data.restoreVolumeAfterAd ? 'Mute Ads: ON' : 'Mute Ads: OFF';
        muteBtn.className = data.restoreVolumeAfterAd ? 'green' : 'red';

        countEl.textContent = `Blocked Ads: ${Number(data.blockedAds || 0)}`;

        chrome.action.setBadgeText(
          { text: data.enabled ? 'ON' : 'OFF' },
          () => { /* ignore lastError, safe */ }
        );
      }
    );
  }

  refreshUI();

  // Toggle On/Off
  toggleBtn.addEventListener('click', () => {
    chrome.storage.local.get({ enabled: true }, (data) => {
      const newEnabled = !data.enabled;

      chrome.storage.local.set({ enabled: newEnabled }, () => {
        chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
          tabs.forEach((tab) => safeSend(tab.id, { type: 'TOGGLE_ENABLED', enabled: newEnabled }));
        });

        refreshUI();
      });
    });
  });

  // Toggle mute
  muteBtn.addEventListener('click', () => {
    chrome.storage.local.get({ restoreVolumeAfterAd: true }, (data) => {
      const newVal = !data.restoreVolumeAfterAd;

      chrome.storage.local.set({ restoreVolumeAfterAd: newVal }, () => {
        chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
          tabs.forEach((tab) => safeSend(tab.id, { type: 'OPTIONS_UPDATED' }));
        });

        refreshUI();
      });
    });
  });

  // Open Options Page (safe)
  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage(() => {
      // Avoid runtime.lastError when options page can't open
      if (chrome.runtime.lastError) {
        // ignored safely
      }
    });
  });

  // Reset Counter
  resetBtn.addEventListener('click', () => {
    chrome.storage.local.set({ blockedAds: 0 }, () => {
      chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
        tabs.forEach((tab) => safeSend(tab.id, { type: 'RESET_COUNTER' }));
      });

      refreshUI();
    });
  });
});
