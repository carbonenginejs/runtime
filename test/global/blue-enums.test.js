import assert from "node:assert/strict";
import { test } from "node:test";
import { blue, CjsBlueEnumRegistry, EnumRegistrationType } from "#blue";
import { CjsSchema } from "#schema";
import { CjsModel } from "#model";

test("Blue enum names preserve Carbon chooser order, aliases and partial masks", () =>
{
    const registry = new CjsBlueEnumRegistry();
    const values = { ZERO: 0, A: 1, ALSO_A: 1, B: 2, AB: 3, SIGN: -2147483648, ALL: -1 };
    assert.equal(registry.RegisterEnum("test.Flags", values), values);
    assert.equal(registry.GetEnum("test.Flags"), values);
    assert.ok(Object.isFrozen(values));
    assert.equal(registry.GetNameFromValue("test.Flags", 1), "A | ALSO_A");
    assert.equal(registry.GetNameFromBitmask("test.Flags", 1), "A");
    assert.equal(registry.GetNameFromBitmask("test.Flags", 3), "AB");
    assert.equal(registry.GetNameFromBitmask("test.Flags", 7), "A | ALSO_A | B | AB");
    assert.equal(registry.GetNameFromBitmask("test.Flags", 5), "A | ALSO_A");
    assert.equal(registry.GetNameFromBitmask("test.Flags", 0), "ZERO");
    assert.equal(registry.GetNameFromValue("test.Flags", 0x80000000), "SIGN");
    assert.equal(registry.GetNameFromBitmask("test.Flags", 0x80000001), "A | ALSO_A | SIGN");
    assert.equal(registry.GetNameFromBitmask("test.Flags", 0xffffffff), "ALL");
    assert.throws(() => registry.GetNameFromBitmask("test.Flags", 8), RangeError);
    assert.throws(() => registry.GetNameFromValue("test.Flags", 8), RangeError);
    registry.RegisterEnum("test.NoZero", { A: 1 });
    assert.throws(() => registry.GetNameFromBitmask("test.NoZero", 0), RangeError);
    assert.throws(() => registry.GetEnum("missing"), ReferenceError);
    for (const invalid of [1.5, "1", 1n, NaN, Infinity, 4294967296, -2147483649])
    {
        assert.throws(() => registry.GetNameFromValue("test.Flags", invalid), TypeError);
        assert.throws(() => registry.GetNameFromBitmask("test.Flags", invalid), TypeError);
    }
});

test("enum registration is atomic, idempotent and preserves immutable descriptions", () =>
{
    const registry = new CjsBlueEnumRegistry();
    const values = { A: 1, B: 1 };
    const definition = { members: [{ name: "B", value: 1, description: "Second spelling" }], source: "example.h", family: "test", line: 9, exposure: 3 };
    registry.RegisterEnum("test.Order", values, definition);
    assert.equal(registry.RegisterEnum("test.Order", values, definition), values);
    definition.members[0].description = "changed outside registry";
    assert.equal(registry.GetNameFromValue("test.Order", 1), "B | A");
    const info = registry.GetEnumInfo("test.Order");
    assert.equal(info.members[0].description, "Second spelling");
    assert.equal(info.source, "example.h");
    assert.equal(info.exposure, 3);
    assert.throws(() => { info.members[0].name = "BROKEN"; }, TypeError);
    assert.throws(() => registry.RegisterEnum("test.Order", values, definition), /conflicts/);
    const other = { A: 1 };
    assert.throws(() => registry.RegisterEnum("test.Order", other), /conflicts/);
    assert.equal(Object.isFrozen(other), false);
    assert.equal(registry.GetEnumName(other), null);
    assert.throws(() => registry.RegisterEnum("test.Other", values), /canonical name/);
    for (const invalid of [{ 0: "A" }, { A: 1.1 }, { get A() { throw new Error("must not execute"); } }])
    {
        assert.throws(() => registry.RegisterEnum("test.Bad", invalid), TypeError);
        assert.equal(registry.HasEnum("test.Bad"), false);
        assert.equal(Object.isFrozen(invalid), false);
    }
    const untouched = { A: 1 };
    assert.throws(() => registry.RegisterEnum("test.Bad", untouched, { members: [{ name: "A", value: 2 }] }), TypeError);
    assert.equal(Object.isFrozen(untouched), false);
});

test("native choosers preserve exposed names, selected aliases and omitted sentinels", () =>
{
    const registry = new CjsBlueEnumRegistry();
    const values = { TYPE_FIRST: 1, TYPE_MAX: 2, TYPE_NO_OVERWRITE: 2 };
    const chooser = [
        { name: "First", value: 1, description: "First choice" },
        { name: "NoOverwrite", value: 2, description: "Keep existing" }
    ];
    registry.RegisterEnum("test.Chooser", values, { chooser, exposedName: "NativeChooser", chooserSource: "example.cpp:1" });
    assert.equal(registry.GetEnum("test.Chooser"), values);
    assert.equal(registry.GetNameFromValue("test.Chooser", 2), "NoOverwrite");
    assert.equal(registry.GetNameFromBitmask("test.Chooser", 3), "First | NoOverwrite");
    chooser[0].name = "Mutated";
    assert.equal(registry.GetEnumInfo("test.Chooser").chooser[0].name, "First");
    assert.equal(registry.GetEnumInfo("test.Chooser").members.length, 3);
    registry.RegisterEnum("test.Omitted", { A: 1, MAX: 2 }, { chooser: [{ name: "First", value: 1 }] });
    assert.throws(() => registry.GetNameFromValue("test.Omitted", 2), RangeError);
    registry.RegisterEnum("test.Empty", { A: 1 }, { chooser: [] });
    assert.throws(() => registry.GetNameFromValue("test.Empty", 1), RangeError);
    const invalid = { A: 1 };
    assert.throws(() => registry.RegisterEnum("test.InvalidChooser", invalid, { chooser: [{ name: "NoValue", value: 2 }] }), TypeError);
    assert.equal(Object.isFrozen(invalid), false);
    assert.equal(registry.HasEnum("test.InvalidChooser"), false);
});

test("Blue and schema share registration and resolve qualified fields after registration", () =>
{
    assert.equal(EnumRegistrationType.ENUM_REG_VALUES_ON_MODULE, 1);
    assert.equal(EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE, 2);
    assert.equal(CjsSchema.getSchema(CjsBlueEnumRegistry).modelledOn, "BlueRegistration");
    for (const name of ["RegisterEnum", "HasEnum", "GetEnum", "GetEnumInfo", "GetEnumName", "GetNameFromValue", "GetNameFromBitmask"])
    {
        assert.ok(CjsSchema.getMethod(CjsBlueEnumRegistry, name).impl);
    }
    class Host extends CjsModel { mode = 1; }
    CjsSchema.define(Host, { className: "RegistryEnumHost", fields: {
        mode: [CjsSchema.type.int32, CjsSchema.type.enum("test.LateEnum"), CjsSchema.edit.persist]
    } });
    assert.throws(() => CjsSchema.getSchema(Host), ReferenceError);
    const values = blue.enums.RegisterEnum("test.LateEnum", { FIRST: 1, SECOND: 2 });
    assert.equal(CjsSchema.getEnum(values), blue.enums.GetEnumInfo("test.LateEnum"));
    assert.equal(CjsSchema.getEnumName(values), "test.LateEnum");
    assert.equal(CjsSchema.getField(Host, "mode").enum.members, values);
    assert.equal(CjsSchema.getSchema(Host).fields[0].enum.identity, "test.LateEnum");
    const host = new Host();
    host.SetValues({ mode: "SECOND" });
    assert.equal(host.mode, 2);
    assert.equal(host.GetValues({ enumFormat: "names" }).mode, "SECOND");
    class Derived extends Host {}
    assert.equal(CjsSchema.getSchema(Derived).fields[0].enum.members, values);
    class Legacy extends CjsModel { static Choice = values; }
    CjsSchema.define(Legacy, { className: "LegacyEnumHost", fields: { mode: [CjsSchema.type.int32, CjsSchema.type.enum("Choice")] } });
    class LegacyChild extends Legacy {}
    assert.equal(CjsSchema.getSchema(LegacyChild).fields[0].enum.identity, "LegacyEnumHost.Choice");
    const facadeValues = { VALUE: 3 };
    CjsSchema.defineEnum(facadeValues, { name: "test.Facade" });
    assert.equal(blue.enums.GetEnum("test.Facade"), facadeValues);
    const wrapper = { Type: { VALUE: 4 } };
    CjsSchema.defineEnum(wrapper, { name: "test.Wrapped" });
    assert.equal(CjsSchema.getEnum(wrapper), blue.enums.GetEnumInfo("test.Wrapped"));
});

test("the SOF blink enum uses one native-owned object through Blue and its static", async () =>
{
    const { EveSOFDataBlinkType } = await import("../../npm/dist/sof/shared/EveSOFDataBlinkType.js");
    const { EveSOFDataHullPlaneSetItem } = await import("../../npm/dist/sof/hull/EveSOFDataHullPlaneSetItem.js");
    const { CjsSchema: schema } = await import("../../npm/dist/global/schema/index.js");
    const { blue: services } = await import("../../npm/dist/global/blue/index.js");
    const field = schema.getSchema(EveSOFDataHullPlaneSetItem).fields.find(value => value.enum?.enumType === "trinity.EveSOFDataBlinkType.BlinkType");
    assert.ok(field);
    assert.equal(field.enum.members, EveSOFDataBlinkType.BlinkType);
    assert.equal(services.enums.GetEnum(field.enum.identity), EveSOFDataBlinkType.BlinkType);
    assert.equal(services.enums.GetNameFromValue(field.enum.identity, 1), "Blink");
    assert.equal(field.enum.chooser[1].description, "Regular blink");
    assert.equal(services.enums.GetEnumInfo(field.enum.identity).exposedName, "EveSOFDataBlinkType");
});

test("SOF-owned enum fields resolve native choosers without merging independent types", async () =>
{
    const { CjsSchema: schema } = await import("../../npm/dist/global/schema/index.js");
    const { blue: services } = await import("../../npm/dist/global/blue/index.js");
    const cases = [
        ["hull", "EveSOFDataHull", "BuildClass", "buildClass", 5],
        ["hull", "EveSOFDataHull", "ImpactEffectType", "impactEffectType", 3],
        ["hull", "EveSOFDataHullBanner", "Usage", "usage", 24],
        ["hull", "EveSOFDataHullBannerSetItem", "Usage", "usage", 24],
        ["hull", "EveSOFDataHullDecalSetItem", "Usage", "usage", 7],
        ["hull", "EveSOFDataHullHazeSet", "HazeType", "hazeType", 2],
        ["hull", "EveSOFDataHullPlaneSet", "Usage", "usage", 4],
        ["pattern", "EveSOFDataPatternLayer", "ProjectionType", "projectionTypeU", 3],
        ["pattern", "EveSOFDataPatternLayer", "ProjectionType", "projectionTypeV", 3],
        ["pattern", "EveSOFDataPatternLayer", "MaterialSource", "materialSource", 6],
        ["pattern", "EveSOFDataPatternLayerProperties", "ProjectionType", "projectionTypeU", 3],
        ["pattern", "EveSOFDataPatternLayerProperties", "ProjectionType", "projectionTypeV", 3],
        ["shared", "EveSOFDataInstancedMesh", "DisplayQualityModifier", "displayModifier", 6],
        ["layout", "EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings", "DisplayQualityModifier", "displayFilter", 6]
    ];
    for (const [folder, name, enumName, member, count] of cases)
    {
        const { [name]: Constructor } = await import(`../../npm/dist/sof/${folder}/${name}.js`);
        const instance = new Constructor();
        const field = schema.getField(Constructor, member);
        const identity = `trinity.${name}.${enumName}`;
        assert.equal(field.enum.identity, identity);
        assert.equal(field.enum.members, Constructor[enumName]);
        const info = services.enums.GetEnumInfo(identity);
        assert.equal(field.enum.chooser, info.chooser);
        assert.equal(info.chooser.length, count);
        // Named values transport remains based on native identifiers, not UI labels.
        const key = Object.keys(Constructor[enumName])[0];
        instance.SetValues({ [member]: key });
        assert.equal(instance[member], Constructor[enumName][key]);
    }
    for (const [first, second] of [
        ["EveSOFDataHullBanner.Usage", "EveSOFDataHullBannerSetItem.Usage"],
        ["EveSOFDataPatternLayer.ProjectionType", "EveSOFDataPatternLayerProperties.ProjectionType"]
    ])
    {
        const a = services.enums.GetEnum(`trinity.${first}`);
        const b = services.enums.GetEnum(`trinity.${second}`);
        assert.deepEqual(a, b);
        assert.notEqual(a, b);
    }
    const display = "trinity.EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings.DisplayQualityModifier";
    assert.equal(services.enums.GetEnum(display).ONLY_REFLECTIONS, 6);
    assert.throws(() => services.enums.GetNameFromValue(display, 6), RangeError);
    assert.equal(services.enums.GetEnumInfo(display).exposedName, undefined);
    assert.throws(() => services.enums.GetNameFromValue("trinity.EveSOFDataHull.BuildClass", 5), RangeError);
    assert.throws(() => services.enums.GetNameFromValue("trinity.EveSOFDataHullBanner.Usage", 24), RangeError);
    assert.equal(services.enums.GetNameFromValue("trinity.EveSOFDataPatternLayer.ProjectionType", 1), "Clamp");
});


test("shared SOF enum fields resolve through Blue with native reflection labels and signed LOD values", async () =>
{
    const { CjsSchema: schema } = await import("../../npm/dist/global/schema/index.js");
    const { blue: services } = await import("../../npm/dist/global/blue/index.js");
    const cases = [
        ["generic", "EveSOFDataGenericHullCategory", "reflectionMode", "ReflectionMode", "trinity.EntityComponents.ReflectionMode"],
        ["hull", "EveSOFDataHullChild", "lowestLodVisible", "Tr2Lod", "trinity.Tr2Lod"],
        ["hull", "EveSOFDataHullChildSetItem", "lowestLodVisible", "Tr2Lod", "trinity.Tr2Lod"],
        ["shared", "EveSOFDataInstancedMesh", "lowestLodVisible", "Tr2Lod", "trinity.Tr2Lod"]
    ];
    for (const [folder, name, member, staticName, identity] of cases)
    {
        const { [name]: Constructor } = await import(`../../npm/dist/sof/${folder}/${name}.js`);
        const field = schema.getField(Constructor, member);
        assert.equal(field.enum.identity, identity);
        assert.equal(field.enum.members, services.enums.GetEnum(identity));
        assert.equal(field.enum.members, Constructor[staticName]);
        const instance = new Constructor();
        const key = staticName === "Tr2Lod" ? "TR2_LOD_UNSPECIFIED" : "REFLECT_HIGH";
        instance.SetValues({ [member]: key });
        assert.equal(instance[member], staticName === "Tr2Lod" ? -1 : 0);
        assert.equal(instance.GetValues({ enumFormat: "names" })[member], key);
    }
    const reflection = "trinity.EntityComponents.ReflectionMode";
    assert.deepEqual(services.enums.GetEnumInfo(reflection).chooser.map(entry => entry.name),
        ["Never", "LowMediumAndHigh", "MediumAndHigh", "High"]);
    assert.equal(services.enums.GetNameFromValue(reflection, 0), "High");
    assert.equal(services.enums.GetEnumInfo(reflection).exposedName, "ReflectionModeType");
    assert.equal(services.enums.GetNameFromValue("trinity.Tr2Lod", -1), "TR2_LOD_UNSPECIFIED");
    assert.equal(services.enums.GetEnumInfo("trinity.Tr2Lod").chooser, undefined);
    assert.equal(services.enums.GetEnumInfo("trinity.Tr2Lod").exposedName, undefined);
});


test("Trinity shares SOF's registered reflection and LOD objects", async () =>
{
    const { CjsSchema: schema } = await import("../../npm/dist/global/schema/index.js");
    const { blue: services } = await import("../../npm/dist/global/blue/index.js");
    const cases = [
        ["child/EveChildCloud2", "reflectionMode", "ReflectionMode"],
        ["child/EveChildMesh", "reflectionMode", "ReflectionMode"],
        ["child/EveChildMesh", "lowestLodVisible", "Tr2Lod"],
        ["child/EveChildParticleSystem", "reflectionMode", "ReflectionMode"],
        ["renderable/stretch/EveStretch", "lodLevel", "Tr2Lod"],
        ["spaceObject/EveEffectRoot2", "lodLevel", "Tr2Lod"],
        ["spaceObject/EveSpaceObject2", "reflectionMode", "ReflectionMode"],
        ["spaceObject/EveSpaceObject2", "lodLevel", "Tr2Lod"],
        ["spaceObject/EveTransform", "lodLevel", "Tr2Lod"]
    ];
    for (const [path, member, staticName] of cases)
    {
        const name = path.split("/").at(-1);
        const { [name]: Constructor } = await import(`../../npm/dist/trinity/eve/${path}.js`);
        const field = schema.getField(Constructor, member);
        const identity = staticName === "Tr2Lod" ? "trinity.Tr2Lod" : "trinity.EntityComponents.ReflectionMode";
        assert.equal(field.enum.identity, identity);
        assert.equal(field.enum.members, Constructor[staticName]);
        assert.equal(field.enum.members, services.enums.GetEnum(identity));
        if (staticName === "ReflectionMode")
        {
            assert.equal(field.enum.chooser, services.enums.GetEnumInfo(identity).chooser);
            assert.equal(services.enums.GetNameFromValue(identity, 3), "Never");
        }
        else
        {
            assert.equal(field.enum.members.TR2_LOD_UNSPECIFIED, -1);
            assert.equal(field.enum.chooser, undefined);
        }
    }
});


test("particle enum consumers share the native owner and chooser", async () =>
{
    const { CjsSchema: schema } = await import("../../npm/dist/global/schema/index.js");
    const { blue: services } = await import("../../npm/dist/global/blue/index.js");
    const { Tr2ParticleElementDeclarationName: Name } = await import("../../npm/dist/trinity/particle/element/Tr2ParticleElementDeclarationName.js");
    const identity = "trinity.Tr2ParticleElementDeclarationName.Type";
    assert.equal(services.enums.GetEnum(identity), Name.Type);
    assert.deepEqual(Name.Type, { LIFETIME: 0, POSITION: 1, VELOCITY: 2, MASS: 3, CUSTOM: 4 });
    const info = services.enums.GetEnumInfo(identity);
    assert.equal(info.exposedName, "PARTICLE_ELEMENT_TYPE");
    assert.deepEqual(info.chooser.map(entry => entry.name), Object.keys(Name.Type));
    assert.equal(info.chooser[0].description, "Particle life time (2D float)");
    const cases = [
        ["element/Tr2ParticleElementDeclarationName", "type"],
        ["element/Tr2ParticleElementDeclaration", "elementType"],
        ["constraint/Tr2ElementBlendConstraint", "elementType"],
        ["attribute/Tr2ConsecutiveIntegerAttributeGenerator", "elementType"],
        ["attribute/Tr2RandomDirectionAttributeGenerator", "elementType"],
        ["attribute/Tr2RandomIntegerAttributeGenerator", "elementType"],
        ["attribute/Tr2RandomUniformAttributeGenerator", "elementType"]
    ];
    for (const [path, member] of cases)
    {
        const name = path.split("/").at(-1);
        const { [name]: Constructor } = await import(`../../npm/dist/trinity/particle/${path}.js`);
        const field = schema.getField(Constructor, member);
        assert.equal(field.enum.identity, identity);
        assert.equal(field.enum.members, Name.Type);
        assert.equal(Constructor.Type, Name.Type);
        assert.equal(field.enum.chooser, info.chooser);
    }
    const { Tr2ParticleElementData: Data } = await import("../../npm/dist/trinity/particle/element/Tr2ParticleElementData.js");
    const buffers = "trinity.Tr2ParticleElementData.BufferType";
    assert.deepEqual(Data.BufferType, { GPU: 0, CPU: 1, COUNT: 2 });
    assert.equal(schema.getField(Data, "bufferType").enum.members, services.enums.GetEnum(buffers));
    assert.equal(services.enums.GetEnumInfo(buffers).chooser, undefined);
    assert.equal(services.enums.GetEnumInfo(buffers).exposedName, undefined);
});


test("post-process enum fields resolve through Blue with Carbon's choosers", async () =>
{
    const { CjsSchema: schema } = await import("../../npm/dist/global/schema/index.js");
    const { blue: services } = await import("../../npm/dist/global/blue/index.js");
    // [ module under trinity/postProcess, field, identity, class static, Carbon exposedName ]
    const cases = [
        ["effect/Tr2PPGenericEffect", "quality", "trinity.PostProcess.Quality", "Quality", "PostProcessQuality"],
        ["Tr2PostProcessRenderer", "quality", "trinity.PostProcess.Quality", "Quality", "PostProcessQuality"],
        ["Tr2PostProcessRenderer", "bloomDebugMode", "trinity.Tr2PostProcessRenderer.BloomDebugMode", "BloomDebugMode", undefined],
        ["effect/Tr2PPDepthOfFieldEffect", "bokehShape", "trinity.Tr2Bokeh.Shape", "Shape", "BokehShapeType"],
        ["Tr2PostProcessAttributes", "depthOfFieldShape", "trinity.Tr2Bokeh.Shape", "Shape", "BokehShapeType"],
        ["Tr2PostProcessAttributes", "priority", "trinity.PostProcessEnums.Priority", "Priority", "Tr2PostProcessPriority"],
        ["effect/Tr2PPTaaEffect", "quality", "trinity.Tr2PPTaaEffect.Quality", "Quality", "TaaQuality"],
        ["effect/Tr2PPTaaEffect", "debug", "trinity.Tr2PPTaaEffect.Debug", "Debug", "TaaDebug"],
        ["Tr2SSAO", "quality", "trinity.SSAOQuality", "SSAOQuality", "SSAOQuality"],
        ["BlurContext", "type", "trinity.PostProcessBlur.BlurType", "BlurType", undefined],
        ["BlurContext", "channel", "trinity.PostProcessBlur.BlurChannel", "BlurChannel", undefined],
        ["BlurContext", "process", "trinity.PostProcessBlur.BlurProcess", "BlurProcess", undefined],
        ["BlurContext", "finalize", "trinity.PostProcessBlur.BlurFinalize", "BlurFinalize", undefined]
    ];
    for (const [path, member, identity, staticName, exposedName] of cases)
    {
        const name = path.split("/").at(-1);
        const { [name]: Constructor } = await import(`../../npm/dist/trinity/postProcess/${path}.js`);
        const field = schema.getField(Constructor, member);
        assert.equal(field.enum.identity, identity, `${name}.${member}`);
        assert.equal(field.enum.members, Constructor[staticName], `${name}.${member}`);
        assert.equal(field.enum.members, services.enums.GetEnum(identity));
        assert.equal(services.enums.GetEnumInfo(identity).exposedName, exposedName);
    }

    // Choosers keep Carbon's order and omit the sentinels.
    const labels = identity => services.enums.GetEnumInfo(identity).chooser.map(entry => entry.name);
    assert.deepEqual(labels("trinity.PostProcess.Quality"), [ "Low", "Medium", "High" ]);
    assert.deepEqual(labels("trinity.PostProcessEnums.Priority"), [ "UI", "High", "Medium", "Low", "SceneDefault" ]);
    assert.deepEqual(labels("trinity.SSAOQuality"), [ "Lowest", "Low", "Medium", "High", "Highest" ]);
    assert.equal(services.enums.GetNameFromValue("trinity.Tr2PPTaaEffect.Debug", 1), "Motion Vectors");
});


test("curve enum fields resolve through Blue, and audio shares Blue's TRIEXTRAPOLATION", async () =>
{
    const { CjsSchema: schema } = await import("../../npm/dist/global/schema/index.js");
    const { blue: services } = await import("../../npm/dist/global/blue/index.js");
    // [ module, field, identity, class static ]
    const cases = [
        ["trinity/curves/curve/Tr2CurveScalar", "extrapolationBefore", "trinity.Tr2CurveExtrapolation"],
        ["trinity/curves/curve/Tr2CurveQuaternion", "extrapolationAfter", "trinity.Tr2CurveExtrapolation"],
        ["trinity/curves/curve/Tr2CurveVector3Lerp", null, "trinity.Tr2CurveVector3LerpKeyInterpolation"],
        ["trinity/curves/key/Tr2CameraFollowCurveKey", null, "trinity.Tr2FollowCurveKeyInterpolation"],
        ["trinity/curves/key/Tr2ObjectFollowCurveKey", null, "trinity.Tr2ObjectFollowCurveKey.RotationSetting"],
        ["trinity/curves/key/Tr2ScalarExprKey", null, "trinity.Tr2CurveInterpolation"],
        ["trinity/curves/curve/TriColorSequencer", "operator", "blue.TRIOPERATOR"],
        ["trinity/curves/curve/TriVectorSequencer", "operator", "blue.TRIOPERATOR"],
        ["trinity/curves/curve/TriEventCurve", "extrapolation", "blue.TRIEXTRAPOLATION"],
        ["audio/trinity/audio/AudEventCurve", "extrapolation", "blue.TRIEXTRAPOLATION"]
    ];
    for (const [path, member, identity] of cases)
    {
        const name = path.split("/").at(-1);
        const { [name]: Constructor } = await import(`../../npm/dist/${path}.js`);
        const fields = schema.getSchema(Constructor).fields.filter(field => field.enum?.identity === identity);
        assert.ok(fields.length, `${name} has a field typed ${identity}`);
        if (member) assert.ok(fields.some(field => field.name === member), `${name}.${member}`);
        for (const field of fields) assert.equal(field.enum.members, services.enums.GetEnum(identity));
    }
    assert.deepEqual(services.enums.GetEnumInfo("trinity.Tr2ObjectFollowCurveKey.RotationSetting").chooser.map(entry => entry.name),
        [ "NO_ROTATION", "LOCATOR_ROTATION", "MODEL_ROTATION" ]);
    assert.equal(services.enums.GetEnumInfo("blue.TRIOPERATOR").exposedName, undefined);
});
