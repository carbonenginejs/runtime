import test from "node:test";
import assert from "node:assert/strict";

import { CjsFormat } from "../../../src/resource/format/CjsFormat.js";
import * as formats from "../../../src/resource/formats/index.js";

// ONE CONTRACT, ASSERTED IN ONE PLACE.
//
// `docs/resource/concepts/format-capabilities.md` says every concrete format
// inherits the same canonical capability contract. Until now nothing checked
// that across the whole set: each format's own suite tested its own reading, so
// a format could drift out of the shared shape and only its neighbours' tests
// would have noticed — which they do not run.
//
// The gap this was written to catch: four formats that WRITE while reporting
// `canWrite() === false`, because they never declared `inputs`. The formats
// README tells callers to ask rather than probe for the method, and for those
// four the answer was wrong.

const FORMATS = Object.entries(formats)
    .filter(([ , value ]) => typeof value === "function" && value.prototype instanceof CjsFormat)
    .map(([ name, Format ]) => ({ name, Format }));

test("every exported format is discovered", () =>
{
    // A guard on the harness itself: if the filter silently matched nothing,
    // every test below would vacuously pass.
    assert.ok(FORMATS.length >= 30, `expected the full format set, found ${FORMATS.length}`);
});

for (const { name, Format } of FORMATS)
{
    test(`${name} declares the canonical identity`, () =>
    {
        assert.equal(typeof Format.id, "string");
        assert.notEqual(Format.id, "", "id is the routing identity and cannot be empty");
        assert.ok(Object.isFrozen(Format.mediaTypes), "mediaTypes must be frozen");
        assert.ok(Object.isFrozen(Format.extensions), "extensions must be frozen");

        for (const extension of Format.extensions)
        {
            assert.ok(extension.startsWith("."), `${extension} must be dotted`);
            assert.equal(extension, extension.toLowerCase(), `${extension} must be lowercase`);
        }
    });

    test(`${name} agrees with itself about whether it reads`, () =>
    {
        // TWO LEGITIMATE KINDS, and the rule is a pairing rather than a floor.
        // Most formats read and declare outputs. `CjsStaticFormat` deliberately
        // declares none: `.static` is three unrelated containers behind one
        // extension, so that class identifies the family and the sibling router
        // calls whichever format actually reads it. An identification surface
        // with no reader is a format that correctly claims no output.
        const
            declaresOutputs = Object.keys(Format.outputs).length > 0,
            // `CjsFormat` defines a base `read`, so a bare typeof check sees the
            // inherited one on every subclass. Only an OWN implementation counts.
            hasReader = (typeof Format.read === "function" && Format.read !== CjsFormat.read)
                || (typeof Format.readAsync === "function" && Format.readAsync !== CjsFormat.readAsync);

        assert.equal(
            hasReader,
            declaresOutputs,
            hasReader
                ? `${name} reads but declares no output, so nothing can be asked of it`
                : `${name} declares outputs but exposes no read method`
        );
    });

    if (Object.keys(Format.outputs).length > 0) test(`${name} declares outputs with exactly one default`, () =>
    {
        const entries = Object.values(Format.outputs);

        const defaults = entries.filter(entry => entry.default);
        assert.equal(defaults.length, 1, `expected one default output, found ${defaults.length}`);

        for (const entry of entries)
        {
            assert.equal(typeof entry.output, "string");
            assert.ok(entry.output, "every output needs a selector");
            assert.ok(Array.isArray(entry.probes), `${entry.output} must declare probes`);
            // The selector must be reachable through the public accessor, or a
            // caller cannot ask about an output the format says it has.
            assert.ok(Format.getOutputCapability(entry.output), `${entry.output} is not resolvable`);
        }
    });

    test(`${name} agrees with itself about whether it writes`, () =>
    {
        const
            declaresInputs = Object.keys(Format.inputs).length > 0,
            hasWriter = (typeof Format.write === "function" && Format.write !== CjsFormat.write)
                || (typeof Format.writeAsync === "function" && Format.writeAsync !== CjsFormat.writeAsync);

        // This is the assertion that found the original defect. `canWrite()` is
        // the documented question; a format that answers it wrongly sends a
        // caller to a converter that does not exist, or hides one that does.
        assert.equal(
            Format.canWrite(),
            declaresInputs,
            "canWrite() must reflect the declared inputs"
        );
        assert.equal(
            hasWriter,
            declaresInputs,
            hasWriter
                ? `${name} has a writer but declares no inputs, so canWrite() lies`
                : `${name} declares inputs but exposes no write method`
        );
    });

    test(`${name} reports uniformly on unrecognized bytes`, () =>
    {
        // Bytes no format claims. The report shape must still be canonical:
        // a probe that cannot recognize its input is a normal answer, not an
        // error, and must not throw.
        const report = Format.getSupport(new Uint8Array([ 0xde, 0xad, 0xbe, 0xef ]));

        assert.equal(typeof report, "object");
        assert.equal(report.format, Format.id);
        assert.equal(report.verified, false, "advice never claims verification");
        assert.equal(report.error, null);
        assert.ok(Array.isArray(report.outputs));
        assert.ok(Array.isArray(report.warnings));
        assert.ok(Array.isArray(report.errors));
        assert.equal(typeof report.recognized, "boolean");
        assert.equal(typeof report.supported, "boolean");

        for (const entry of report.outputs)
        {
            assert.equal(entry.verified, false, `${entry.output} claimed verification from advice`);
            assert.equal(typeof entry.supported, "boolean");
            assert.equal(typeof entry.reason, "string");
        }
    });

    test(`${name} never claims verification from the synchronous path`, () =>
    {
        // Empty input is the other end of the range and is a separate code path
        // in several readers.
        for (const input of [ new Uint8Array(0), new Uint8Array(1) ])
        {
            const report = Format.getSupport(input);
            assert.equal(report.verified, false);
            assert.ok(report.outputs.every(entry => entry.verified === false));
        }
    });

    test(`${name} refuses an undeclared output without running a decoder`, async () =>
    {
        const report = await Format.verifySupport(
            new Uint8Array([ 0xde, 0xad, 0xbe, 0xef ]),
            { emit: "cjs-no-such-output" }
        );

        assert.equal(report.supported, false);
        assert.equal(report.verified, true, "a refusal is still a proven answer");
        assert.equal(report.error.code, "CJS_FORMAT_OUTPUT_UNDECLARED");
    });
}

test("format ids are unique across the set", () =>
{
    const seen = new Map();
    for (const { name, Format } of FORMATS)
    {
        const previous = seen.get(Format.id);
        assert.equal(previous, undefined, `id "${Format.id}" is claimed by both ${previous} and ${name}`);
        seen.set(Format.id, name);
    }
});
