import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../..",
);

test("published runtime source has no Node-only imports or globals", async () =>
{
    const pending = [ path.join(packageRoot, "src", "audio") ];
    const files = [];

    while (pending.length)
    {
        const directory = pending.pop();

        for (const entry of await fs.readdir(directory, {
            withFileTypes: true,
        }))
        {
            const target = path.join(directory, entry.name);

            if (entry.isDirectory())
            {
                pending.push(target);
            }
            else if (entry.isFile() && entry.name.endsWith(".js"))
            {
                files.push(target);
            }
        }
    }

    for (const file of files)
    {
        const source = WithoutComments(await fs.readFile(file, "utf8"));

        assert.doesNotMatch(
            source,
            /(?:from|import\s*\()\s*["']node:/u,
            file,
        );
        assert.doesNotMatch(
            source,
            /\bBuffer\b|\bprocess\b|\brequire\s*\(/u,
            file,
        );
    }
});

test("every runtime entry imports without touching browser capabilities", () =>
{
    const probe = spawnSync(process.execPath, [
        "--input-type=module",
        "--eval",
        `
            for (const name of [
                "AudioContext",
                "webkitAudioContext",
                "document",
                "window",
                "fetch"
            ])
            {
                Object.defineProperty(globalThis, name, {
                    configurable: true,
                    get()
                    {
                        throw new Error(\`Audio import touched \${name}\`);
                    }
                });
            }

            const root = await import("./npm/dist/audio/index.js");
            const graph = await import("./npm/dist/audio/trinity/index.js");
            const library = await import("./npm/dist/audio/library/index.js");
            const builder = await import("./npm/dist/audio/library-builder/index.js");

            new root.CjsAudioMan();

            for (const [ name, module ] of Object.entries({
                root,
                graph,
                library,
                builder
            }))
            {
                if (!Object.keys(module).length)
                {
                    throw new Error(\`Empty runtime entry: \${name}\`);
                }
            }
        `,
    ], {
        cwd: packageRoot,
        encoding: "utf8",
    });

    assert.equal(probe.status, 0, probe.stderr || probe.stdout);
});

function WithoutComments(source)
{
    return source
        .replace(/\/\*[\s\S]*?\*\//gu, " ")
        .split(/\r?\n/u)
        .filter(line => !line.trim().startsWith("//"))
        .join("\n");
}
