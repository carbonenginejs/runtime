import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../..",
);

test("the input subpath is import-inert and shares root identities", () =>
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
                        throw new Error(\`Input import touched \${name}\`);
                    }
                });
            }

            const input = await import("@carbonenginejs/runtime/input");
            for (const name of guarded) delete globalThis[name];
            const root = await import("@carbonenginejs/runtime");

            for (const name of [
                "GetUIScancode",
                "SCANCODES",
                "Tr2MainWindow",
                "Tr2MainWindowState",
                "Tr2MouseCursor",
                "UIScancode"
            ])
            {
                if (root[name] !== input[name])
                {
                    throw new Error(\`Input identity mismatch: \${name}\`);
                }
            }
        `,
    ], {
        cwd: path.join(packageRoot, "npm"),
        encoding: "utf8",
    });

    assert.equal(probe.status, 0, probe.stderr || probe.stdout);
});
