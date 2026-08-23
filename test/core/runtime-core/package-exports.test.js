import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";


const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../..",
);

test("the core subpaths are import-inert and share package identities", () =>
{
    const probe = spawnSync(process.execPath, [
        "--input-type=module",
        "--eval",
        `
            const guarded = [ "document", "window", "navigator", "screen" ];
            for (const name of guarded)
            {
                Object.defineProperty(globalThis, name, {
                    configurable: true,
                    get()
                    {
                        throw new Error(\`Core import touched \${name}\`);
                    }
                });
            }

            const core = await import("@carbonenginejs/runtime/core");
            const platform = await import("@carbonenginejs/runtime/core/platform");
            for (const name of guarded) delete globalThis[name];
            const root = await import("@carbonenginejs/runtime");

            if (core.default !== core.CjsLibrary)
            {
                throw new Error("Core default export must be CjsLibrary");
            }
            if (root.CjsLibrary !== core.CjsLibrary)
            {
                throw new Error("CjsLibrary must retain its core identity at the aggregate root");
            }
            for (const name of [
                "CjsWebGLProbe",
                "Tr2DisplayMode",
                "Tr2PlatformInfo",
                "Tr2VideoAdapter",
                "Tr2VideoAdapters",
                "Tr2VideoDriver"
            ])
            {
                if (platform[name] === undefined)
                {
                    throw new Error(\`Missing core platform export: \${name}\`);
                }
                if (core[name] !== platform[name] || root[name] !== platform[name])
                {
                    throw new Error(\`Core platform identity mismatch: \${name}\`);
                }
            }
        `,
    ], {
        cwd: path.join(packageRoot, "npm"),
        encoding: "utf8",
    });

    assert.equal(probe.status, 0, probe.stderr || probe.stdout);
});
