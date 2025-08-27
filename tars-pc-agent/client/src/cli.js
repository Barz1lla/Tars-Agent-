const { exec } = require("child_process");
const path = require("path");

console.log("TARS PC Agent starting...");

// Example CLI logic
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log("No command provided. Use one of the following:");
  console.log("  organize-pietarien  - Organize files using Pietarien Archivist");
  console.log("  repair-reedsy       - Repair Reedsy files");
  console.log("  file-chats          - Auto-file chat transcripts");
  console.log("  book-qa             - Run Book QA system");
  console.log("  publish-assist      - Assist with publishing tasks");
  process.exit(0);
}

const command = args[0];

switch (command) {
  case "organize-pietarien":
    exec(`node ${path.join(__dirname, "modules/pietarien-archivist/index.js")}`, (err, stdout, stderr) => {
      if (err) {
        console.error("Error:", stderr);
      } else {
        console.log(stdout);
      }
    });
    break;

  case "repair-reedsy":
    exec(`node ${path.join(__dirname, "modules/reedsy-repair-agent/index.js")}`, (err, stdout, stderr) => {
      if (err) {
        console.error("Error:", stderr);
      } else {
        console.log(stdout);
      }
    });
    break;

  case "file-chats":
    exec(`node ${path.join(__dirname, "modules/chat-auto-filer/index.js")}`, (err, stdout, stderr) => {
      if (err) {
        console.error("Error:", stderr);
      } else {
        console.log(stdout);
      }
    });
    break;

  case "book-qa":
    exec(`node ${path.join(__dirname, "modules/book-qa-system/index.js")}`, (err, stdout, stderr) => {
      if (err) {
        console.error("Error:", stderr);
      } else {
        console.log(stdout);
      }
    });
    break;

  case "publish-assist":
    exec(`node ${path.join(__dirname, "modules/publishing-assistant/index.js")}`, (err, stdout, stderr) => {
      if (err) {
        console.error("Error:", stderr);
      } else {
        console.log(stdout);
      }
    });
    break;

  default:
    console.log(`Unknown command: ${command}`);
    break;
}