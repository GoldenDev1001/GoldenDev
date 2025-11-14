// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(
    { enabled: true, restoreVolumeAfterAd: true, blockedAds: 0 },
    (items) => {
      // ensure defaults exist
      chrome.storage.local.set({
        enabled: items.enabled,
        restoreVolumeAfterAd: items.restoreVolumeAfterAd,
        blockedAds: items.blockedAds || 0
      }, () => {
        console.log('Smart Adblocker installed/initialized.');
        // set badge to reflect initial enabled state
        chrome.action.setBadgeText({ text: items.enabled ? 'ON' : 'OFF' });
      });
    }
  );
});
