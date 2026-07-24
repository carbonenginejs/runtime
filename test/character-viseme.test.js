import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import {
    CjsCharacterControlApplicator,
    CjsCharacterControlBinding,
    CjsCharacterGStateParameterSink,
    CjsCharacterGraph,
    CjsCharacterLibrary,
    CjsCharacterViseme,
    CjsCharacterVisemeSet,
    Tr2GStateParameter
} from "../npm/dist/index.js";

const MOUTH_BONE_NAMES = [
    "Head_End",
    "fj_rightCheekInner_middle",
    "fj_leftCheekInner_middle",
    "fj_lip_upper_centerRight",
    "fj_lip_upper_center",
    "fj_lip_upper_centerLeft",
    "fj_nose_left",
    "fj_nose_right",
    "fj_leftCheekBone_inner",
    "fj_leftCheekBone_middle",
    "fj_leftCheekBone_outer",
    "fj_rightCheekBone_outer",
    "fj_rightCheekBone_middle",
    "fj_rightCheekBone_inner",
    "fj_leftCheekInner_upper",
    "fj_rightCheekInner_upper",
    "fj_lip_cornerLeft",
    "fj_lip_cornerRight",
    "fj_fang",
    "fj_jaw",
    "fj_lip_lower_center",
    "fj_lip_lower_centerLeft",
    "fj_lip_lower_centerRight",
    "fj_chin_group",
    "fj_tongueBase",
    "fj_tongue_1",
    "fj_tongue_2",
    "fj_tongue_End"
];

const VISEME_ANIMATIONS = [
    [ "AA", "Female_Viseme_AA", "female_viseme_aa.gr2" ],
    [ "AH", "Female_Viseme_AH", "female_viseme_ah.gr2" ],
    [ "AO", "Female_Viseme_AO", "female_viseme_ao.gr2" ],
    [ "AW", "Female_Viseme_AW", "female_viseme_aw.gr2" ],
    [ "OY", "Female_Viseme_OY", "female_viseme_oy.gr2" ],
    [ "EH", "Female_Viseme_EH", "female_viseme_eh.gr2" ],
    [ "IH", "Female_Viseme_IH", "female_viseme_ih.gr2" ],
    [ "EY", "Female_Viseme_EY", "female_viseme_ey.gr2" ],
    [ "y", "Female_Viseme_y", "female_viseme_y.gr2" ],
    [ "r", "Female_Viseme_r", "female_viseme_r.gr2" ],
    [ "l", "Female_Viseme_I", "female_viseme_i.gr2" ],
    [ "w", "Female_Viseme_w", "female_viseme_w.gr2" ],
    [ "m", "Female_Viseme_m", "female_viseme_m.gr2" ],
    [ "n", "Female_Viseme_n", "female_viseme_n.gr2" ],
    [ "CH", "Female_Viseme_CH", "female_viseme_ch.gr2" ],
    [ "f", "Female_Viseme_f", "female_viseme_f.gr2" ],
    [ "x", "Female_Additive_Face_Default_03", "female_additive_face_default_03.gr2" ]
];

function CreateSpeechSet()
{
    return CjsCharacterVisemeSet.prepare({
        id: "female-speech-03",
        sex: "female",
        stateGraphPath: "res:/animation_gstate/gstate/female_gstate_speech_03.gsf",
        parameterNode: "Visemes",
        neutralVisemeID: "x",
        maskName: "Mouth",
        maskBoneNames: MOUTH_BONE_NAMES,
        visemes: VISEME_ANIMATIONS.map(([ id, animationName, filename ]) => ({
            id,
            parameterName: id,
            animationName,
            resourcePath: `res:/animation_gstate/female/granny/${filename}`
        }))
    });
}

test("hydrates ordered exact viseme controls and exposes public static helpers", () =>
{
    const set = CreateSpeechSet();

    assert.ok(set instanceof CjsCharacterVisemeSet);
    assert.ok(set.visemes.every(value => value instanceof CjsCharacterViseme));
    assert.deepEqual(set.visemes.map(value => value.id), VISEME_ANIMATIONS.map(value => value[0]));
    assert.deepEqual(set.maskBoneNames, MOUTH_BONE_NAMES);
    assert.equal(set.visemes.length, 17);
    assert.equal(set.maskBoneNames.length, 28);
    assert.ok(set.visemes.every(value =>
        value.minimum === 0 && value.maximum === 1 && value.defaultValue === 0));
    assert.equal(CjsCharacterVisemeSet.getViseme(set, "AA"), set.visemes[0]);
    assert.equal(
        CjsCharacterVisemeSet.getViseme(set, "x").animationName,
        "Female_Additive_Face_Default_03"
    );
    assert.equal(CjsCharacterVisemeSet.getViseme(set, "l").animationName, "Female_Viseme_I");
    assert.equal(CjsCharacterVisemeSet.getViseme(set, "I"), null,
        "case-sensitive public parameter names are not corrected from animation names");
    assert.equal(CjsCharacterVisemeSet.getControlName(set, "AA"), "Visemes/AA");
    assert.equal(
        CjsCharacterVisemeSet.getIDFromAnimationPath("..\\Female\\Granny\\Female_Viseme_AO.gr2"),
        "AO"
    );
    assert.equal(CjsCharacterVisemeSet.getIDFromAnimationPath("face_default.gr2"), null);
    assert.equal(CjsSchema.getClassFamily(CjsCharacterVisemeSet), "character");
    assert.equal(CjsSchema.getField(CjsCharacterVisemeSet, "visemes").type.itemType, "CjsCharacterViseme");
});

test("creates overlapping viseme parameter layers without normalizing their sum", () =>
{
    const set = CreateSpeechSet();
    const layer = CjsCharacterVisemeSet.createControlLayer(set, {
        AA: 0.8,
        l: 0.7
    }, { influence: 0.5 });
    const state = new CjsCharacterControlApplicator().Compose(new CjsCharacterGraph(), [ layer ]);

    assert.equal(layer.parameters.get("Visemes/AA"), 0.8);
    assert.equal(layer.parameters.get("Visemes/l"), 0.7);
    assert.ok(Math.abs(state.parameters.get("Visemes/AA") - 0.4) < 1e-6);
    assert.ok(Math.abs(state.parameters.get("Visemes/l") - 0.35) < 1e-6);
    assert.equal(state.parameters.size, 2);

    const neutral = CjsCharacterVisemeSet.createNeutralLayer(set, 1);
    assert.deepEqual([ ...neutral.parameters ], [ [ "Visemes/x", 1 ] ]);
});

test("binds exact GState parameter records and restores captured pre-control values", () =>
{
    const animation = {
        parameters: [
            Tr2GStateParameter.from({ nodename: "Visemes", name: "AA", value: 0.25 }),
            Tr2GStateParameter.from({ nodename: "Visemes", name: "l", value: 0 }),
            Tr2GStateParameter.from({ nodename: "Visemes", name: "x", value: 0 })
        ]
    };
    const sink = new CjsCharacterGStateParameterSink(animation);
    const binding = new CjsCharacterControlBinding(sink);
    const set = CreateSpeechSet();
    const first = new CjsCharacterControlApplicator().Compose(new CjsCharacterGraph(), [
        CjsCharacterVisemeSet.createControlLayer(set, { AA: 0.75, l: 0.5 })
    ]);

    assert.equal(sink.HasParameter("Visemes/l"), true);
    assert.equal(sink.HasParameter("Visemes/I"), false);
    assert.equal(binding.Apply(first), true);
    assert.equal(animation.parameters[0].value, 0.75);
    assert.equal(animation.parameters[1].value, 0.5);

    assert.equal(binding.Apply(new CjsCharacterControlApplicator().Compose(
        new CjsCharacterGraph(),
        [ CjsCharacterVisemeSet.createNeutralLayer(set, 1) ]
    )), true);
    assert.equal(animation.parameters[0].value, 0.25,
        "an omitted control restores the value captured before binding");
    assert.equal(animation.parameters[1].value, 0);
    assert.equal(animation.parameters[2].value, 1);

    assert.equal(binding.Reset(), true);
    assert.equal(animation.parameters[2].value, 0);
});

test("indexes optional viseme sets in prepared character libraries", () =>
{
    const set = CreateSpeechSet();
    const library = new CjsCharacterLibrary({
        schema: "carbonenginejs.characterLibrary",
        schemaVersion: 1,
        visemeSets: [ set.GetValues() ]
    });

    assert.ok(library.GetVisemeSet("female-speech-03") instanceof CjsCharacterVisemeSet);
    assert.equal(
        CjsCharacterVisemeSet.getViseme(library.GetVisemeSet("female-speech-03"), "l").parameterName,
        "l"
    );

    const { id: omittedID, ...compactSet } = set.GetValues();
    assert.equal(omittedID, "female-speech-03");
    const compact = new CjsCharacterLibrary({
        schema: "carbonenginejs.characterLibrary",
        schemaVersion: 2,
        partSources: {},
        visemeSets: {
            "female-speech-03": compactSet
        }
    });
    assert.ok(compact.GetVisemeSet("female-speech-03") instanceof CjsCharacterVisemeSet);
    assert.equal(compact.GetVisemeSet("female-speech-03").visemes[0].animationName, "Female_Viseme_AA");

    const raw = new CjsCharacterLibrary({
        schema: "carbonenginejs.characterLibrary",
        schemaVersion: 1,
        visemeSets: [ {
            id: " speech ",
            parameterNode: "Visemes",
            visemes: [ { id: "AA" } ]
        } ]
    });
    assert.equal(raw.GetVisemeSet("speech").id, "speech");
    assert.equal(raw.GetVisemeSet("speech").visemes[0].parameterName, "AA");
});

test("rejects invalid viseme data without guessing or clamping", () =>
{
    const set = CreateSpeechSet();

    assert.throws(
        () => CjsCharacterVisemeSet.createControlLayer(set, { I: 0.5 }),
        /does not contain "I"/
    );
    assert.throws(
        () => CjsCharacterVisemeSet.createControlLayer(set, { AA: 1.1 }),
        /between 0 and 1/
    );
    assert.throws(
        () => CjsCharacterVisemeSet.prepare({
            id: "duplicate",
            visemes: [ { id: "AA" }, { id: "AA" } ]
        }),
        /duplicate id "AA"/
    );
    assert.throws(
        () => CjsCharacterVisemeSet.prepare({
            id: "missing-neutral",
            neutralVisemeID: "x",
            visemes: [ { id: "AA" } ]
        }),
        /neutral id "x" was not found/
    );
    assert.throws(
        () => CjsCharacterGStateParameterSink.parseParameterName("Visemes"),
        /node\/parameter/
    );
    assert.throws(
        () => new CjsCharacterGStateParameterSink({ parameters: [] }),
        /requires initialized parameter records/
    );
});
