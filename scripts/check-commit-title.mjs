#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");

export const COMMIT_TITLE_SCOPES = [
  {
    name: "campaign-core",
    description: "Campaign rules, state transitions, validation, and derived read models"
  },
  {
    name: "ui",
    description: "React components and page layout"
  },
  {
    name: "storage",
    description: "localStorage, persistence mapping, and compatibility"
  },
  {
    name: "plugin",
    description: "External providers, automation, and extension glue"
  },
  {
    name: "api",
    description: "HTTP route contracts that consume Campaign core"
  },
  {
    name: "tests",
    description: "Focused regression or contract tests"
  },
  {
    name: "docs",
    description: "Documentation and project memory"
  },
  {
    name: "tooling",
    description: "Scripts, checks, and build/development tooling"
  }
];

const scopeNames = COMMIT_TITLE_SCOPES.map((scope) => scope.name);
const scopePattern = scopeNames.join("|");
const titlePattern = new RegExp(`^(${scopePattern}): [a-z0-9][a-z0-9 ._/'-]*$`);
const mixedScopePattern = new RegExp(`\\b(${scopePattern})(\\+|,|/| and )(${scopePattern})\\b`);
const scopeAliases = {
  "campaign-core": ["model", "validation", "state transition", "derived read model"],
  ui: ["component", "page layout"],
  storage: ["persistence", "localstorage"],
  plugin: ["adapter", "provider", "automation"],
  api: ["route", "http"]
};

export function getCommitTitleFromMessage(message) {
  return message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#")) ?? "";
}

export function validateCommitTitle(title) {
  const normalizedTitle = getCommitTitleFromMessage(title);
  const errors = [];

  if (!normalizedTitle) {
    errors.push("Commit title is empty.");
    return { ok: false, title: normalizedTitle, errors };
  }

  if (normalizedTitle.length > 72) {
    errors.push("Commit title must be 72 characters or fewer.");
  }

  if (!titlePattern.test(normalizedTitle)) {
    errors.push(
      `Commit title must use '<scope>: <summary>' with one scope: ${scopeNames.join(", ")}.`
    );
  }

  if (mixedScopePattern.test(normalizedTitle)) {
    errors.push("Commit title must name one change scope, not multiple joined scopes.");
  }

  const titleMatch = normalizedTitle.match(titlePattern);
  if (titleMatch) {
    const [, titleScope] = titleMatch;
    const summary = normalizedTitle.slice(`${titleScope}: `.length);
    const otherScopeTerms = COMMIT_TITLE_SCOPES
      .filter((scope) => scope.name !== titleScope)
      .flatMap((scope) => [scope.name, ...(scopeAliases[scope.name] ?? [])]);

    if (otherScopeTerms.some((term) => summary.includes(term))) {
      errors.push("Commit title summary must not name another change scope.");
    }
  }

  return {
    ok: errors.length === 0,
    title: normalizedTitle,
    errors
  };
}

function readInputFromArgs(args) {
  const rawInput = args.join(" ").trim();

  if (rawInput) {
    const candidatePath = path.resolve(process.cwd(), rawInput);
    if (existsSync(candidatePath)) {
      return readFileSync(candidatePath, "utf8");
    }

    return rawInput;
  }

  const commitMessagePath = path.join(repoRoot, ".git", "COMMIT_EDITMSG");
  if (existsSync(commitMessagePath)) {
    return readFileSync(commitMessagePath, "utf8");
  }

  return "";
}

function printHelp() {
  console.log("Usage:");
  console.log('  node scripts/check-commit-title.mjs "campaign-core: add completion guard"');
  console.log("  node scripts/check-commit-title.mjs .git/COMMIT_EDITMSG");
  console.log("");
  console.log("Scopes:");
  for (const scope of COMMIT_TITLE_SCOPES) {
    console.log(`  ${scope.name} - ${scope.description}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  const result = validateCommitTitle(readInputFromArgs(process.argv.slice(2)));

  if (result.ok) {
    console.log(`Commit title ok: ${result.title}`);
    process.exit(0);
  }

  console.error("Commit title check failed.");
  for (const error of result.errors) {
    console.error(`- ${error}`);
  }
  console.error("");
  printHelp();
  process.exit(1);
}
