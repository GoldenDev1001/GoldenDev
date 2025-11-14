import { execSync } from "child_process";
import fs from "fs";

const repoURL = "https://github.com/GoldenDev1001/GoldenDev.git";
const targetDir = "simple-adblock";

function run(cmd) {
    return execSync(cmd, { stdio: "inherit" });
}

if (!fs.existsSync(targetDir)) {
    console.log("Folder missing — cloning repository...");
    run(`git clone ${repoURL} ${targetDir}`);
    console.log("Clone complete.");
    process.exit(0);
}

console.log("Updating repository...");
process.chdir(targetDir);

try {
    run("git reset --hard");
    run("git pull --rebase --autostash");
    console.log("Update successful.");
} catch (err) {
    console.error("Error updating repo:", err);
}
