#!/usr/bin/env npx tsx

import {
  generateReport,
  formatReportMarkdown,
  scanVersions,
} from "./version-check";
import {
  updateAllVersions,
  formatUpdateResultsMarkdown,
} from "./version-update";

const HELP_TEXT = "\nVersion Sync - Node.js Version Management\n\nUsage:\n  npx tsx index.ts <command> [options]\n\nCommands:\n  check                   Check for version mismatches across project files\n  update <version>        Update all version files to target version\n  help                    Show this help message\n\nOptions:\n  --dry-run              Preview changes without modifying files (for update command)\n  --no-backup            Skip creating backup files before updates\n\nExamples:\n  # Check current version status\n  npx tsx index.ts check\n\n  # Preview updating to Node 22\n  npx tsx index.ts update 22 --dry-run\n\n  # Update all files to Node 22\n  npx tsx index.ts update 22\n\n  # Update without creating backups\n  npx tsx index.ts update 22 --no-backup\n";

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const projectRoot = process.cwd();

  switch (command) {
    case "check": {
      const report = generateReport(projectRoot);
      console.log(formatReportMarkdown(report));

      if (report.hasMismatch) {
        console.log("\nRun 'npx tsx index.ts update <version>' to sync all files.");
        process.exit(1);
      }
      break;
    }

    case "update": {
      const versionArg = args[1];
      const dryRun = args.includes("--dry-run");
      const noBackup = args.includes("--no-backup");

      if (!versionArg) {
        console.error("Error: Version number required.");
        console.error("Usage: npx tsx index.ts update <version> [--dry-run]");
        process.exit(1);
      }

      const targetVersion = parseInt(versionArg, 10);
      if (isNaN(targetVersion) || targetVersion < 1) {
        console.error("Error: Invalid version number: " + versionArg);
        process.exit(1);
      }

      // First show current state
      const report = generateReport(projectRoot, targetVersion);
      console.log(formatReportMarkdown(report, targetVersion));
      console.log("");

      // Perform update
      const results = updateAllVersions(projectRoot, targetVersion, {
        dryRun,
        backup: !noBackup,
      });

      console.log(formatUpdateResultsMarkdown(results, dryRun));

      const failures = results.filter((r) => !r.success);
      if (failures.length > 0) {
        process.exit(1);
      }

      if (dryRun) {
        console.log("\nThis was a dry run. No files were modified.");
        console.log("Run 'npx tsx index.ts update " + targetVersion + "' to apply changes.");
      }
      break;
    }

    default:
      console.error("Unknown command: " + command);
      console.log(HELP_TEXT);
      process.exit(1);
  }
}

main();
