
#!/usr/bin/env node

const { exec } = require("child_process");
const path = require("path");

console.log("TARS PC Agent starting...");

// Example CLI logic
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log("TARS PC Agent - AI-powered automation system");
  console.log("\nUsage: node cli.js [command]");
  console.log("\nAvailable commands:");
  console.log("  organize-pietarien  - Organize files using Pietarien Archivist");
  console.log("  repair-reedsy       - Repair Reedsy files");
  console.log("  file-chats          - Auto-file chat transcripts");
  console.log("  book-qa             - Run Book QA system");
  console.log("  publish-assist      - Assist with publishing tasks");
  console.log("  server              - Start web server");
  console.log("  --help, -h          - Show this help message");
  process.exit(0);
}

const command = args[0];

switch (command) {
  case "organize-pietarien":
    exec(`node ${path.join(__dirname, "src/modules/pietarien-archivist/index.js")}`, (err, stdout, stderr) => {
      if (err) {
        console.error("Error:", stderr);
        process.exit(1);
      } else {
        console.log(stdout);
      }
    });
    break;

  case "repair-reedsy":
    exec(`node ${path.join(__dirname, "src/modules/reedsy-repair-agent/index.js")}`, (err, stdout, stderr) => {
      if (err) {
        console.error("Error:", stderr);
        process.exit(1);
      } else {
        console.log(stdout);
      }
    });
    break;

  case "file-chats":
    exec(`node ${path.join(__dirname, "src/modules/chat-auto-filer/index.js")}`, (err, stdout, stderr) => {
      if (err) {
        console.error("Error:", stderr);
        process.exit(1);
      } else {
        console.log(stdout);
      }
    });
    break;

  case "book-qa":
    exec(`node ${path.join(__dirname, "src/modules/book-qa-system/index.js")}`, (err, stdout, stderr) => {
      if (err) {
        console.error("Error:", stderr);
        process.exit(1);
      } else {
        console.log(stdout);
      }
    });
    break;

  case "publish-assist":
    exec(`node ${path.join(__dirname, "src/modules/publishing-assistant/index.js")}`, (err, stdout, stderr) => {
      if (err) {
        console.error("Error:", stderr);
        process.exit(1);
      } else {
        console.log(stdout);
      }
    });
    break;

  case "server":
    require('./server.js');
    break;

  default:
    console.log(`Unknown command: ${command}`);
    console.log("Use 'node cli.js --help' to see available commands.");
    process.exit(1);
}
