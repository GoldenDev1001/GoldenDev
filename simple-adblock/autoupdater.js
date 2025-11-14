import { execSync } from "child_process";
import fs from "fs";

const REPO = "https://github.com/GoldenDev1001/GoldenDev.git";
const DIR = "simple-adblock";

function run(cmd) {
    try {
        return execSync(cmd, { stdio: "inherit" });
    } catch (err) {
        console.error(`❌ Error running: ${cmd}`);
        console.error(err.message);
    }
}

console.log("=======================================");
console.log("      Simple-Adblock Auto Updater      ");
console.log("=======================================\n");

// ----------------------------------------------------
// 1. If folder missing → clone repo
// ----------------------------------------------------
if (!fs.existsSync(DIR)) {
    console.log(`📁 Folder '${DIR}' not found. Cloning repo...`);
    run(`git clone ${REPO} ${DIR}`);
    console.log("✔ Clone complete.");
    process.exit(0);
}

// ----------------------------------------------------
// 2. Folder exists → update it
// ----------------------------------------------------
console.log("🔄 Folder found. Updating repository...\n");

try {
    process.chdir(DIR);

    console.log("📥 Fetching latest changes...");
    run("git fetch --all");

    console.log("♻ Resetting local changes...");
    run("git reset --hard origin/main");

    console.log("⬆ Pulling latest version...");
    run("git pull");

    console.log("\n✔ Update complete.");
} catch (err) {
    console.error("❌ Failed to update repo:");
    console.error(err);
}

console.log("\n=======================================");
console.log("           Update Finished             ");
console.log("=======================================\n");
