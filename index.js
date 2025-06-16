// clone‑build.js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { rmSync } = require("fs");
const inquirer = require("inquirer");
console.log(typeof inquirer.prompt);

const reposFile = "repos.txt";
const baseDir = path.join(process.cwd(), "cloned_repos");

if (!fs.existsSync(reposFile)) {
  console.error(`❌ File not found: ${reposFile}`);
  process.exit(1);
}

if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir);
}

// read URLs, ignoring blank lines & comments
const repos = fs
  .readFileSync(reposFile, "utf-8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

(async () => {
  if (repos.length === 0) {
    console.log("Nothing to do – no repos in repos.txt");
    return;
  }

  // ── prompt user ──────────────────────────────────────────────────────────────
  const { selected } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selected",
      message: "Select repositories to clone / build:",
      choices: repos.map((url) => ({ name: url, value: url })),
      pageSize: 15,
    },
  ]);

  if (selected.length === 0) {
    console.log("No repositories selected. Exiting.");
    return;
  }

  // ── process each selected repo ──────────────────────────────────────────────
  for (const repoUrl of selected) {
    const repoName = repoUrl
      .split("/")
      .pop()
      .replace(/\.git$/, "");
    const targetPath = path.join(baseDir, repoName);

    console.log(`\n📦 Cloning ${repoUrl} into ${targetPath}...`);
    try {
      execSync(`git clone ${repoUrl} "${targetPath}"`, { stdio: "inherit" });
    } catch (err) {
      console.error(`❌ Failed to clone ${repoUrl}: ${err.message}`);
      continue;
    }

    try {
      console.log(`\n📥 Installing dependencies in ${repoName}...`);
      execSync(`npm install`, { cwd: targetPath, stdio: "inherit" });

      console.log(`\n🔨 Building ${repoName}...`);
      execSync(`npm run build`, { cwd: targetPath, stdio: "inherit" });

      // remove folder after successful build
      rmSync(targetPath, { recursive: true, force: true });
      console.log(`✅ Finished building ${repoName}`);
    } catch (err) {
      console.error(`❌ Error in ${repoName}: ${err.message}`);
      console.log(`🛑 Keeping ${repoName} folder for inspection.`);
    }
  }
})();
