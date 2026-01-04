import * as fs from "fs";
import * as path from "path";

export interface VersionInfo {
  file: string;
  relativePath: string;
  currentVersion: string;
  fullVersion: string;
  majorVersion: number;
  fileType: string;
}

export interface VersionReport {
  versions: VersionInfo[];
  hasMismatch: boolean;
  targetVersion: number | null;
}

/**
 * Extract major version number from a version string
 */
function extractMajorVersion(version: string): number {
  const match = version.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Check .nvmrc file for Node version
 */
function checkNvmrc(projectRoot: string): VersionInfo | null {
  const filePath = path.join(projectRoot, ".nvmrc");
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, "utf-8").trim();
  const match = content.match(/^v?(\d+)/);
  if (!match) return null;

  return {
    file: filePath,
    relativePath: ".nvmrc",
    currentVersion: match[1],
    fullVersion: content,
    majorVersion: parseInt(match[1], 10),
    fileType: "nvmrc",
  };
}

/**
 * Check package.json engines.node field
 */
function checkPackageJson(projectRoot: string): VersionInfo | null {
  const filePath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(filePath)) return null;

  try {
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const nodeVersion = content?.engines?.node;
    if (!nodeVersion) return null;

    return {
      file: filePath,
      relativePath: "package.json",
      currentVersion: extractMajorVersion(nodeVersion).toString(),
      fullVersion: nodeVersion,
      majorVersion: extractMajorVersion(nodeVersion),
      fileType: "package.json",
    };
  } catch {
    return null;
  }
}

/**
 * Check Dockerfile for Node version
 */
function checkDockerfile(projectRoot: string): VersionInfo | null {
  const filePath = path.join(projectRoot, "Dockerfile");
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, "utf-8");
  const match = content.match(/FROM\s+node:(\d+)([^\s]*)?/i);
  if (!match) return null;

  const suffix = match[2] || "";
  return {
    file: filePath,
    relativePath: "Dockerfile",
    currentVersion: match[1],
    fullVersion: match[1] + suffix,
    majorVersion: parseInt(match[1], 10),
    fileType: "dockerfile",
  };
}

/**
 * Check docker-compose.yml for Node version
 */
function checkDockerCompose(projectRoot: string): VersionInfo | null {
  const filePath = path.join(projectRoot, "docker-compose.yml");
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, "utf-8");
  const match = content.match(/image:\s*node:(\d+)([^\s]*)?/i);
  if (!match) return null;

  const suffix = match[2] || "";
  return {
    file: filePath,
    relativePath: "docker-compose.yml",
    currentVersion: match[1],
    fullVersion: match[1] + suffix,
    majorVersion: parseInt(match[1], 10),
    fileType: "docker-compose",
  };
}

/**
 * Check GitHub workflow files for Node version
 */
function checkGitHubWorkflows(projectRoot: string): VersionInfo[] {
  const workflowDir = path.join(projectRoot, ".github", "workflows");
  if (!fs.existsSync(workflowDir)) return [];

  const results: VersionInfo[] = [];

  try {
    const files = fs.readdirSync(workflowDir).filter(f => f.endsWith(".yml") || f.endsWith(".yaml"));

    for (const file of files) {
      const filePath = path.join(workflowDir, file);
      const content = fs.readFileSync(filePath, "utf-8");

      // Check for node-version: '22' or node-version: "22" patterns
      const nodeVersionMatch = content.match(/node-version:\s*['"]?(\d+)['"]?/i);
      if (nodeVersionMatch) {
        results.push({
          file: filePath,
          relativePath: ".github/workflows/" + file,
          currentVersion: nodeVersionMatch[1],
          fullVersion: nodeVersionMatch[1],
          majorVersion: parseInt(nodeVersionMatch[1], 10),
          fileType: "github-workflow",
        });
        continue;
      }

      // Check for NODE_VERSION: '22' pattern
      const nodeEnvMatch = content.match(/NODE_VERSION:\s*['"]?(\d+)['"]?/i);
      if (nodeEnvMatch) {
        results.push({
          file: filePath,
          relativePath: ".github/workflows/" + file,
          currentVersion: nodeEnvMatch[1],
          fullVersion: nodeEnvMatch[1],
          majorVersion: parseInt(nodeEnvMatch[1], 10),
          fileType: "github-workflow",
        });
      }
    }
  } catch {
    // Directory read failed, ignore
  }

  return results;
}

/**
 * Check .node-version file
 */
function checkNodeVersion(projectRoot: string): VersionInfo | null {
  const filePath = path.join(projectRoot, ".node-version");
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, "utf-8").trim();
  const match = content.match(/^v?(\d+)/);
  if (!match) return null;

  return {
    file: filePath,
    relativePath: ".node-version",
    currentVersion: match[1],
    fullVersion: content,
    majorVersion: parseInt(match[1], 10),
    fileType: "node-version",
  };
}

/**
 * Check .tool-versions file (asdf)
 */
function checkToolVersions(projectRoot: string): VersionInfo | null {
  const filePath = path.join(projectRoot, ".tool-versions");
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, "utf-8");
  const match = content.match(/nodejs\s+(\d+)/);
  if (!match) return null;

  return {
    file: filePath,
    relativePath: ".tool-versions",
    currentVersion: match[1],
    fullVersion: match[1],
    majorVersion: parseInt(match[1], 10),
    fileType: "tool-versions",
  };
}

/**
 * Scan project for all Node.js version specifications
 */
export function scanVersions(projectRoot: string): VersionInfo[] {
  const versions: VersionInfo[] = [];

  // Check all version sources
  const checks = [
    checkNvmrc(projectRoot),
    checkPackageJson(projectRoot),
    checkDockerfile(projectRoot),
    checkDockerCompose(projectRoot),
    checkNodeVersion(projectRoot),
    checkToolVersions(projectRoot),
  ];

  // Add non-null results
  for (const check of checks) {
    if (check) versions.push(check);
  }

  // Add workflow versions
  const workflowVersions = checkGitHubWorkflows(projectRoot);
  versions.push(...workflowVersions);

  return versions;
}

/**
 * Generate version report with mismatch detection
 */
export function generateReport(
  projectRoot: string,
  targetVersion?: number
): VersionReport {
  const versions = scanVersions(projectRoot);

  // Determine if there are mismatches
  const majorVersions = new Set(versions.map((v) => v.majorVersion));
  const hasMismatch = majorVersions.size > 1;

  // Use provided target or most common version
  let resolvedTarget = targetVersion ?? null;
  if (!resolvedTarget && versions.length > 0) {
    // Find most common major version
    const versionCounts = new Map<number, number>();
    for (const v of versions) {
      versionCounts.set(v.majorVersion, (versionCounts.get(v.majorVersion) || 0) + 1);
    }
    let maxCount = 0;
    for (const [ver, count] of versionCounts) {
      if (count > maxCount) {
        maxCount = count;
        resolvedTarget = ver;
      }
    }
  }

  return {
    versions,
    hasMismatch,
    targetVersion: resolvedTarget,
  };
}

/**
 * Format report as markdown table
 */
export function formatReportMarkdown(
  report: VersionReport,
  targetVersion?: number
): string {
  const target = targetVersion ?? report.targetVersion;

  if (report.versions.length === 0) {
    return "## Node.js Version Status\n\nNo Node.js version files found in this project.";
  }

  let output = "## Node.js Version Status\n\n";

  if (report.hasMismatch) {
    output += "**Warning: Version mismatch detected!**\n\n";
  } else {
    output += "All versions are aligned.\n\n";
  }

  output += "| File | Current | Target | Action |\n";
  output += "|------|---------|--------|--------|\n";

  for (const v of report.versions) {
    const needsUpdate = target && v.majorVersion !== target;
    const action = needsUpdate ? "Will update" : "No change";
    const icon = needsUpdate ? "[UPDATE]" : "[OK]";
    output += "| " + v.relativePath + " | " + v.fullVersion + " | " + (target ?? "-") + " | " + icon + " " + action + " |\n";
  }

  return output;
}

// CLI execution
if (require.main === module) {
  const projectRoot = process.cwd();
  const report = generateReport(projectRoot);
  console.log(formatReportMarkdown(report));
  if (report.hasMismatch) {
    process.exit(1);
  }
}
