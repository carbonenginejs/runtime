import test from "node:test";
import assert from "node:assert/strict";
import { Tr2LightManager, TriFrustum } from "../../npm/dist/trinity/index.js";
import { CreateLightRecord } from "../../npm/dist/trinity/eve/lights/lightConversion.js";
import { ShadowQuality } from "../../npm/dist/trinity/generated/trinityCore/enums.js";

const FLAGS = Tr2LightManager.Flags;

/**
 * The shadow-atlas CPU half (Tr2LightManager.cpp:92-122, 262-295, 442-508,
 * 568-620, 718-815), ported behind the same useDynamicLightsShadows setting
 * Carbon ships false. These tests flip the setting to exercise the path and
 * restore it, so shipping behaviour stays pinned.
 */

function withDynamicShadows(run)
{
    Tr2LightManager.useDynamicLightsShadows = true;
    try { return run(); }
    finally { Tr2LightManager.useDynamicLightsShadows = false; }
}

function frustumWithSizes(sizes)
{
    return new (class extends TriFrustum
    {
        IsSphereVisible()
        {
            return true;
        }
        GetPixelSizeAccross()
        {
            return 100; // past the cutoff-and-fade gate in AddLight
        }
        GetPixelSizeAccrossEst(position)
        {
            return sizes[position[0]] ?? 100;
        }
    })();
}

function caster(x, { innerAngle = 0, radius = 1 } = {})
{
    const record = CreateLightRecord();
    record.flags = FLAGS.DEFAULT | FLAGS.CASTS_SHADOWS;
    record.color.set([ 1, 1, 1 ]);
    record.radius = radius;
    record.position.set([ x, 0, 0 ]);
    record.innerAngle = innerAngle;
    return record;
}

test("atlas settings derive Carbon's table, including the raytraced wrap", () =>
{
    const derive = Tr2LightManager.calculateShadowMapAtlasSettings;

    const disabled = derive(ShadowQuality.SHADOW_DISABLED);
    assert.deepEqual(
        [ disabled.size, disabled.entryMinSize, disabled.entryMaxSize ],
        [ 0, 0, 0 ]
    );

    const high = derive(ShadowQuality.SHADOW_HIGH);
    assert.equal(high.size, 1 << 14);
    assert.equal(high.entryMinSizeLog2, 4);
    assert.equal(high.entryMinSize, 16);
    assert.equal(high.entryInverseScaleFactorLog2, 0);
    assert.equal(high.entryMaxSize, 1 << 13);

    const low = derive(ShadowQuality.SHADOW_LOW);
    assert.equal(low.size, 1 << 12);
    assert.equal(low.entryMinSize, 4);
    assert.equal(low.entryInverseScaleFactorLog2, 2);
    assert.equal(low.entryMaxSize, 1 << 11);

    // The Carbon quirk, reproduced exactly: SHADOW_RAYTRACED zeroes like
    // DISABLED but re-enters the sizing block, so entryMinSizeLog2 wraps
    // unsigned and the shift masks by 31 (MSVC x86 and JS agree).
    const raytraced = derive(ShadowQuality.SHADOW_RAYTRACED);
    assert.equal(raytraced.size, 1);
    assert.equal(raytraced.entryMinSizeLog2, 4294967286);
    assert.equal(raytraced.entryMinSize, 1 << 22);
    assert.equal(raytraced.entryMaxSize, 0);
});

test("SetShadowQuality collapses the frame mask into the atlas quality", () =>
{
    withDynamicShadows(() =>
    {
        const manager = new Tr2LightManager();

        // Frame 1: two scenes request LOW and HIGH.
        manager.SetShadowQuality(ShadowQuality.SHADOW_LOW, 1);
        manager.SetShadowQuality(ShadowQuality.SHADOW_HIGH, 1);
        // Frame 2: the atlas sizes for last frame's max (HIGH), and this
        // scene's LOW request clamps against it.
        manager.SetShadowQuality(ShadowQuality.SHADOW_LOW, 2);
        const settings = manager.GetShadowMapAtlasSettings();
        assert.equal(settings.size, 1 << 12, "settings for min(requested, atlas quality) = LOW");
        assert.equal(settings.actualTextureSize, 1 << 14, "texture sized for the atlas quality = HIGH");
    });
});

test("the caster half selects the largest sixteen and strips the losers", () =>
{
    withDynamicShadows(() =>
    {
        const sizes = {};
        const manager = new Tr2LightManager();
        manager.SetShadowQuality(ShadowQuality.SHADOW_HIGH, 1);
        manager.SetShadowQuality(ShadowQuality.SHADOW_HIGH, 2);
        manager.SetFrustum(frustumWithSizes(sizes));

        for (let i = 0; i < 18; i++)
        {
            sizes[i] = 1000 - i; // descending by construction
            manager.AddLight(caster(i));
        }
        manager.ResolveLightData();

        assert.equal(manager.GetShadowCastingLights().length, 16);
        const data = manager.GetLightBufferData();
        const bits = new Uint32Array(data.buffer, data.byteOffset, data.length);
        // Light 0 (largest) keeps CASTS_SHADOWS and gets a packed entry.
        assert.ok((bits[7] >>> 16) & FLAGS.CASTS_SHADOWS);
        assert.notEqual(bits[11], 0, "winner carries a packed atlas entry");
        // Light 17 (smallest) was stripped.
        const flags17 = bits[17 * 12 + 7] >>> 16;
        assert.equal(flags17 & FLAGS.CASTS_SHADOWS, 0, "loser stripped of CASTS_SHADOWS");
        assert.equal(bits[17 * 12 + 11], 0, "loser has no atlas entry");
    });
});

test("point lights pack a 3x2 cross, spots a square, and unpack round-trips", () =>
{
    withDynamicShadows(() =>
    {
        const manager = new Tr2LightManager();
        manager.SetShadowQuality(ShadowQuality.SHADOW_HIGH, 1);
        manager.SetShadowQuality(ShadowQuality.SHADOW_HIGH, 2);
        manager.SetFrustum(frustumWithSizes({ 0: 512, 1: 512 }));

        const point = caster(0, { innerAngle: 0 });
        const spot = caster(1, { innerAngle: 0.5 });
        manager.AddLight(point);
        manager.AddLight(spot);
        manager.ResolveLightData();

        const data = manager.GetLightBufferData();
        const bits = new Uint32Array(data.buffer, data.byteOffset, data.length);

        // 512px at HIGH: scale 512 texels = 32 min-entries. The point's 3x2
        // cross (1536x1024) packs at the origin; the spot's 512 square lands
        // beside it in the guillotine split.
        const word0 = bits[11];
        const scale0 = (word0 >>> 2) & 0x3FF;
        assert.equal(scale0, 32);
        assert.equal((word0 >>> 12) & 0x3FF, 0, "first entry at x 0");

        const word1 = bits[12 + 11];
        const scale1 = (word1 >>> 2) & 0x3FF;
        assert.equal(scale1, 32);
        const x1 = (word1 >>> 12) & 0x3FF;
        const y1 = (word1 >>> 22) & 0x3FF;
        assert.ok(x1 !== 0 || y1 !== 0, "second entry does not overlap the first");

        // GetUnpackedShadowMapData shifts back to texels.
        const record = { shadowMapScale: scale0, shadowMapOffsetX: 0, shadowMapOffsetY: 0 };
        const unpacked = manager.GetUnpackedShadowMapData(record);
        assert.equal(unpacked.shadowMapScale, 512);
    });
});

test("the setting ships false: casters are stripped and no atlas packs", () =>
{
    const manager = new Tr2LightManager();
    manager.SetShadowQuality(ShadowQuality.SHADOW_HIGH, 1);
    manager.SetFrustum(frustumWithSizes({ 0: 512 }));
    manager.AddLight(caster(0));
    manager.ResolveLightData();

    assert.equal(Tr2LightManager.useDynamicLightsShadows, false);
    assert.equal(manager.GetShadowCastingLights().length, 0);
    const data = manager.GetLightBufferData();
    const bits = new Uint32Array(data.buffer, data.byteOffset, data.length);
    assert.equal((bits[7] >>> 16) & FLAGS.CASTS_SHADOWS, 0, "AddLight strips the flag under the pin");
    assert.equal(bits[11], 0, "shadow union stays zero");
});
