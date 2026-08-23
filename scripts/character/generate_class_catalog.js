import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classCatalogMetadata } from "./class_catalog_metadata.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceRoot = path.join(root, "src", "character");
const output = path.join(root, "docs", "character", "reference", "classes", "README.md");
const metadataBySource = new Map();
const classes = [];

for (const metadata of classCatalogMetadata)
{
    if (metadataBySource.has(metadata.source))
    {
        throw new Error(`Duplicate reviewed class-catalog source: ${metadata.source}`);
    }

    metadataBySource.set(metadata.source, metadata);
}

for (const file of await GetJavaScriptFiles(sourceRoot))
{
    const source = await fs.readFile(file, "utf8");
    const lines = source.split(/\r?\n/u);
    const relative = path.relative(root, file).replaceAll(path.sep, "/");

    for (let index = 0; index < lines.length; index++)
    {
        const match = lines[index].match(/^export class\s+([A-Za-z0-9_$]+)/u);

        if (!match)
        {
            continue;
        }

        const sentence = FirstSentence(ReadClassDoc(lines, index));

        if (!sentence)
        {
            throw new Error(`${relative}:${index + 1} ${match[1]} has no class-level JSDoc`);
        }

        const metadata = metadataBySource.get(relative);

        if (!metadata)
        {
            throw new Error(`${relative}:${index + 1} ${match[1]} has no reviewed class-catalog metadata`);
        }

        if (metadata.name !== match[1])
        {
            throw new Error(
                `${relative}:${index + 1} declares ${match[1]} but reviewed metadata names ${metadata.name}`
            );
        }

        classes.push({ ...metadata, sentence });
        metadataBySource.delete(relative);
    }
}

if (metadataBySource.size)
{
    throw new Error(
        `Reviewed class-catalog metadata has no maintained class: ${[...metadataBySource.keys()].join(", ")}`
    );
}

classes.sort((left, right) => left.name.localeCompare(right.name));

const body = classes.map(value => `<!-- class:${value.name} -->
## \`${value.name}\`

${value.sentence}

- Export: ${value.export}
- Source: \`${value.source}\`
- Visibility: ${value.visibility}
- Kind: ${value.kind}
`).join("\n");

const document = `# Character class catalog

Status: Evolving
Scope: \`@carbonenginejs/runtime/character\` named source classes
Audience: Users, maintainers, and automated readers
Summary: Provides reviewed one-sentence purposes for every named class in the character runtime package.

Generated from reviewed class-level JSDoc and explicit export metadata in
\`scripts/character/class_catalog_metadata.js\` by
\`scripts/character/generate_class_catalog.js\`.
Update source purposes and regenerate; do not edit catalog entries directly.

${body}`;

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, document, "utf8");

console.log(`character class catalog generated -> ${classes.length} entries`);

function ReadClassDoc(lines, classIndex)
{
    let end = classIndex - 1;

    while (end >= 0 && !lines[end].includes("*/"))
    {
        end--;
    }

    if (end < 0)
    {
        return "";
    }

    let start = end;

    while (start >= 0 && !lines[start].includes("/**"))
    {
        start--;
    }

    if (start < 0)
    {
        return "";
    }

    const between = lines.slice(end + 1, classIndex)
        .map(line => line.trim())
        .filter(Boolean);

    if (between.some(line => !line.startsWith("@")))
    {
        return "";
    }

    return lines.slice(start, end + 1)
        .join("\n")
        .replace(/^[\s\S]*?\/\*\*/u, "")
        .replace(/\*\/[\s\S]*$/u, "")
        .split(/\r?\n/u)
        .map(line => line.trim().replace(/^\*\s?/u, ""))
        .join(" ")
        .replace(/\s+/gu, " ")
        .trim();
}

function FirstSentence(text)
{
    const match = text.match(/^.*?[.!?](?=\s|$)/u);
    return (match ? match[0] : text).trim();
}

async function GetJavaScriptFiles(directory)
{
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const found = [];

    for (const entry of entries)
    {
        const full = path.join(directory, entry.name);

        if (entry.isDirectory())
        {
            found.push(...await GetJavaScriptFiles(full));
        }
        else if (entry.isFile() && entry.name.endsWith(".js"))
        {
            found.push(full);
        }
    }

    return found.sort();
}
