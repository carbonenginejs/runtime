import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

test("global Blue source parses without enabling decorator syntax", () =>
{
    const root = fileURLToPath(new URL("../../src/global/blue/", import.meta.url));
    for (const relative of fs.readdirSync(root, {recursive: true}).filter(name => name.endsWith(".js")))
    {
        const source = fs.readFileSync(path.join(root, relative), "utf8");
        assert.doesNotThrow(() => parse(source, {sourceType: "module"}), relative);
    }
});
