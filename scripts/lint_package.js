import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { transformAsync } from "@babel/core";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoots = [ "src", "scripts", "test" ];

/**
 * Collects the public documents: the package README plus the docs/ tree.
 */
async function GetPublicDocuments()
{
  const documents = [ "README.md" ];
  const markdown = await GetFiles(path.join(root, "docs"), new Set([ ".md" ]));

  for (const file of markdown)
  {
    documents.push(path.relative(root, file).replaceAll(path.sep, "/"));
  }

  return documents;
}

/**
 * Collects files with one of the requested extensions in deterministic order.
 */
async function GetFiles(directory, extensions)
{
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name)))
  {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory())
    {
      files.push(...await GetFiles(entryPath, extensions));
    }
    else if (entry.isFile() && extensions.has(path.extname(entry.name)))
    {
      files.push(entryPath);
    }
  }

  return files;
}

/**
 * Parses authoring and test modules with the package decorator configuration.
 */
async function CheckJavaScript(file, errors)
{
  const relativeFile = path.relative(root, file).replaceAll(path.sep, "/");
  const source = await fs.readFile(file, "utf8");

  if (/[ \t]+$/mu.test(source))
  {
    errors.push(`${relativeFile}: contains trailing whitespace`);
  }

  if (/^\/\/ Ported from CarbonEngine/mu.test(source))
  {
    errors.push(`${relativeFile}: use exact // Source: <Carbon path> provenance`);
  }

  if (
    relativeFile.startsWith("src/generated/") &&
    !relativeFile.endsWith("/index.js") &&
    !relativeFile.endsWith("/enums.js") &&
    !source.startsWith("// Source:")
  )
  {
    errors.push(`${relativeFile}: generated Carbon source requires an exact source header`);
  }

  if (relativeFile.startsWith("src/"))
  {
    CheckBrowserOnly(relativeFile, source, errors);
  }

  try
  {
    await transformAsync(source, {
      filename: file,
      sourceType: "module",
      babelrc: false,
      configFile: false,
      code: false,
      ast: false,
      plugins: [
        [ "@babel/plugin-proposal-decorators", { version: "2023-11" } ]
      ]
    });
  }
  catch (error)
  {
    errors.push(`${relativeFile}:${error.loc?.line ?? 1}: ${error.message}`);
  }
}

/**
 * Rejects Node reach in published source (hard rule, 2026-08-06): only tests
 * and scripts may use Node — everything under src/ is browser-only. Static
 * builtin imports break browser bundles outright; a literal dynamic
 * `import("node:...")` forces code-splitting on downstream bundlers (rollup
 * refuses UMD builds once it sees one); and the `new Function` specifier
 * trick, while bundler-invisible, is still Node reach hiding in published
 * code, so it is banned rather than grandfathered.
 */
function CheckBrowserOnly(relativeFile, source, errors)
{
  // Strip comments so documentation may name the banned constructs.
  const code = source
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/^[ \t]*\/\/.*$/gmu, "");

  const rules = [
    [ /from\s+["']node:/u, "imports a node: builtin" ],
    [ /import\s*\(\s*["'`]node:/u, "dynamically imports a node: builtin" ],
    [ /require\s*\(\s*["']node:/u, "requires a node: builtin" ],
    [ /from\s+["'](?:fs|path|os|url|crypto|http|https|net|stream|zlib|child_process|worker_threads|module)["']/u, "imports a bare Node builtin" ],
    [ /new\s+Function\s*\([^)]*import\s*\(/u, "hides a dynamic import inside new Function" ],
    [ /__dirname|__filename/u, "uses a Node path global" ],
    [ /\bprocess\.(?:env|argv|platform|cwd|exit|versions)\b/u, "reads the Node process global" ]
  ];

  for (const [ pattern, reason ] of rules)
  {
    if (pattern.test(code))
    {
      errors.push(`${relativeFile}: ${reason}; src/ is browser-only (tests and scripts may use Node)`);
    }
  }

  // Node's Buffer global is tolerated only behind an explicit feature detect
  // on the same line (the gltf base64 fast path); any other call site is Node
  // reach. Only real usage is matched - the word "Buffer" alone is GPU-domain
  // vocabulary (structured buffers, constant buffers) all over the shader
  // formats.
  for (const line of code.split("\n"))
  {
    if (/\bnew\s+Buffer\b|\bBuffer\s*\.\s*(?:from|alloc|allocUnsafe|concat|isBuffer)\b/u.test(line)
      && !/typeof\s+Buffer/u.test(line))
    {
      errors.push(`${relativeFile}: calls Node's Buffer without a typeof feature detect; src/ is browser-only`);
      break;
    }
  }
}

/**
 * Rejects filesystem links outside this package and broken relative links.
 */
async function CheckDocument(name, errors)
{
  const file = path.join(root, name);
  const source = await fs.readFile(file, "utf8");
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/gu;

  // Link scanning ignores code, because shader and C-family snippets contain
  // `type[N](args)` constructor calls that match the markdown link pattern.
  const prose = source
    .replace(/^[ \t]*```[\s\S]*?^[ \t]*```/gmu, "")
    .replace(/`[^`\n]*`/gu, "");

  // Every docs/ page carries the organization standard metadata header.
  if (name.startsWith("docs/"))
  {
    if (!/^# .+/u.test(source))
    {
      errors.push(`${name}: must start with a "# Title" heading`);
    }

    for (const field of [ "Status:", "Scope:", "Audience:", "Summary:" ])
    {
      if (!source.includes(field))
      {
        errors.push(`${name}: missing standard header field ${field}`);
      }
    }
  }

  for (const match of prose.matchAll(linkPattern))
  {
    const target = match[1].trim().split(/\s+/u, 1)[0];

    if (!target || target.startsWith("#") || /^(?:https?:|mailto:)/iu.test(target))
    {
      continue;
    }

    if (/^(?:file:|[a-z]:[\\/]|[\\/]{1,2})/iu.test(target))
    {
      errors.push(`${name}: external filesystem link is not allowed: ${target}`);
      continue;
    }

    const linkPath = target.split("#", 1)[0];
    const resolved = path.resolve(path.dirname(file), linkPath);
    const relative = path.relative(root, resolved);

    if (relative.startsWith("..") || path.isAbsolute(relative))
    {
      errors.push(`${name}: link escapes the package: ${target}`);
      continue;
    }

    try
    {
      await fs.access(resolved);
    }
    catch
    {
      errors.push(`${name}: broken relative link: ${target}`);
    }
  }
}

/**
 * Ensures the authoring and publish manifests describe one standalone package.
 */
async function CheckManifests(errors)
{
  const authoring = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  const published = JSON.parse(await fs.readFile(path.join(root, "npm.package.json"), "utf8"));

  if (authoring.name !== published.name || authoring.version !== published.version)
  {
    errors.push("package.json and npm.package.json must have matching names and versions");
  }

  for (const [name, version] of Object.entries(authoring.dependencies ?? {}))
  {
    if (/^(?:file:|link:)/iu.test(version))
    {
      errors.push(`package.json: dependency ${name} links outside the package`);
    }
  }

  await CheckLocalDependencyLinkSafety(authoring, errors);
}

/**
 * Ensures a local `file:` dependency cannot be installed as a junction.
 *
 * `.agents/rules.md` makes this a hard rule: npm must pack and install an
 * ordinary directory copy, never a symlink or Windows junction into a sibling
 * repository. Without `install-links=true` a recursive delete through
 * `node_modules` reaches a live repo, which is how a package was destroyed on
 * 2026-07-31.
 *
 * The check is on devDependencies too, and that is the point: published
 * dependencies are already rejected outright above, so the only `file:` deps
 * that survive are development ones - exactly the case that went unguarded.
 *
 * An `.npmrc` enforcing this is worthless untracked, since a fresh clone would
 * not have it, so the file must exist in the working tree the lint runs over.
 *
 * @param {object} authoring Parsed authoring manifest.
 * @param {string[]} errors Collected lint errors.
 */
async function CheckLocalDependencyLinkSafety(authoring, errors)
{
  const linked = [
    ...Object.entries(authoring.dependencies ?? {}),
    ...Object.entries(authoring.devDependencies ?? {})
  ].filter(([ , version ]) => /^(?:file:|link:)/iu.test(String(version)));

  if (!linked.length) return;

  let npmrc = null;
  try
  {
    npmrc = await fs.readFile(path.join(root, ".npmrc"), "utf8");
  }
  catch
  {
    errors.push(
      `.npmrc is missing but ${linked.length} local dependency/dependencies use file: `
      + `(${linked.map(([ name ]) => name).join(", ")}); it must set install-links=true `
      + "so npm installs a copy rather than a junction into a sibling repository"
    );
    return;
  }

  if (!/^\s*install-links\s*=\s*true\s*$/mu.test(npmrc))
  {
    errors.push(
      ".npmrc must set install-links=true while local file: dependencies exist "
      + `(${linked.map(([ name ]) => name).join(", ")})`
    );
  }
}

const errors = [];
const JavaScriptExtensions = new Set([ ".js", ".mjs" ]);

for (const sourceRoot of sourceRoots)
{
  const files = await GetFiles(path.join(root, sourceRoot), JavaScriptExtensions);

  for (const file of files)
  {
    await CheckJavaScript(file, errors);
  }
}

for (const document of await GetPublicDocuments())
{
  await CheckDocument(document, errors);
}

await CheckManifests(errors);

if (errors.length)
{
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} package lint error(s)`);
  process.exitCode = 1;
}
else
{
  console.log("runtime-resource package lint passed");
}
