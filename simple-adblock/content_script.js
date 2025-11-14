// content_script.js
(() => {
  'use strict';

  let ENABLED = true;
  let restoreVolumeAfterAd = true;
  let blockedCount = 0;

  // --- Utilities ---
  function log(...args) { /* uncomment to debug: console.log('[adblock]', ...args); */ }

  function safe(fn) {
    try { fn(); } catch (e) { console.error('SmartAdblocker error:', e); }
  }

  // Load settings & count at startup
  chrome.storage.local.get(
    { enabled: true, restoreVolumeAfterAd: true, blockedAds: 0 },
    (items) => {
      ENABLED = !!items.enabled;
      restoreVolumeAfterAd = !!items.restoreVolumeAfterAd;
      blockedCount = Number(items.blockedAds) || 0;
      log('Loaded settings', { ENABLED, restoreVolumeAfterAd, blockedCount });
    }
  );

  // Increment stored counter safely
  function incrementBlocked(n = 1) {
    // Read current, write new (simple, may slightly undercount on race but fine for this use)
    chrome.storage.local.get({ blockedAds: 0 }, (res) => {
      const next = (Number(res.blockedAds) || 0) + n;
      chrome.storage.local.set({ blockedAds: next }, () => {
        blockedCount = next;
      });
    });
  }

  // Ad element selectors to remove
  const AD_SELECTORS = [
    'ytd-display-ad-renderer',
    'ytd-promoted-video-renderer',
    'ytd-compact-promoted-video-renderer',
    'ytd-promoted-sparkles-text-renderer',
    'ytd-ads',
    '#player-ads',
    '.ytp-ad-overlay-slot',
    '.ytp-ad-module',
    '.video-ads',
    '.ytp-paid-content-overlay',
    '.ytp-ad-player-overlay'
  ];

  // Remove ad nodes found under root
  function removeAdNodes(root = document) {
    if (!ENABLED) return 0;
    let removed = 0;
    safe(() => {
      const nodes = root.querySelectorAll(AD_SELECTORS.join(','));
      nodes.forEach(node => {
        try {
          node.remove();
          removed++;
        } catch (e) {}
      });
    });
    if (removed > 0) {
      incrementBlocked(removed);
      log('Removed ad nodes:', removed);
    }
    return removed;
  }

  // Click skip/close ad buttons if present
  function clickSkipAndClose(root = document) {
    if (!ENABLED) return 0;
    let acted = 0;
    safe(() => {
      const skipBtns = root.querySelectorAll('.ytp-ad-skip-button, button[aria-label="Skip ad"]');
      skipBtns.forEach(btn => {
        try {
          btn.click();
          acted++;
        } catch (e) {}
      });

      const closeBtns = root.querySelectorAll('.ytp-ad-overlay-close-button, button[aria-label="Close ad"]');
      closeBtns.forEach(btn => {
        try {
          btn.click();
          acted++;
        } catch (e) {}
      });
    });
    if (acted > 0) {
      incrementBlocked(acted);
      log('Clicked skip/close buttons:', acted);
    }
    return acted;
  }

  // Mute video during ad and restore after
  let savedVolume = null;
  function handleAdAudio() {
    if (!ENABLED) return;
    safe(() => {
      const video = document.querySelector('video');
      if (!video) return;
      const adPresent = !!document.querySelector('.ytp-ad-player-overlay, .ytp-ad-module, .ytp-ad-overlay-slot, .ad-showing');
      if (adPresent) {
        if (restoreVolumeAfterAd && !video.dataset._ad_saved) {
          savedVolume = { muted: video.muted, volume: video.volume };
          video.dataset._ad_saved = '1';
        }
        try { video.muted = true; } catch (e) {}
      } else {
        if (video.dataset._ad_saved) {
          try {
            if (savedVolume) {
              video.muted = !!savedVolume.muted;
              if (typeof savedVolume.volume === 'number') video.volume = savedVolume.volume;
            } else {
              video.muted = false;
            }
          } catch (e) {}
          delete video.dataset._ad_saved;
        }
      }
    });
  }

  // Debounced observer callback
  let observerTimer = null;
  function scheduleSweep(root) {
    if (observerTimer) clearTimeout(observerTimer);
    observerTimer = setTimeout(() => {
      try {
        removeAdNodes(root || document);
        clickSkipAndClose(root || document);
        handleAdAudio();
      } catch (e) { console.error(e); }
    }, 250); // 250ms debounce
  }

  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      if (!ENABLED) return;
      // If many mutations, call sweep once with document to be safe
      scheduleSweep(document);
      // Additionally, attempt to act on added nodes quickly
      mutations.forEach(m => {
        if (m.addedNodes && m.addedNodes.length) {
          m.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              scheduleSweep(node);
            }
          });
        }
      });
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });

    // Periodic sweep as fallback
    setInterval(() => {
      if (!ENABLED) return;
      removeAdNodes(document);
      clickSkipAndClose(document);
      handleAdAudio();
    }, 2000);
  }

  // Message handler (popup/options)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || typeof msg !== 'object') {
      // nothing to do
      return false;
    }

    if (msg.type === 'TOGGLE_ENABLED') {
      ENABLED = !!msg.enabled;
      // update badge handled by popup or background; content script just respects flag
      sendResponse({ ok: true, enabled: ENABLED });
      return true; // indicate async reply not needed but safe
    }

    if (msg.type === 'OPTIONS_UPDATED') {
      chrome.storage.local.get({ enabled: true, restoreVolumeAfterAd: true }, (items) => {
        ENABLED = !!items.enabled;
        restoreVolumeAfterAd = !!items.restoreVolumeAfterAd;
        sendResponse({ ok: true });
      });
      return true; // we will call sendResponse asynchronously
    }

    if (msg.type === 'RESET_COUNTER') {
      blockedCount = 0;
      chrome.storage.local.set({ blockedAds: 0 }, () => {
        sendResponse({ ok: true });
      });
      return true;
    }

    return false;
  });

  // Initial run
  removeAdNodes(document);
  clickSkipAndClose(document);
  handleAdAudio();
  startObserver();

  // Re-run simple init on history navigation events YouTube uses
  window.addEventListener('yt-navigate-finish', () => {
    safe(() => {
      removeAdNodes(document);
      clickSkipAndClose(document);
      handleAdAudio();
    });
  }, { passive: true });

})();
