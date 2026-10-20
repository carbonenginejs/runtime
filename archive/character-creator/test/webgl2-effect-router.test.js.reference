import assert from "node:assert/strict";
import test from "node:test";

import { CjsCharacterWebgl2EffectRouter } from "../../../src/character/webgl2/CjsCharacterWebgl2EffectRouter.js";

test("routes a qualified detailed-hair effect and restores authored material state", () =>
{
    const effect = CreateEffect();
    const report = CjsCharacterWebgl2EffectRouter.Route([ effect ]);

    assert.equal(report.status, "applied");
    assert.equal(report.requiresWatch, true);
    assert.equal(effect.effectFilePath,
        "res:/graphics/effect.dx11/managed/interior/avatar/skinnedavatarhair_detailed.sm_hi");
    assert.deepEqual(effect.parameters.TransformUV0.value, [ 0.5, 0.5, 0.75, 1 ]);

    effect.parameters.TransformUV0.value = [ 0, 0, 1, 1 ];
    const restored = CjsCharacterWebgl2EffectRouter.RestoreAfterWatch([ effect ]);
    assert.equal(restored.status, "restored");
    assert.deepEqual(effect.parameters.TransformUV0.value, [ 0.5, 0.5, 0.75, 1 ]);
});

test("does not route an effect without the audited source parameter contract", () =>
{
    const effect = {
        effectFilePath: "res:/graphics/effect/managed/interior/avatar/skinnedavatarhair_detailed.sm_hi",
        parameters: { TransformUV0: Value([ 0.5, 0.5, 0.75, 1 ]) }
    };
    const report = CjsCharacterWebgl2EffectRouter.Route([ effect ]);
    assert.equal(report.status, "deferred");
    assert.equal(report.deferred[0].reason, "source-contract-unqualified");
});

function CreateEffect()
{
    return {
        effectFilePath: "res:/graphics/effect/managed/interior/avatar/skinnedavatarhair_detailed.sm_hi",
        parameters: {
            TransformUV0: Value([ 0.5, 0.5, 0.75, 1 ]),
            DiffuseMap: Texture({ path: "res:/hair.dds" }),
            NormalMap: Texture({ path: "res:/hair_n.dds" }),
            SpecularMap: Texture({ path: "res:/hair_s.dds" }),
            TangentMap: Texture({ path: "res:/hair_t.dds" }),
            MaterialDiffuseColor: Value([ 0.1, 0.2, 0.3, 1 ]),
            MaterialCutoutColor: Value([ 1, 1, 1, 1 ]),
            HairDiffuseBias: Value(0.1),
            HairParameters: Value([ 1, 2, 3, 4 ]),
            HairSpecularColor1: Value([ 1, 1, 1, 1 ]),
            HairSpecularColor2: Value([ 1, 1, 1, 1 ]),
            HairSpecularFactors1: Value([ 1, 1, 1, 1 ]),
            HairSpecularFactors2: Value([ 1, 1, 1, 1 ]),
            TangentMapParameters: Value([ 1, 1, 1, 1 ])
        },
        SetValues(values)
        {
            Object.assign(this, values);
        },
        Initialize() {},
        AutoPopulate() {}
    };
}

function Value(initial)
{
    return {
        value: Array.isArray(initial) ? [ ...initial ] : initial,
        GetValue()
        {
            return Array.isArray(this.value) ? [ ...this.value ] : this.value;
        },
        SetValue(value)
        {
            this.value = Array.isArray(value) ? [ ...value ] : value;
        }
    };
}

function Texture(textureRes)
{
    return {
        textureRes,
        AttachTextureRes(value)
        {
            this.textureRes = value;
        }
    };
}
