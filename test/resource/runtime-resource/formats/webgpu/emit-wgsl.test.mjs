import { test } from "node:test";
import assert from "node:assert/strict";

import {
    computeEntryPointParameters,
    computeWorkgroupVariableDeclarations
} from "../../../../../src/resource/formats/webgpu/core/wgsl/emitWgsl.js";

const GLOBAL_INVOCATION_ID = Object.freeze({
    builtin: "global_invocation_id",
    name: "dispatch_thread_id",
    type: "vec3<u32>"
});
const LOCAL_INVOCATION_ID = Object.freeze({
    builtin: "local_invocation_id",
    name: "local_invocation_id",
    type: "vec3<u32>"
});
const LOCAL_INVOCATION_INDEX = Object.freeze({
    builtin: "local_invocation_index",
    name: "local_invocation_index",
    type: "u32"
});
const SORT_STEP_IDS = Object.freeze([
    Object.freeze({
        builtin: "workgroup_id",
        name: "workgroup_id",
        type: "vec3<u32>"
    }),
    Object.freeze({
        builtin: "local_invocation_id",
        name: "local_invocation_id",
        type: "vec3<u32>"
    })
]);

test("compute entry-point parameters preserve the no-builtin spelling", () =>
{
    assert.equal(computeEntryPointParameters({ stage: "compute" }), "");
});

test("compute entry-point parameters emit the bounded global invocation id", () =>
{
    assert.equal(
        computeEntryPointParameters({
            stage: "compute",
            builtinInputs: [ GLOBAL_INVOCATION_ID ]
        }),
        "@builtin(global_invocation_id) dispatch_thread_id: vec3<u32>"
    );
});

test("compute entry-point parameters emit bounded local and local/global schemas", () =>
{
    assert.equal(
        computeEntryPointParameters({
            stage: "compute",
            builtinInputs: [ LOCAL_INVOCATION_ID ]
        }),
        "@builtin(local_invocation_id) local_invocation_id: vec3<u32>"
    );
    assert.equal(
        computeEntryPointParameters({
            stage: "compute",
            builtinInputs: [ LOCAL_INVOCATION_ID, GLOBAL_INVOCATION_ID ]
        }),
        "@builtin(local_invocation_id) local_invocation_id: vec3<u32>, "
            + "@builtin(global_invocation_id) dispatch_thread_id: vec3<u32>"
    );
    assert.throws(() => computeEntryPointParameters({
        builtinInputs: [ GLOBAL_INVOCATION_ID, LOCAL_INVOCATION_ID ]
    }), /unsupported ordered schema/u);
});

test("compute entry-point parameters emit the scalar particle local index", () =>
{
    assert.equal(
        computeEntryPointParameters({
            stage: "compute",
            builtinInputs: [ LOCAL_INVOCATION_INDEX ]
        }),
        "@builtin(local_invocation_index) local_invocation_index: u32"
    );
    assert.throws(() => computeEntryPointParameters({
        builtinInputs: [
            { ...LOCAL_INVOCATION_INDEX, type: "vec3<u32>" }
        ]
    }), /unsupported ordered schema/u);
});

test("compute entry-point parameters emit the ordered sort-step builtin pair", () =>
{
    assert.equal(
        computeEntryPointParameters({
            stage: "compute",
            builtinInputs: SORT_STEP_IDS
        }),
        "@builtin(workgroup_id) workgroup_id: vec3<u32>, "
            + "@builtin(local_invocation_id) local_invocation_id: vec3<u32>"
    );
    assert.throws(() => computeEntryPointParameters({
        builtinInputs: [ ...SORT_STEP_IDS ].reverse()
    }), /unsupported ordered schema/u);
});

test("compute entry-point parameters emit the ordered create-histograms builtin triple", () =>
{
    const builtinInputs = [ ...SORT_STEP_IDS, GLOBAL_INVOCATION_ID ];
    assert.equal(
        computeEntryPointParameters({
            stage: "compute",
            builtinInputs
        }),
        "@builtin(workgroup_id) workgroup_id: vec3<u32>, "
            + "@builtin(local_invocation_id) local_invocation_id: vec3<u32>, "
            + "@builtin(global_invocation_id) dispatch_thread_id: vec3<u32>"
    );
    assert.throws(() => computeEntryPointParameters({
        builtinInputs: [
            builtinInputs[0],
            builtinInputs[2],
            builtinInputs[1]
        ]
    }), /unsupported ordered schema/u);
});

test("compute entry-point parameters reject duplicate, unknown, and malformed metadata", () =>
{
    assert.throws(
        () => computeEntryPointParameters({ builtinInputs: [] }),
        /must be a non-empty array/u
    );
    assert.throws(
        () => computeEntryPointParameters({
            builtinInputs: [ GLOBAL_INVOCATION_ID, GLOBAL_INVOCATION_ID ]
        }),
        /duplicates global_invocation_id/u
    );
    assert.throws(
        () => computeEntryPointParameters({
            builtinInputs: [ { ...GLOBAL_INVOCATION_ID, builtin: "local_invocation_id" } ]
        }),
        /unsupported ordered schema/u
    );
    assert.throws(
        () => computeEntryPointParameters({
            builtinInputs: [ { ...GLOBAL_INVOCATION_ID, type: "vec4<u32>" } ]
        }),
        /unsupported ordered schema/u
    );
    assert.throws(
        () => computeEntryPointParameters({
            builtinInputs: [ { ...GLOBAL_INVOCATION_ID, extra: true } ]
        }),
        /contains unsupported metadata/u
    );
});

function workgroupProgram(workgroupVariables, overrides = {})
{
    return {
        stage: "compute",
        entryPoint: "main",
        builtinInputs: [ LOCAL_INVOCATION_ID, GLOBAL_INVOCATION_ID ],
        bindings: [ { generatedSymbol: "t0" }, { generatedSymbol: "u0" } ],
        statements: [ { kind: "var", name: "r0", type: "vec4<u32>" } ],
        workgroupVariables,
        ...overrides
    };
}

test("compute workgroup variables emit the exact bounded structured schema", () =>
{
    assert.deepEqual(
        computeWorkgroupVariableDeclarations(workgroupProgram([
            { name: "g0", elementType: "atomic<u32>", elementCount: 64 },
            { name: "scratch", elementType: "u32", elementCount: 32 }
        ])),
        [
            "var<workgroup> g0: array<atomic<u32>, 64>;",
            "var<workgroup> scratch: array<u32, 32>;"
        ]
    );
    assert.deepEqual(
        computeWorkgroupVariableDeclarations(workgroupProgram([
            { name: "portableLimit", elementType: "u32", elementCount: 4096 }
        ])),
        [ "var<workgroup> portableLimit: array<u32, 4096>;" ]
    );
    assert.deepEqual(computeWorkgroupVariableDeclarations({ stage: "compute" }), []);
});

test("compute workgroup variables reject non-compute and malformed metadata", () =>
{
    assert.throws(
        () => computeWorkgroupVariableDeclarations(workgroupProgram([
            { name: "g0", elementType: "atomic<u32>", elementCount: 64 }
        ], { stage: "pixel" })),
        /compute-only/u
    );
    assert.throws(
        () => computeWorkgroupVariableDeclarations(workgroupProgram([])),
        /must be a non-empty array/u
    );
    assert.throws(
        () => computeWorkgroupVariableDeclarations(workgroupProgram([ null ])),
        /must be an object/u
    );
    assert.throws(
        () => computeWorkgroupVariableDeclarations(workgroupProgram([
            { name: "g0", elementType: "atomic<u32>", elementCount: 64, extra: true }
        ])),
        /contains unsupported metadata/u
    );
    assert.throws(
        () => computeWorkgroupVariableDeclarations(workgroupProgram([
            { name: "g0", elementType: "atomic<u32>" }
        ])),
        /contains unsupported metadata/u
    );
});

test("compute workgroup variables reject unsafe names, types, and counts", () =>
{
    for (const name of [ "_g0", "g-0", "g__0", "var", "do" ])
    {
        assert.throws(
            () => computeWorkgroupVariableDeclarations(workgroupProgram([
                { name, elementType: "atomic<u32>", elementCount: 64 }
            ])),
            /unsafe name/u
        );
    }
    for (const elementType of [ "i32", "atomic<i32>", "vec4<u32>" ])
    {
        assert.throws(
            () => computeWorkgroupVariableDeclarations(workgroupProgram([
                { name: "g0", elementType, elementCount: 64 }
            ])),
            /unsupported element type/u
        );
    }
    for (const elementCount of [ 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1 ])
    {
        assert.throws(
            () => computeWorkgroupVariableDeclarations(workgroupProgram([
                { name: "g0", elementType: "atomic<u32>", elementCount }
            ])),
            /positive safe-integer/u
        );
    }
    assert.throws(
        () => computeWorkgroupVariableDeclarations(workgroupProgram([
            { name: "g0", elementType: "atomic<u32>", elementCount: 4097 }
        ])),
        /16 KiB footprint/u
    );
});

test("compute workgroup variables reject duplicate names, symbol collisions, and cumulative overflow", () =>
{
    assert.throws(
        () => computeWorkgroupVariableDeclarations(workgroupProgram([
            { name: "g0", elementType: "atomic<u32>", elementCount: 1 },
            { name: "g0", elementType: "atomic<u32>", elementCount: 1 }
        ])),
        /duplicates g0/u
    );
    for (const name of [ "main", "local_invocation_id", "t0", "r0" ])
    {
        assert.throws(
            () => computeWorkgroupVariableDeclarations(workgroupProgram([
                { name, elementType: "atomic<u32>", elementCount: 1 }
            ])),
            /collides with another shader symbol/u
        );
    }
    assert.throws(
        () => computeWorkgroupVariableDeclarations(workgroupProgram([
            { name: "icb", elementType: "u32", elementCount: 1 }
        ], { immediateConstantBuffer: [ [] ] })),
        /collides with another shader symbol/u
    );
    assert.throws(
        () => computeWorkgroupVariableDeclarations(workgroupProgram([
            { name: "xt0", elementType: "u32", elementCount: 1 }
        ], { constTables: [ { symbol: "xt0" } ] })),
        /collides with another shader symbol/u
    );
    const nestedStatements = [ {
        kind: "if",
        statements: [ {
            kind: "loop",
            statements: [ { kind: "var", name: "nestedBody" } ],
            continuing: [ { kind: "let", name: "nestedContinuing" } ]
        } ],
        elseStatements: [ { kind: "var", name: "nestedElse" } ]
    }, {
        kind: "switch",
        clauses: [ { statements: [ { kind: "var", name: "nestedClause" } ] } ]
    } ];
    for (const name of [ "nestedBody", "nestedContinuing", "nestedElse", "nestedClause" ])
    {
        assert.throws(
            () => computeWorkgroupVariableDeclarations(workgroupProgram([
                { name, elementType: "u32", elementCount: 1 }
            ], { statements: nestedStatements })),
            /collides with another shader symbol/u
        );
    }
    assert.throws(
        () => computeWorkgroupVariableDeclarations(workgroupProgram([
            { name: "g0", elementType: "u32", elementCount: 2048 },
            { name: "g1", elementType: "atomic<u32>", elementCount: 2049 }
        ])),
        /16 KiB footprint/u
    );
});
