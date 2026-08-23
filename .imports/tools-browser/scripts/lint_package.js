import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [];

collectJavaScript(path.join(packageRoot, "scripts"));
collectJavaScript(path.join(packageRoot, "src"));
collectJavaScript(path.join(packageRoot, "test"));

for (const file of files.sort())
{
    execFileSync(process.execPath, [ "--check", file ], { stdio: "inherit" });
}

function collectJavaScript(directory)
{
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }))
    {
        const target = path.join(directory, entry.name);

        if (entry.isDirectory()) collectJavaScript(target);
        if (entry.isFile() && entry.name.endsWith(".js")) files.push(target);
    }
}
