// The character YAML format round-trips the shipped files (format-ownership.md; model-values-interchange.md:26): every
// file reads, writes and reads again to equal values, and the written text is the file's own. Each file is matched,
// in order, byte for byte under its type's dump style (`CjsCharacterYamlFormat.dumpStyles`), byte for byte under the
// other PyYAML flow style or the other Python float repr (a file dumped by another tool version), or as text with ints
// and floats, the two spellings of null and the trailing line breaks normalized. A file that matches none is listed
// in EXCEPTIONS with its reason.
//
// Game files are never committed (org rule). The test reads through tools-core's service and skips when it is not
// running (CJS_TOOLS_SERVER, default http://127.0.0.1:5510; CJS_CLIENT_BUILD pins the build). Every file of the small
// types is read; `.type` and `.color` are fixed samples (SAMPLE of each, every Nth path in sorted order).
import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterYamlFormat } from "../../../../../src/resource/formats/character/index.js";

const SERVER = process.env.CJS_TOOLS_SERVER ?? "http://127.0.0.1:5510";
const SAMPLE = 400;

/** Files no rule matches, each with its reason. */
const EXCEPTIONS = {
    "res:/graphics/character/global/facesetup/trianglefields.trif": "hand edited: `[Neck_right , Neck_left]` has a space before the comma",
    "res:/graphics/character/global/paperdolllibrary/prs/npc/sorayaroden.prs": "hand edited: a colour line wraps at a column PyYAML does not break at"
};

/** The build and the character paths by extension, or why the test skips. */
async function Corpus()
{
    try
    {
        let build = process.env.CJS_CLIENT_BUILD;
        if (!build)
        {
            const describe = await (await fetch(`${SERVER}/eve/latest/build`, { signal: AbortSignal.timeout(10000) })).json();
            build = describe.builds?.resources ?? describe.build;
        }
        const index = await fetch(`${SERVER}/eve/${build}/app/resfileindex.txt`, { signal: AbortSignal.timeout(120000) });
        if (!index.ok) return { skip: `no resfileindex for build ${build} (${index.status})` };
        const paths = (await index.text()).split("\n").map(line => line.split(",")[0].trim().toLowerCase())
            .filter(path => path.startsWith("res:/graphics/character/")).sort();
        return { build, paths };
    }
    catch (error)
    {
        return { skip: `the character corpus needs tools-core at ${SERVER} (${error.message})` };
    }
}

const corpus = await Corpus();

/** A fixed sample of sorted paths: every Nth, at most `count`. */
const Sample = (paths, count) => paths.length <= count ? paths : Array.from({ length: count }, (_, i) => paths[Math.floor(i * paths.length / count)]);

/** Raw values compared with bigints and tags intact. */
const Same = (a, b) => JSON.stringify(a, (key, value) => typeof value === "bigint" ? value + "n" : value)
    === JSON.stringify(b, (key, value) => typeof value === "bigint" ? value + "n" : value);

/** Text with ints and floats, `key: null` and trailing line breaks normalized. */
const Normalize = text => text.replace(/\r\n/gu, "\n").replace(/\s+$/u, "").replace(/: null$/gmu, ":")
    .replace(/(?<![\w.])[-+]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?(?![\w.])/gu, number => String(Number(number)));

/**
 * How a file's text matches the writer's: "exact", "variant", "normalized" or null.
 * @param {string} text The file.
 * @param {*} raw Its lossless values.
 * @param {string} extension Its extension.
 * @returns {?string}
 */
function Match(text, raw, extension)
{
    const style = CjsCharacterYamlFormat.dumpStyles[extension];
    const lineBreak = text.includes("\r\n") ? "\r\n" : "\n";
    const written = CjsCharacterYamlFormat.write(raw, { extension, lineBreak });
    if (written === text) return "exact";
    for (const variant of [ { defaultFlowStyle: style.defaultFlowStyle === null ? false : null }, { floatDigits: style.floatDigits === null ? 17 : null } ])
    {
        if (CjsCharacterYamlFormat.write(raw, { extension, lineBreak, ...variant }) === text) return "variant";
    }
    return Normalize(written) === Normalize(text) ? "normalized" : null;
}

for (const extension of CjsCharacterYamlFormat.extensions)
{
    test(`every shipped ${extension} reads, writes and reads again to the same values and its own text`, { skip: corpus.skip }, async t =>
    {
        const all = corpus.paths.filter(path => path.endsWith(extension));
        assert.ok(all.length > 0, `the build lists no ${extension} file`);
        const paths = extension === ".type" || extension === ".color" ? Sample(all, SAMPLE) : all;
        const failures = [], counts = { exact: 0, variant: 0, normalized: 0 };
        for (let i = 0; i < paths.length; i += 16)
        {
            await Promise.all(paths.slice(i, i + 16).map(async path =>
            {
                const response = await fetch(`${SERVER}/eve/${corpus.build}/resources/${path.slice("res:/".length)}`);
                if (!response.ok) throw new Error(path + ": " + response.status);
                const text = await response.text();
                const raw = CjsCharacterYamlFormat.readRaw(text, { sourceName: path });
                const written = CjsCharacterYamlFormat.write(raw, { extension });
                if (!Same(CjsCharacterYamlFormat.readRaw(written), raw)) failures.push(path + ": values differ after a write");
                const match = Match(text, raw, extension);
                if (match) counts[match]++;
                else if (!Object.hasOwn(EXCEPTIONS, path)) failures.push(path + ": text differs");
            }));
        }
        assert.deepEqual(failures, []);
        t.diagnostic(`${paths.length} of ${all.length} files: ${JSON.stringify(counts)}`);
    });
}
