import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { classDonorComments, validateDonorComment } from "../../scripts/lib/carbon-donor-comments.js";
import { checkDonorComments } from "../../scripts/lint-donor-comments.js";

test("donor parsing binds JSDoc to the class across exports and decorators", () =>
{
    const source = `
        const fake = "/** Carbon: StringOnly (native/String.h:1) */";
        /** Carbon: FunctionOnly (native/Function.h:1) */ function Helper() {}
        /**
         * Carbon: Owner::Nested (native/Owner.h:2-4)
         * Carbon: Extra (native/Extra.hpp:1)
         * Modelled on: Shape (native/Shape.h:3)
         */
        @meta.implemented @meta.define('Own') export class Own {
            /** Carbon: MethodOnly (native/Method.h:1) */ Run() {}
        }
        /** Modelled on: Other (native/Other.h:1) */ export class Second {}
        class Unrelated {}`;
    const classes = classDonorComments(source);
    assert.deepEqual(classes.map(c => [c.name, c.entries.map(e => [e.kind, e.name])]), [
        ["Own", [["Carbon", "Owner::Nested"], ["Carbon", "Extra"], ["Modelled on", "Shape"]]],
        ["Second", [["Modelled on", "Other"]]], ["Unrelated", []]
    ]);
    assert.deepEqual([classes[0].entries[0].start, classes[0].entries[0].end], [2, 4]);
});

test("donor validation rejects malformed, missing, escaping and out-of-range citations", t =>
{
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "carbon-donor-check-"));
    t.after(() => {
        assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(root).startsWith("carbon-donor-check-"));
        fs.rmSync(root, { recursive: true });
    });
    fs.mkdirSync(path.join(root, "native"));
    fs.writeFileSync(path.join(root, "native/Owner.h"), "class Owner\n{\n};\n");
    const entry = text => classDonorComments(`/** ${text} */ class Sample {}`)[0].entries[0];
    assert.equal(validateDonorComment(entry("Carbon: Owner (native/Owner.h:1-3)"), root), null);
    for (const extension of ["cpp", "py"])
    {
        fs.writeFileSync(path.join(root, `native/Owner.${extension}`), "declaration\n");
        assert.equal(validateDonorComment(entry(`Carbon: Owner (native/Owner.${extension}:1)`), root), null);
    }
    for (const text of ["Carbon: Owner", "Modelled on: Owner (native/Owner.h:2-1)",
        "Carbon: Owner (native/Owner.h:0)", "Carbon: Owner (native/Owner.h:4)",
        "Carbon: Owner (native/Missing.h:1)", "Carbon: Owner (../Owner.h:1)",
        "Carbon: Owner (C:/outside/Owner.h:1)"])
        assert.ok(validateDonorComment(entry(text), root), text);
    fs.mkdirSync(path.join(root, "package/src"), { recursive: true });
    fs.writeFileSync(path.join(root, "package/src/Sample.js"), "/** Carbon: Owner (native/Owner.h:1-3) */ export class Sample {}");
    assert.deepEqual(checkDonorComments(path.join(root, "package"), root), []);
    fs.writeFileSync(path.join(root, "package/src/Sample.js"), "/** Modelled on: Owner (native/Owner.h:7) */ export class Sample {}");
    assert.equal(checkDonorComments(path.join(root, "package"), root).length, 1);
});
