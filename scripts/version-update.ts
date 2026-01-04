import * as fs from "fs";
import * as path from "path";
import { scanVersions, VersionInfo } from "./version-check";

export interface UpdateResult {
  file: string;
  relativePath: string;
  oldVersion: string;
  newVersion: string;
  success: boolean;
  error?: string;
  backedUp?: boolean;
}

export interface UpdateOptions {
  dryRun: boolean;
  backup: boolean;
}

const DEFAULT_OPTIONS: UpdateOptions = {
  dryRun: false,
  backup: true,
};

/**
 * Create a backup of a file before modifying
 */
function backupFile(filePath: string): string {
  const timestamp = Date.now();
  const backupPath = filePath + ".backup." + timestamp;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

/**
 * Update .nvmrc file
 */
function updateNvmrc(
  filePath: string,
  targetVersion: number,
  options: UpdateOptions
): UpdateResult {
  const relativePath = path.relative(process.cwd(), filePath);
  const content = fs.readFileSync(filePath, "utf-8").trim();
  const newContent = targetVersion + "\n";

  if (options.dryRun) {
    return {
      file: filePath,
      relativePath,
      oldVersion: content,
      newVersion: targetVersion.toString(),
      success: true,
    };
  }

  try {
    let backedUp = false;
    if (options.backup) {
      backupFile(filePath);
      backedUp = true;
    }
    fs.writeFileSync(filePath, newContent);
    return {
      file: filePath,
      relativePath,
      oldVersion: content,
      newVersion: targetVersion.toString(),
      success: true,
      backedUp,
    };
  } catch (error) {
    return {
      file: filePath,
      relativePath,
      oldVersion: content,
      newVersion: targetVersion.toString(),
      success: false,
      error: String(error),
    };
  }
}

/**
 * Update package.json engines.node field
 */
function updatePackageJson(
  filePath: string,
  targetVersion: number,
  options: UpdateOptions
): UpdateResult {
  const relativePath = path.relative(process.cwd(), filePath);

  try {
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const oldVersion = content?.engines?.node || "";
    const newVersion = ">=" + targetVersion + ".0.0";

    if (options.dryRun) {
      return {
        file: filePath,
        relativePath,
        oldVersion,
        newVersion,
        success: true,
      };
    }

    if (!content.engines) {
      content.engines = {};
    }
    content.engines.node = newVersion;

    let backedUp = false;
    if (options.backup) {
      backupFile(filePath);
      backedUp = true;
    }
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + "\n");
    return {
      file: filePath,
      relativePath,
      oldVersion,
      newVersion,
      success: true,
      backedUp,
    };
  } catch (error) {
    return {
      file: filePath,
      relativePath,
      oldVersion: "",
      newVersion: ">=" + targetVersion + ".0.0",
      success: false,
      error: String(error),
    };
  }
}

/**
 * Update Dockerfile FROM node:<version> line
 */
function updateDockerfile(
  filePath: string,
  targetVersion: number,
  options: UpdateOptions
): UpdateResult {
  const relativePath = path.relative(process.cwd(), filePath);
  const content = fs.readFileSync(filePath, "utf-8");

  const match = content.match(/FROM\s+node:(\d+)([^\s]*)?/i);
  if (!match) {
    return {
      file: filePath,
      relativePath,
      oldVersion: "",
      newVersion: targetVersion.toString(),
      success: false,
      error: "No FROM node: line found",
    };
  }

  const oldVersion = match[1];
  const suffix = match[2] || "";
  const newContent = content.replace(
    /FROM\s+node:(\d+)([^\s]*)?/i,
    "FROM node:" + targetVersion + suffix
  );

  if (options.dryRun) {
    return {
      file: filePath,
      relativePath,
      oldVersion: oldVersion + suffix,
      newVersion: targetVersion + suffix,
      success: true,
    };
  }

  try {
    let backedUp = false;
    if (options.backup) {
      backupFile(filePath);
      backedUp = true;
    }
    fs.writeFileSync(filePath, newContent);
    return {
      file: filePath,
      relativePath,
      oldVersion: oldVersion + suffix,
      newVersion: targetVersion + suffix,
      success: true,
      backedUp,
    };
  } catch (error) {
    return {
      file: filePath,
      relativePath,
      oldVersion: oldVersion + suffix,
      newVersion: targetVersion + suffix,
      success: false,
      error: String(error),
    };
  }
}

/**
 * Update docker-compose.yml image: node:<version> line
 */
function updateDockerCompose(
  filePath: string,
  targetVersion: number,
  options: UpdateOptions
): UpdateResult {
  const relativePath = path.relative(process.cwd(), filePath);
  const content = fs.readFileSync(filePath, "utf-8");

  const match = content.match(/image:\s*node:(\d+)([^\s]*)?/i);
  if (!match) {
    return {
      file: filePath,
      relativePath,
      oldVersion: "",
      newVersion: targetVersion.toString(),
      success: false,
      error: "No image: node: line found",
    };
  }

  const oldVersion = match[1];
  const suffix = match[2] || "";
  const newContent = content.replace(
    /image:\s*node:(\d+)([^\s]*)?/i,
    "image: node:" + targetVersion + suffix
  );

  if (options.dryRun) {
    return {
      file: filePath,
      relativePath,
      oldVersion: oldVersion + suffix,
      newVersion: targetVersion + suffix,
      success: true,
    };
  }

  try {
    let backedUp = false;
    if (options.backup) {
      backupFile(filePath);
      backedUp = true;
    }
    fs.writeFileSync(filePath, newContent);
    return {
      file: filePath,
      relativePath,
      oldVersion: oldVersion + suffix,
      newVersion: targetVersion + suffix,
      success: true,
      backedUp,
    };
  } catch (error) {
    return {
      file: filePath,
      relativePath,
      oldVersion: oldVersion + suffix,
      newVersion: targetVersion + suffix,
      success: false,
      error: String(error),
    };
  }
}

/**
 * Update GitHub workflow file
 */
function updateGitHubWorkflow(
  filePath: string,
  targetVersion: number,
  options: UpdateOptions
): UpdateResult {
  const relativePath = path.relative(process.cwd(), filePath);
  let content = fs.readFileSync(filePath, "utf-8");
  let oldVersion = "";
  let updated = false;

  // Check for node-version pattern
  const nodeVersionMatch = content.match(/node-version:\s*['"]?(\d+)['"]?/i);
  if (nodeVersionMatch) {
    oldVersion = nodeVersionMatch[1];
    content = content.replace(
      /node-version:\s*['"]?(\d+)['"]?/gi,
      "node-version: '" + targetVersion + "'"
    );
    updated = true;
  }

  // Check for NODE_VERSION pattern
  const nodeEnvMatch = content.match(/NODE_VERSION:\s*['"]?(\d+)['"]?/i);
  if (nodeEnvMatch) {
    if (!oldVersion) oldVersion = nodeEnvMatch[1];
    content = content.replace(
      /NODE_VERSION:\s*['"]?(\d+)['"]?/gi,
      "NODE_VERSION: '" + targetVersion + "'"
    );
    updated = true;
  }

  if (!updated) {
    return {
      file: filePath,
      relativePath,
      oldVersion: "",
      newVersion: targetVersion.toString(),
      success: false,
      error: "No node version pattern found",
    };
  }

  if (options.dryRun) {
    return {
      file: filePath,
      relativePath,
      oldVersion,
      newVersion: targetVersion.toString(),
      success: true,
    };
  }

  try {
    let backedUp = false;
    if (options.backup) {
      backupFile(filePath);
      backedUp = true;
    }
    fs.writeFileSync(filePath, content);
    return {
      file: filePath,
      relativePath,
      oldVersion,
      newVersion: targetVersion.toString(),
      success: true,
      backedUp,
    };
  } catch (error) {
    return {
      file: filePath,
      relativePath,
      oldVersion,
      newVersion: targetVersion.toString(),
      success: false,
      error: String(error),
    };
  }
}

/**
 * Update .node-version file
 */
function updateNodeVersionFile(
  filePath: string,
  targetVersion: number,
  options: UpdateOptions
): UpdateResult {
  const relativePath = path.relative(process.cwd(), filePath);
  const content = fs.readFileSync(filePath, "utf-8").trim();
  const newContent = targetVersion + "\n";

  if (options.dryRun) {
    return {
      file: filePath,
      relativePath,
      oldVersion: content,
      newVersion: targetVersion.toString(),
      success: true,
    };
  }

  try {
    let backedUp = false;
    if (options.backup) {
      backupFile(filePath);
      backedUp = true;
    }
    fs.writeFileSync(filePath, newContent);
    return {
      file: filePath,
      relativePath,
      oldVersion: content,
      newVersion: targetVersion.toString(),
      success: true,
      backedUp,
    };
  } catch (error) {
    return {
      file: filePath,
      relativePath,
      oldVersion: content,
      newVersion: targetVersion.toString(),
      success: false,
      error: String(error),
    };
  }
}

/**
 * Update .tool-versions file (asdf)
 */
function updateToolVersions(
  filePath: string,
  targetVersion: number,
  options: UpdateOptions
): UpdateResult {
  const relativePath = path.relative(process.cwd(), filePath);
  const content = fs.readFileSync(filePath, "utf-8");

  const match = content.match(/nodejs\s+(\d+)/);
  if (!match) {
    return {
      file: filePath,
      relativePath,
      oldVersion: "",
      newVersion: targetVersion.toString(),
      success: false,
      error: "No nodejs line found",
    };
  }

  const oldVersion = match[1];
  const newContent = content.replace(/nodejs\s+(\d+)/, "nodejs " + targetVersion);

  if (options.dryRun) {
    return {
      file: filePath,
      relativePath,
      oldVersion,
      newVersion: targetVersion.toString(),
      success: true,
    };
  }

  try {
    let backedUp = false;
    if (options.backup) {
      backupFile(filePath);
      backedUp = true;
    }
    fs.writeFileSync(filePath, newContent);
    return {
      file: filePath,
      relativePath,
      oldVersion,
      newVersion: targetVersion.toString(),
      success: true,
      backedUp,
    };
  } catch (error) {
    return {
      file: filePath,
      relativePath,
      oldVersion,
      newVersion: targetVersion.toString(),
      success: false,
      error: String(error),
    };
  }
}

/**
 * Update a single version file based on its type
 */
function updateVersionFile(
  versionInfo: VersionInfo,
  targetVersion: number,
  options: UpdateOptions
): UpdateResult {
  switch (versionInfo.fileType) {
    case "nvmrc":
      return updateNvmrc(versionInfo.file, targetVersion, options);
    case "package.json":
      return updatePackageJson(versionInfo.file, targetVersion, options);
    case "dockerfile":
      return updateDockerfile(versionInfo.file, targetVersion, options);
    case "docker-compose":
      return updateDockerCompose(versionInfo.file, targetVersion, options);
    case "github-workflow":
      return updateGitHubWorkflow(versionInfo.file, targetVersion, options);
    case "node-version":
      return updateNodeVersionFile(versionInfo.file, targetVersion, options);
    case "tool-versions":
      return updateToolVersions(versionInfo.file, targetVersion, options);
    default:
      return {
        file: versionInfo.file,
        relativePath: versionInfo.relativePath,
        oldVersion: versionInfo.fullVersion,
        newVersion: targetVersion.toString(),
        success: false,
        error: "Unknown file type: " + versionInfo.fileType,
      };
  }
}

/**
 * Update all version files in a project
 */
export function updateAllVersions(
  projectRoot: string,
  targetVersion: number,
  options: Partial<UpdateOptions> = {}
): UpdateResult[] {
  const opts: UpdateOptions = { ...DEFAULT_OPTIONS, ...options };
  const versions = scanVersions(projectRoot);
  const results: UpdateResult[] = [];

  for (const versionInfo of versions) {
    // Skip if already at target version
    if (versionInfo.majorVersion === targetVersion) {
      results.push({
        file: versionInfo.file,
        relativePath: versionInfo.relativePath,
        oldVersion: versionInfo.fullVersion,
        newVersion: targetVersion.toString(),
        success: true,
      });
      continue;
    }

    const result = updateVersionFile(versionInfo, targetVersion, opts);
    results.push(result);
  }

  return results;
}

/**
 * Format update results as markdown
 */
export function formatUpdateResultsMarkdown(
  results: UpdateResult[],
  dryRun: boolean
): string {
  let output = dryRun
    ? "## Version Update Preview (Dry Run)\n\n"
    : "## Version Update Results\n\n";

  if (results.length === 0) {
    return output + "No version files found to update.";
  }

  output += "| File | Old Version | New Version | Status |\n";
  output += "|------|-------------|-------------|--------|\n";

  for (const r of results) {
    const status = r.success
      ? r.oldVersion === r.newVersion
        ? "No change needed"
        : dryRun
        ? "Will update"
        : "Updated"
      : "Error: " + r.error;
    output += "| " + r.relativePath + " | " + r.oldVersion + " | " + r.newVersion + " | " + status + " |\n";
  }

  if (!dryRun) {
    const backedUp = results.filter((r) => r.backedUp);
    if (backedUp.length > 0) {
      output += "\n**" + backedUp.length + " file(s) backed up before modification.**";
    }
  }

  return output;
}
