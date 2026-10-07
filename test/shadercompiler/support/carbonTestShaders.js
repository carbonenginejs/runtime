// Reads the HLSL sources embedded in Carbon's own shader compiler tests
// (trinity/shadercompiler/tests/*.cpp, raw string literals), from the local
// Carbon checkout. The sources stay in Carbon's repository; when the checkout
// is absent the tests that use them skip.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// A Carbon checkout named carbonengine beside the organization checkout,
// unless CARBON_SHADERCOMPILER_TESTS names the tests directory.
const TESTS_DIR = process.env.CARBON_SHADERCOMPILER_TESTS ??
    resolve(fileURLToPath(new URL("../../../../../carbonengine/trinity/shadercompiler/tests", import.meta.url)));

/**
 * Why the Carbon-backed tests skip, or false when they can run.
 *
 * @returns {string|false} The skip reason.
 */
export function carbonTestsSkipReason()
{
    return existsSync(TESTS_DIR) ? false : `Carbon checkout not found at ${TESTS_DIR} (set CARBON_SHADERCOMPILER_TESTS)`;
}

/**
 * Every raw string literal in Carbon's compiler tests, with the test it
 * belongs to.
 *
 * @returns {Array<{ file: string, test: string, source: string }>} The sources, `source` as written (it starts with a newline).
 */
export function carbonTestShaders()
{
    const result = [];
    for (const file of readdirSync(TESTS_DIR).filter(name => name.endsWith(".cpp")).sort())
    {
        const text = readFileSync(join(TESTS_DIR, file), "utf8").replace(/\r\n/gu, "\n");
        const literal = /R"(\w*)\(([\s\S]*?)\)\1"/gu;
        for (let match = literal.exec(text); match; match = literal.exec(text))
        {
            const before = text.slice(0, match.index);
            const tests = [...before.matchAll(/(?:TYPED_)?TEST\(\s*(\w+),\s*(\w+)\s*\)/gu)];
            const test = tests.length ? `${tests.at(-1)[1]}.${tests.at(-1)[2]}` : "(file scope)";
            result.push({ file, test, source: match[2] });
        }
    }
    return result;
}
