# Version Sync

A Claude Code skill for detecting and synchronizing Node.js version specifications across project files.

## Installation

### As a Claude Code Skill

```bash
# Clone to your Claude skills directory
git clone https://github.com/wrsmith108/claude-skill-version-sync.git ~/.claude/skills/version-sync
```

### Standalone Usage

```bash
npx tsx ~/.claude/skills/version-sync/scripts/index.ts <command> [options]
```

## Trigger Phrases

This skill activates when you mention:
- "version mismatch"
- "upgrade node"
- "sync versions"
- "update node version"
- "version drift"
- "check node versions"
- "node version conflict"

## Commands

### Check Version Status

```bash
npx tsx scripts/index.ts check
```

Scans the current project for Node.js version specifications and reports any mismatches.

### Update All Versions

```bash
npx tsx scripts/index.ts update <version>
```

Updates all version files to the specified target version.

**Options:**
- `--dry-run` - Preview changes without modifying files
- `--no-backup` - Skip creating backup files before updates

## Supported Files

| File | Pattern | Example |
|------|---------|---------|
| `.nvmrc` | First line number | `22` |
| `package.json` | `engines.node` | `">=22.0.0"` |
| `Dockerfile` | `FROM node:<version>` | `FROM node:22-slim` |
| `.github/workflows/*.yml` | `node-version` | `node-version: '22'` |
| `docker-compose.yml` | `image: node:<version>` | `image: node:22-alpine` |

## Usage Examples

```bash
# Check for version mismatches
npx tsx scripts/index.ts check

# Preview updating to Node 22
npx tsx scripts/index.ts update 22 --dry-run

# Update all files to Node 22
npx tsx scripts/index.ts update 22
```

## Output Format

```markdown
## Node.js Version Status

| File | Current | Target | Action |
|------|---------|--------|--------|
| .nvmrc | 22 | 22 | No change |
| Dockerfile | 20-slim | 22-slim | Will update |
| package.json | >=20.0.0 | >=22.0.0 | Will update |
```

## Best Practices

1. Always run `check` first to understand current state
2. Use `--dry-run` before applying updates
3. Commit version changes separately for clear git history
4. Test after updating to ensure compatibility

## Requirements

- Node.js 18+
- TypeScript (tsx for execution)

## License

MIT

## Related Skills

- [ci-doctor](https://github.com/wrsmith108/claude-skill-ci-doctor) - Diagnose CI/CD pipeline issues
- [flaky-test-detector](https://github.com/wrsmith108/claude-skill-flaky-test-detector) - Detect flaky tests
- [docker-optimizer](https://github.com/wrsmith108/claude-skill-docker-optimizer) - Optimize Dockerfiles
- [security-auditor](https://github.com/wrsmith108/claude-skill-security-auditor) - Security audits
