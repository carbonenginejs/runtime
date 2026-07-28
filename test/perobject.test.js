import assert from "node:assert/strict";
import test from "node:test";

import { mat4 } from "@carbonenginejs/runtime-utils";

import {
    CjsPerObjectDecoder,
    CjsPerObjectLayoutError,
    CjsPerObjectPacker,
    CjsPerObjectSynthesizer,
    perObjectStructNames
} from "../src/perobject/index.js";


const packer = new CjsPerObjectPacker();


/**
 * Stand-in for runtime-trinity's `EveCustomMask`, with the same protocol:
 * `Setup`, `FillPerObjectData(index, vsData, psData)` and static
 * `ZeroPerObjectData`. It records which slots the driver loop touched. The real
 * class is not a dependency of this package - see docs/perobject/README.md.
 */
class RecordingMask
{

    static filled = [];

    static zeroed = [];

    Setup()
    {
        return true;
    }

    FillPerObjectData(index)
    {
        RecordingMask.filled.push(index);

        return true;
    }

    static ZeroPerObjectData(index, vsData, psData)
    {
        RecordingMask.zeroed.push(index);
        vsData.customMaskMatrix[index] = Array.from(mat4.create());
        vsData.customMaskData[index] = [0, 0, 0, 0];
        psData.customMaskMaterialIDs[index] = [0, 0, 0, 0];
        psData.customMaskTargets[index] = [0, 0, 0, 0];

        return true;
    }

}


function field(structName, name)
{
    return packer.Describe(structName).fields.find((entry) => entry.name === name);
}


test("every catalogued struct satisfies Carbon's own layout invariants", () =>
{
    for (const name of perObjectStructNames())
    {
        const layout = packer.Describe(name);

        assert.ok(layout, `${name} should describe`);
        assert.equal(layout.byteSize % 16, 0, `${name} must be a whole number of float4 registers`);

        for (const entry of layout.fields)
        {
            if (entry.size >= 4)
            {
                assert.equal(entry.byteOffset % 16, 0, `${name}.${entry.name} must start on a register boundary`);
            }
        }
    }
});


test("EveSpaceObjectPSData matches the HLSL PerObjectPS register map", () =>
{
    const layout = packer.Describe("EveSpaceObjectPSData");

    // shadercompiler/tests/RayTracingTest.cpp:654-666 declares this block
    // field-for-field; these are the registers it implies.
    assert.equal(field("EveSpaceObjectPSData", "worldTransform").register, 0);
    assert.equal(field("EveSpaceObjectPSData", "shipData").register, 12);
    assert.equal(field("EveSpaceObjectPSData", "clipSphereCenter").register, 13);
    assert.equal(field("EveSpaceObjectPSData", "clipRadiusSq").component, "w");
    assert.equal(field("EveSpaceObjectPSData", "clipRadius2Sq").register, 14);
    assert.equal(field("EveSpaceObjectPSData", "shLightingCoefficients").register, 15);
    assert.equal(field("EveSpaceObjectPSData", "customMaskMaterialIDs").register, 22);
    assert.equal(field("EveSpaceObjectPSData", "customMaskTargets").register, 24);
    assert.equal(field("EveSpaceObjectPSData", "customMaskClamps").register, 26);
    assert.equal(field("EveSpaceObjectPSData", "screenSize").register, 27);
    assert.equal(field("EveSpaceObjectPSData", "customData").register, 28);
    assert.equal(layout.registerCount, 29);
});


test("EveSpaceObjectVSData is 29 registers with the mask block where Carbon puts it", () =>
{
    assert.equal(packer.Describe("EveSpaceObjectVSData").registerCount, 29);
    assert.equal(field("EveSpaceObjectVSData", "customMaskMatrix").register, 16);
    assert.equal(field("EveSpaceObjectVSData", "customMaskData").register, 24);
    assert.equal(field("EveSpaceObjectVSData", "boneOffsets").register, 26);
    assert.equal(field("EveSpaceObjectVSData", "customData").register, 28);
});


test("a 27-register uniform resolves to PerObjectPS truncated after customMaskClamps", () =>
{
    // This is the real `cb4: array<vec4<f32>, 27>` from the WebGPU sm_depth
    // export: the shader's active prefix stops before ScreenSize.
    const matches = packer.IdentifyByRegisterCount(27, { stage: "ps" });
    const spaceObject = matches.find((match) => match.struct === "EveSpaceObjectPSData");

    assert.ok(spaceObject, "EveSpaceObjectPSData should be a candidate for 27 registers");
    assert.equal(spaceObject.exact, false);
    assert.equal(spaceObject.truncatedAfter, "customMaskClamps");
});


test("packing honours the raw/logical matrix convention and bit-casts integer lanes", () =>
{
    const world = mat4.create();
    mat4.fromTranslation(world, [7, 8, 9]);

    // "logical": untransposed in, transposed on write. gl-matrix stores
    // translation at 12..14, so it lands in the fourth column of each row.
    const encoded = packer.Pack("EveSpaceObjectVSData", { worldTransform: world }, { matrices: "logical" });

    assert.deepEqual(Array.from(encoded.slice(0, 4)), [1, 0, 0, 7]);
    assert.deepEqual(Array.from(encoded.slice(4, 8)), [0, 1, 0, 8]);
    assert.deepEqual(Array.from(encoded.slice(8, 12)), [0, 0, 1, 9]);

    // "raw" is the default: the value is already GPU-form, so it is copied
    // through. Packing an already-transposed value as "logical" would
    // transpose it a second time.
    const raw = packer.Pack("EveSpaceObjectVSData", { worldTransform: world });

    assert.deepEqual(Array.from(raw.slice(0, 16)), Array.from(world));

    const packed = packer.Pack("EveSpaceObjectVSData", { boneOffsets: [11, 12, 13, 14] });
    const uints = new Uint32Array(packed.buffer);
    const offset = field("EveSpaceObjectVSData", "boneOffsets").offset;

    assert.deepEqual(Array.from(uints.slice(offset, offset + 4)), [11, 12, 13, 14]);
});


test("ResolveLayout resolves the Carbon layout and rejects drift", () =>
{
    const layout = packer.ResolveLayout("EvePerObjectVSData", [
        { name: "WorldMat", size: 16, elements: 1, encoding: "matrix" }
    ]);

    assert.equal(layout.stride, 16);
    assert.deepEqual(layout.fields.WorldMat, { offset: 0, size: 16, elements: 1, encoding: "matrix" });

    assert.equal(packer.ResolveLayout("NotACarbonStruct"), null);

    assert.throws(
        () => packer.ResolveLayout("EvePerObjectVSData", [
            { name: "WorldMat", size: 12, elements: 1, encoding: "matrix" }
        ]),
        CjsPerObjectLayoutError
    );
});


test("neutral values are Carbon's documented ones, and fallbacks are reported", () =>
{
    const synthesizer = new CjsPerObjectSynthesizer();
    const neutral = synthesizer.Neutral("EveSpaceObjectPSData");

    assert.deepEqual(neutral.shipData, [1, 1, 0, 1]);
    assert.deepEqual(neutral.screenSize, [0.5, 0.5, 0.5, 1]);
    assert.equal(neutral.shLightingCoefficients.length, 7);

    const synthesized = synthesizer.SynthesizeSpaceObject({ boundingSphereRadius: 120 });

    assert.deepEqual(synthesized.vs.shipData, [1, 1, 0, 120]);
    assert.ok(synthesized.defaulted.includes("screenSize"));
    assert.ok(synthesized.defaulted.includes("shLightingCoefficients"));
    assert.ok(!synthesized.defaulted.includes("shipData.w"));
});


test("the clip block reproduces Carbon's sign-carrying squared radii", () =>
{
    const synthesized = new CjsPerObjectSynthesizer().SynthesizeSpaceObject({
        boundingSphereRadius: 100,
        clipSphereFactor: 0.5
    });

    // No clip offset, so normalizedRadius is the bounding radius and the inside
    // percentage is zero: dissolve = 0.5 * 100 * 1.
    assert.equal(synthesized.ps.clipRadiusSq[0], 2500);
    assert.equal(synthesized.ps.clipRadius2Sq[0], 0);
    assert.deepEqual(synthesized.vs.clipData, [0, 0, 0, 2500]);
});


test("the pattern layer count implies the PPT option, and slot 3 is unrepresentable", () =>
{
    const synthesizer = new CjsPerObjectSynthesizer({ customMask: RecordingMask });

    assert.equal(synthesizer.SynthesizePatternLayers([{}, {}]).pptOption, "SOPPT_ENABLED");
    assert.equal(synthesizer.SynthesizePatternLayers([]).pptOption, "SOPPT_DISABLED");
    // EVE_SPACEOBJECT_CUSTOWMASK_MAX is 2 in Carbon too, so a third layer is
    // dropped there as well - but it is reported rather than dropped silently.
    assert.equal(synthesizer.SynthesizePatternLayers([{}, {}, {}]).dropped, 1);
});


test("the mask owns its own fill; the driver loop fills or zeroes every slot", () =>
{
    // Carbon's EveSpaceObject2.cpp:654-664 loop. The fill itself lives on the
    // mask (EveCustomMask.FillPerObjectData), which is why this package calls
    // the protocol instead of reimplementing it - RecordingMask stands in for
    // runtime-trinity's EveCustomMask, which has the same signature.
    const synthesizer = new CjsPerObjectSynthesizer({ customMask: RecordingMask });
    const synthesized = synthesizer.SynthesizeSpaceObject({
        customMasks: [{ materialSourceID: 2, clampU: true }]
    });

    assert.deepEqual(RecordingMask.filled, [0]);
    assert.deepEqual(RecordingMask.zeroed, [1]);

    // Slot 1 had no mask, so it takes ZeroPerObjectData's identity, not zero.
    assert.deepEqual(synthesized.vs.customMaskMatrix[1], Array.from(mat4.create()));
    assert.deepEqual(synthesized.vs.customMaskData[1], [0, 0, 0, 0]);
});


test("a plain mask description without the owning class fails loud", () =>
{
    assert.throws(
        () => new CjsPerObjectSynthesizer().SynthesizeSpaceObject({ customMasks: [{ materialSourceID: 1 }] }),
        /FillPerObjectData/u
    );
});


test("the decoder names shared-ABI registers and effect locals from one call", () =>
{
    const decoder = new CjsPerObjectDecoder();

    assert.equal(decoder.Component(4, 13, "w").name, "clipRadiusSq");
    assert.equal(decoder.Component(4, 13, "x").name, "clipSphereCenter");
    assert.equal(decoder.Component(4, 12, "x").hlsl, "Shipdata");
    assert.equal(decoder.Register(4, 26)[0].name, "customMaskClamps");
    assert.deepEqual(decoder.Register(1, 0), []);

    // The shape format-hlsl produces and both shader packages carry.
    decoder.AddBindingManifest({
        bindings: [
            {
                kind: "constantBuffer",
                registerIndex: 0,
                metadataName: "$LocalConstants",
                carbon: {
                    constants: [
                        { name: "GeneralData", offset: 0, size: 16, dimension: 4, elements: 0 },
                        { name: "GeneralGlowColor", offset: 16, size: 16, dimension: 4, elements: 0 },
                        { name: "Mtl1DiffuseColor", offset: 32, size: 16, dimension: 4, elements: 0 }
                    ]
                }
            }
        ]
    });

    assert.equal(decoder.Register(0, 2)[0].name, "Mtl1DiffuseColor");
    assert.equal(decoder.Register(0, 2)[0].source, "effect");
});


test("annotating a translated shader's uniforms explains each buffer", () =>
{
    const decoder = new CjsPerObjectDecoder();
    const annotated = decoder.Annotate([
        { register: 0, registerCount: 24 },
        { register: 2, registerCount: 22 },
        { register: 4, registerCount: 27 }
    ]);

    assert.equal(annotated[0].identified, "unknown");
    assert.equal(annotated[1].identified, "unknown");
    assert.equal(annotated[2].identified, "abi");
    assert.equal(annotated[2].struct, "EveSpaceObjectPSData");
    assert.equal(annotated[2].truncatedAfter, "customMaskClamps");
    assert.deepEqual(annotated[2].unread, ["screenSize", "customData"]);
    assert.equal(annotated[2].mismatch, false);
});
