import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prohibited = String.fromCharCode(102, 115, 100);
const excludedDirectories = new Set([
  ".git",
  ".deno",
  ".scratch",
  "coverage",
  "node_modules"
]);
const violations = [];

ScanDirectory(root, "");

if (violations.length)
{
  for (const violation of violations)
  {
    console.error(`repository text policy violation: ${violation}`);
  }
  process.exitCode = 1;
}
else
{
  console.log("repository text policy passed");
}

function ScanDirectory(directory, relativeDirectory)
{
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }))
  {
    if (entry.isDirectory() && excludedDirectories.has(entry.name))
    {
      continue;
    }

    const relativePath = path.join(relativeDirectory, entry.name);
    const normalizedPath = relativePath.replaceAll("\\", "/");
    if (normalizedPath.toLowerCase().includes(prohibited))
    {
      violations.push(`${normalizedPath} (filename)`);
    }

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory())
    {
      ScanDirectory(absolutePath, relativePath);
    }
    else if (entry.isFile())
    {
      if (ContainsProhibitedText(absolutePath))
      {
        violations.push(`${normalizedPath} (content)`);
      }
    }
  }
}

function ContainsProhibitedText(absolutePath)
{
  const text = fs.readFileSync(absolutePath).toString("utf8");

  if (!absolutePath.toLowerCase().endsWith(".map"))
  {
    return text.toLowerCase().includes(prohibited);
  }

  try
  {
    const map = JSON.parse(text);
    const meaningfulText = [
      map.file,
      ...(map.sources ?? []),
      ...(map.sourcesContent ?? []),
      ...(map.names ?? [])
    ].join("\n");

    return meaningfulText.toLowerCase().includes(prohibited);
  }
  catch
  {
    return text.toLowerCase().includes(prohibited);
  }
}
