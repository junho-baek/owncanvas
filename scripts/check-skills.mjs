#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");
const registryPath = path.join(repoRoot, ".agents", "skills", "registry.json");
const registry = JSON.parse(readFileSync(registryPath, "utf8"));

const strict = process.argv.includes("--strict");
const home = homedir();

function expandCandidate(candidate) {
  if (candidate === "~") {
    return home;
  }

  if (candidate.startsWith("~/")) {
    return path.join(home, candidate.slice(2));
  }

  return path.resolve(repoRoot, candidate);
}

function findInstalledPath(skill) {
  return skill.pathCandidates.map(expandCandidate).find((candidate) => existsSync(candidate));
}

const results = registry.skills.map((skill) => ({
  ...skill,
  installedPath: findInstalledPath(skill)
}));

const missing = results.filter((skill) => !skill.installedPath);
const byGroup = new Map();

for (const skill of missing) {
  const group = byGroup.get(skill.group) ?? [];
  group.push(skill);
  byGroup.set(skill.group, group);
}

console.log(`OwnCanvas skill check (${results.length} expected skills)`);
console.log("");

for (const skill of results) {
  const status = skill.installedPath ? "[ok]" : "[missing]";
  const location = skill.installedPath ?? skill.pathCandidates.join(" | ");
  console.log(`${status} ${skill.name} - ${location}`);
}

if (missing.length === 0) {
  console.log("");
  console.log("All expected external skills are available.");
  process.exit(0);
}

console.log("");
console.log(`Missing ${missing.length} external skill(s).`);
console.log("");

for (const [groupName, skills] of byGroup.entries()) {
  const installGroup = registry.installGroups[groupName];
  console.log(`Group: ${groupName}`);
  console.log(`Missing: ${skills.map((skill) => skill.name).join(", ")}`);

  if (installGroup) {
    console.log("Install or restore:");
    for (const command of installGroup.commands) {
      console.log(`  ${command}`);
    }
    console.log(`Fallback: ${installGroup.fallback}`);
  }

  console.log("");
}

console.log("Run `npm run skills:check` again after installing/restoring skills.");

if (strict) {
  process.exit(1);
}
