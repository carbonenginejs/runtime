// Public packages never reference the private organization documents, agent
// workspaces or machine paths. State the fact itself in plain words instead.
// Scans every tracked text file; zero hits allowed.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SELF = "scripts/lint-private-references.js";
// Ignore rules name local folders; they reference nothing.
const IGNORED = new Set([ SELF, ".gitignore", ".npmignore" ]);
const BINARY = /\.(png|jpe?g|gif|webp|psd|dds|tga|bin|wasm|gz|tgz|zip|ktx2?|glb|gr2|black|red|wem|bnk|ogg|mp3|mp4|webm|ttf|woff2?)$/iu;
const RULES = [
    [ "private org document", /(?:^|[^\w.-])\/?docs\/(?:internal|research|projects|architecture|specifications|standards|decisions)\//u ],
    [ "agent workspace path", /(?:^|[^\w.-])\.agents[\\/]/u ],
    [ "machine path", /\b[A-Za-z]:[\\/](?:carbon|Users|ccpwgl|skindr|[\w-]*carbonenginejs)/iu ],
    [ "machine path", /\bR:[\\/]/u ]
];

const files = execFileSync("git", [ "ls-files", "-z" ], { cwd: root, encoding: "utf8" })
    .split("\0").filter(file => file && !IGNORED.has(file) && !BINARY.test(file));

const hits = [];
for (const file of files)
{
    let text;
    try { text = fs.readFileSync(path.join(root, file), "utf8"); }
    catch { continue; }
    const lines = text.split(/\r?\n/u);
    for (let i = 0; i < lines.length; i++)
    {
        for (const [ kind, pattern ] of RULES)
        {
            if (pattern.test(lines[i])) hits.push(`${file}:${i + 1}: ${kind}: ${lines[i].trim().slice(0, 140)}`);
        }
    }
}

if (hits.length)
{
    for (const hit of hits) console.error(hit);
    console.error(`\nPrivate-reference lint: ${hits.length} hit(s). Public packages must not reference private docs, agent workspaces or machine paths; state the fact in plain words.`);
    process.exit(1);
}
console.log(`Private-reference lint: ${files.length} files, 0 hits.`);
