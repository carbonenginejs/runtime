import assert from "node:assert/strict";
import test from "node:test";

import * as trinity from "../../npm/dist/trinity/index.js";
import * as audio from "../../npm/dist/audio/index.js";
import { IInitialize, INotify } from "../../npm/dist/global/blue/index.js";
import { hasOwnInterfaceTable, mappedInterfaces } from "../../npm/dist/global/compose/interface.js";

const X = { ...audio, ...trinity };

/**
 * Carbon's own exposure block per class: the MAP_INTERFACE lines after the class's own entry, and the
 * EXPOSURE_CHAINTO parent (null for EXPOSURE_END). A resolved table starts with the class, then those
 * entries in order, then the parent's table, which itself starts with the parent.
 */
const BLOCKS = [
    // EveSmartLightAttributeModifier*_Blue.cpp
    [ "EveSmartLightAttributeModifierBucket", [ "IEveSmartLightGroupAttributeModifier", "EveSmartLightBaseAttributeModifier", IInitialize, INotify ], null, "Bucket_Blue.cpp:11-31" ],
    [ "EveSmartLightAttributeModifierCameraDependency", [ "EveSmartLightAttributeModifierBucket", "IEveSmartLightGroupAttributeModifier" ], null, "CameraDependency_Blue.cpp:10-43" ],
    [ "EveSmartLightAttributeModifierColor", [ "IEveSmartLightGroupAttributeModifier" ], "EveSmartLightBaseAttributeModifier", "Color_Blue.cpp:11-26" ],
    [ "EveSmartLightAttributeModifierControllerVariableListener", [ "EveSmartLightAttributeModifierBucket", "IEveSmartLightGroupAttributeModifier", "EveSmartLightBaseAttributeModifier", IInitialize, INotify ], null, "ControllerVariableListener_Blue.cpp:11-36" ],
    [ "EveSmartLightAttributeModifierExpressionBucket", [ "EveSmartLightAttributeModifierBucket", "IEveSmartLightGroupAttributeModifier", "EveSmartLightBaseAttributeModifier", IInitialize ], null, "ExpressionBucket_Blue.cpp:11-30" ],
    [ "EveSmartLightAttributeModifierNoise", [ "IEveSmartLightGroupAttributeModifier" ], "EveSmartLightBaseAttributeModifier", "Noise_Blue.cpp:10-18" ],
    // EveVirtualCameraBehaviour_Blue.cpp
    [ "EveVirtualCameraBehaviourFloatSet", [ INotify ], "EveVirtualCameraBehaviourFloatBase", "EveVirtualCameraBehaviour_Blue.cpp:27-30" ],
    [ "EveVirtualCameraBehaviourFloatAdd", [ INotify ], "EveVirtualCameraBehaviourFloatBase", ":40-44" ],
    [ "EveVirtualCameraBehaviourFloatNoise", [ INotify ], "EveVirtualCameraBehaviourFloatBase", ":54-60" ],
    [ "EveVirtualCameraBehaviourFloatDamping", [ INotify ], "EveVirtualCameraBehaviourFloatBase", ":70-73" ],
    [ "EveVirtualCameraBehaviourVector3MoveBetween", [ INotify ], "EveVirtualCameraBehaviourVector3Base", ":97-104" ],
    [ "EveVirtualCameraBehaviourVector3Offset", [ INotify ], "EveVirtualCameraBehaviourVector3Base", ":114-119" ],
    [ "EveVirtualCameraBehaviourVector3Orbit", [ INotify ], "EveVirtualCameraBehaviourVector3Base", ":129-138" ],
    [ "EveVirtualCameraBehaviourVector3MoveForward", [ INotify ], "EveVirtualCameraBehaviourVector3Base", ":148-153" ],
    [ "EveVirtualCameraBehaviourVector3MoveRight", [ INotify ], "EveVirtualCameraBehaviourVector3MoveForward", ":163-165" ],
    [ "EveVirtualCameraBehaviourVector3MoveUp", [ INotify ], "EveVirtualCameraBehaviourVector3MoveForward", ":175-177" ],
    [ "EveVirtualCameraBehaviourVector3Shake", [ INotify ], "EveVirtualCameraBehaviourVector3Base", ":187-194" ],
    [ "EveVirtualCameraBehaviourVector3Damping", [ INotify ], "EveVirtualCameraBehaviourVector3Base", ":204-207" ],
    [ "EveVirtualCameraBehaviourVector3Inertia", [ INotify ], "EveVirtualCameraBehaviourVector3Base", ":218-228" ],
    // The rest
    [ "AudMusicPlayer", [], "AudEmitter", "AudMusicPlayer_Blue.cpp:10-13" ],
    [ "AudUIPlayer", [], "AudEmitter", "AudUIPlayer_Blue.cpp:10-42" ],
    [ "EveCurveLineSet", [ "IEveTransform", "IEveSpaceObject2" ], "Tr2CurveLineSet", "EveCurveLineSet_Blue.cpp:10-14" ],
    [ "Tr2BoundingLineSet", [], "Tr2LineSet", "Tr2BoundingLineSet_Blue.cpp:10-18" ],
    [ "Tr2GrannyEventTrack", [], "Tr2GrannyTrack", "Tr2GrannyEventTrack_Blue.cpp:10-13" ],
    [ "Tr2GrannyTransformTrack", [], "Tr2GrannyTrack", "Tr2GrannyTransformTrack_Blue.cpp:10-21" ],
    [ "Tr2GrannyVectorTrack", [], "Tr2GrannyTrack", "Tr2GrannyVectorTrack_Blue.cpp:10-13" ],
    [ "Tr2InstancedMesh", [], "Tr2Mesh", "Tr2InstancedMesh_Blue.cpp:25-44" ],
];

const resolve = entry => typeof entry === "string" ? X[entry] : entry;

for (const [ name, mapped, chainTo, cite ] of BLOCKS)
{
    test(`${name} declares Carbon's own exposure block (${cite})`, () =>
    {
        const Class = X[name];
        assert.ok(Class, `${name} is exported`);
        assert.ok(hasOwnInterfaceTable(Class), `${name} has its own table, not its JS parent's`);

        const table = [ ...mappedInterfaces(Class) ];
        const own = [ Class, ...mapped.map(resolve) ];
        assert.deepEqual(table.slice(0, own.length), own, `${name}: own entries in Carbon's order`);

        if (chainTo === null) assert.equal(table.length, own.length, `${name}: EXPOSURE_END, nothing chained`);
        else assert.equal(table[own.length], X[chainTo], `${name}: chains to ${chainTo}`);
    });
}
