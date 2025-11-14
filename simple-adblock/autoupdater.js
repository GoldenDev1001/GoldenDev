(async function() {
    const repoOwner = "GoldenDev1001"; // GitHub username
    const repoName = "GoldenDev";      // GitHub repo name
    const currentVersion = chrome.runtime.getManifest().version;

    const githubApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;

    try {
        const response = await fetch(githubApiUrl);
        if (!response.ok) throw new Error("Failed to fetch GitHub API");
        const data = await response.json();

        const latestVersion = data.tag_name || data.name;
        if (!latestVersion) throw new Error("Cannot determine latest version");

        console.log(`Current version: ${currentVersion}, Latest version: ${latestVersion}`);

        if (latestVersion !== currentVersion) {
            console.log("New version available. Updating...");

            const asset = data.assets.find(a => a.name.endsWith(".zip"));
            if (!asset) throw new Error("No downloadable asset found for update");

            const downloadUrl = asset.browser_download_url;
            console.log(`Downloading update from: ${downloadUrl}`);

            // Notify the user to manually update (automatic install is not allowed in Chrome extensions)
            chrome.notifications.create({
                type: "basic",
                iconUrl: "icon.png",
                title: "Extension Update Available",
                message: `A new version (${latestVersion}) is available. Click to download.`,
                buttons: [{ title: "Download" }]
            }, (notificationId) => {
                chrome.notifications.onButtonClicked.addListener((nid, btnIdx) => {
                    if (nid === notificationId && btnIdx === 0) {
                        chrome.tabs.create({ url: downloadUrl });
                    }
                });
            });
        } else {
            console.log("Extension is up-to-date.");
        }

    } catch (error) {
        console.error("Auto-updater error:", error);
    }
})();
