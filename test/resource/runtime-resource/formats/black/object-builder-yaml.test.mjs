import test from "node:test";
import assert from "node:assert/strict";
import "../../../../../npm/dist/trinity/index.js";
import "../../../../../npm/dist/character/index.js";
import { CreateBlackObjectBuilder } from "../../../../../npm/dist/blue/blue/formats/black/index.js";

// Carbon's LoadObject reads bytes without a Black header as YAML (BlueResMan.cpp:806-840).
const yaml = `type: Tr2InteriorScene
lights:
-   type: Tr2InteriorLightSource
    name: "Key"
    position: [-0.5, 2.25, 0.9]
    radius: 3.0
    color: [1.0, 0.5, 0.25, 1.0]
`;

test("object bytes without a Black header build through a caching YamlReader", () =>
{
    const builder = CreateBlackObjectBuilder(new TextEncoder().encode(yaml), { path: "res:/test/rig.yaml" });
    const first = builder.CreateObject(0), second = builder.CreateObject(0);
    assert.notEqual(first, second, "each LoadObject builds a fresh object");
    assert.equal(first.lights.length, 1);
    assert.equal(first.lights[0].name, "Key");
    assert.deepEqual(Array.from(first.lights[0].position, value => Math.round(value * 100) / 100), [ -0.5, 2.25, 0.9 ]);
    assert.equal(first.lights[0].radius, 3);
});

test("bytes that are neither Black nor YAML objects fail with the reader's message", () =>
{
    assert.throws(() => CreateBlackObjectBuilder(new TextEncoder().encode("- just a list"), { path: "res:/test/list.yaml" }), /res:\/test\/list\.yaml/);
});
