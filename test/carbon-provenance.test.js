import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { jsProvenance, headerEnums } from "../scripts/lib/carbon-header-shape.js";
import { sourceIndex } from "../scripts/lib/carbon-source-index.js";

test("an inserted import cannot hide module provenance or enum attribution", () =>
{
    const header = "// Source: donor/Owner.h\n// More context\n";
    const before = header + "import { notify } from './notify.js';\nexport const Code = { FIRST: 0 };";
    const after = "import { notify } from './notify.js';\n" + header + "export const Code = { FIRST: 0 };";
    assert.equal(jsProvenance(after), jsProvenance(before));
    assert.match(jsProvenance(after), /donor\/Owner\.h/);
});

test("provenance parsing ignores fake comments in strings and citations inside methods", () =>
{
    const source = "import './setup.js';\n// Source: donor/Real.h\n" +
        "const text = `\n// Source: donor/Fake.h\n`;\n" +
        "class Owner { Run() {\n// Source: donor/Method.h\nreturn text; } }";
    assert.equal(jsProvenance(source), "// Source: donor/Real.h");
});

test("source indexing retains imported-first donors and exposes their enum declarations", async t =>
{
    const directory = await mkdtemp(join(tmpdir(), "carbon-provenance-"));
    t.after(() =>
    {
        const target = resolve(directory);
        assert.equal(dirname(target), resolve(tmpdir()));
        assert.ok(basename(target).startsWith("carbon-provenance-"));
        return rm(target, { recursive: true, force: true });
    });
    const packageRoot = join(directory, "package"), carbonRoot = join(directory, "carbon");
    await mkdir(join(packageRoot, "src"), { recursive: true });
    await mkdir(join(carbonRoot, "donor"), { recursive: true });
    await writeFile(join(carbonRoot, "donor", "Owner.h"), "class Owner { public: enum Code { FIRST = 3, SECOND = 7 }; };\n");
    await writeFile(join(packageRoot, "src", "Owner.js"), "import './setup.js';\n// Source: donor/Owner.h\nexport class Owner {}\n");
    const index = await sourceIndex(packageRoot, carbonRoot);
    assert.equal(index.problems.size, 0);
    assert.equal(index.sources.has("donor/Owner.h"), true, "moving a source comment below an import must not remove the donor");
    const enums = headerEnums(index.sources.get("donor/Owner.h").source);
    assert.equal(enums.length, 1);
    assert.equal(enums[0].owner, "Owner");
    assert.deepEqual([...enums[0].members], [["FIRST", 3], ["SECOND", 7]]);
});
