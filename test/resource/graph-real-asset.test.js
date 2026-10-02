import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { CjsSchema } from "../../npm/dist/global/schema/CjsSchema.js";
import { CjsBlackReader } from "../../npm/dist/resource/formats/black/core/CjsBlackReader.js";
import { CjsGraphFormat } from "../../npm/dist/resource/formats/graph/index.js";
import { CjsGraphBinaryFormat } from "../../npm/dist/resource/formats/graphbinary/index.js";
import { EveSpaceScene } from "../../npm/dist/trinity/eve/scene/EveSpaceScene.js";
import "../../npm/dist/trinity/shader/Tr2Effect.js";
import "../../npm/dist/trinity/shader/parameter/TriTextureParameter.js";

// Resource build 3569502, res:/dx9/scene/universe/a01_cube.black.
// Fetch via the resource service; no game bytes or local cache paths are committed.
const externalPath = process.env.CJS_GRAPH_BLACK_SCENE;

test("real Black scene preserves declared class records through both Graph formats", {
    skip: !externalPath && "Set CJS_GRAPH_BLACK_SCENE to a scene fetched through the resource service."
}, () =>
{
    const bytes = readFileSync(externalPath);
    assert.equal(createHash("sha256").update(bytes).digest("hex"),
        "262d7ed669488bb23d7761a079b2866fa197d994c76c49357ace37dbf800ae51");
    const reader = new CjsBlackReader(bytes, { schema: null, initialize: false });
    const original = reader.CreateObject();
    assert.equal(original.constructor, EveSpaceScene);
    assert.deepEqual(reader.reports, []);
    assert.equal(reader.reader.AtEnd(), true);
    const expected = records(original);
    assert.deepEqual(expected.classes, [
        ["EveSpaceScene", 1], ["Tr2ConstantEffectParameter", 5],
        ["Tr2Effect", 1], ["TriTextureParameter", 4]
    ]);
    for (const Format of [CjsGraphFormat, CjsGraphBinaryFormat])
    {
        const encoded = Format.write(original);
        const decoded = Format.read(encoded, { emit: "runtime", initialize: false });
        assert.deepEqual(decoded.reports, []);
        assert.deepEqual(records(decoded.root), expected);
    }
});

/** Compare declared class records independently of either codec's output. */
function records(root)
{
    const seen = new Map();
    const classes = new Map();
    function visit(value, type = {})
    {
        if (typeof type === "string") type = { kind: type };
        if (typeof value === "number") return value === 0 ? 0 : value;
        if (typeof value === "bigint") return { bigint: String(value) };
        if (value === null || typeof value !== "object") return value;
        const math = ["vec2", "vec3", "vec4", "vector2", "vector3", "vector4",
            "color", "linear", "rgba", "rgb", "quat", "quaternion", "mat3", "mat4",
            "matrix3", "matrix4", "rotation", "translation", "scale"].includes(type.kind);
        if (math) return { dataType: type.kind, values: Array.from(value, item => visit(item)) };
        if (ArrayBuffer.isView(value)) return { arrayType: value.constructor.name, values: Array.from(value, item => visit(item)) };
        if (Array.isArray(value)) return Array.from(value, item => visit(item, type.itemType));
        if (value instanceof Set) return { set: Array.from(value, item => visit(item, type.itemType)) };
        if (value instanceof Map) return { map: Array.from(value, ([key, item]) => [key, visit(item, type.valueType)]) };
        const declared = ["struct", "rawStruct"].includes(type.kind) ? CjsSchema.GetConstructor(type.className) : null;
        const Constructor = declared || value.constructor;
        const name = CjsSchema.getClassName(Constructor);
        if (!name) return Object.fromEntries(Object.keys(value).sort().map(key => [key, visit(value[key])]));
        if (seen.has(value)) return { ref: seen.get(value) };
        const id = seen.size + 1;
        seen.set(value, id);
        classes.set(name, (classes.get(name) || 0) + 1);
        const fields = {};
        for (const field of [...CjsSchema.getSchema(Constructor).members].sort((a, b) => a.name.localeCompare(b.name)))
        {
            if (field.type?.runtimeOnly || !(field.edit?.persist || field.edit?.persistOnly)) continue;
            const own = Object.getOwnPropertyDescriptor(value, field.key);
            assert.ok(own && Object.hasOwn(own, "value"), `${name}.${field.name} must be stored data`);
            fields[field.name] = visit(field.index === undefined ? own.value : own.value[field.index], field.type);
        }
        return { id, class: name, fields };
    }
    const graph = visit(root);
    return { graph, classes: [...classes].sort(([a], [b]) => a.localeCompare(b)) };
}
