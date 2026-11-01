import assert from "node:assert/strict";
import test from "node:test";
import { blue } from "../../../npm/dist/blue/blue/index.js";
import { Tr2InteriorScene, Tr2InteriorLightSource } from "../../../npm/dist/character/index.js";
import { Tr2RenderContext_GetMainThreadRenderContext, Tr2VariableStore } from "../../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub } from "../../../npm/dist/trinityal/index.js";
import { StubResMan } from "../../support/stubResMan.js";

function setup(t)
{
    const context = Tr2RenderContext_GetMainThreadRenderContext(), oldAL = context.GetRenderContextAL(), oldManager = blue.resMan;
    const al = new Tr2RenderContextALStub();
    al.CreateDevice();
    context.SetRenderContextAL(al);
    blue.resMan = new StubResMan();
    const scenes = [];
    t.after(() =>
    {
        for (const scene of scenes) scene.Destruct();
        context.SetRenderContextAL(oldAL);
        blue.resMan = oldManager;
        al.Destroy();
    });
    return () => { const scene = new Tr2InteriorScene(); scenes.push(scene); return scene; };
}

const read = name => Array.from(Tr2VariableStore.globalStore().FindVariable(name).GetValue()).map(v => Math.round(v * 1000) / 1000 + 0);

test("two interior scenes keep their own sun and ambient: each Update publishes its scene's values", t =>
{
    const create = setup(t);
    const a = create(), b = create();
    a.sunDirection.set([ 0, 0, 1 ]);
    a.sunDiffuseColor.set([ 1, 0, 0, 1 ]);
    a.sunSpecularColor.set([ .5, .5, .5, 1 ]);
    a.ambientColor.set([ .1, .2, .3, 1 ]);
    b.sunDirection.set([ 0, 2, 0 ]);
    b.sunDiffuseColor.set([ 0, 1, 0, 1 ]);
    b.sunSpecularColor.set([ .25, .25, .25, 1 ]);
    b.ambientColor.set([ .4, .5, .6, 1 ]);

    a.Update(10, 10);
    // Tr2InteriorScene.cpp:415-422: the negated, normalized sun direction and the scene's own colours.
    assert.deepEqual(read("Sun.DirWorld"), [ 0, 0, -1 ]);
    assert.deepEqual(read("Sun.WodDiffuseColor"), [ 1, 0, 0, 1 ]);
    assert.deepEqual(read("Sun.SpecularColor"), [ .5, .5, .5, 1 ]);
    assert.deepEqual(read("Scene.AmbientColor"), [ .1, .2, .3, 1 ]);

    b.Update(10, 10);
    assert.deepEqual(read("Sun.DirWorld"), [ 0, -1, 0 ]);
    assert.deepEqual(read("Sun.WodDiffuseColor"), [ 0, 1, 0, 1 ]);
    assert.deepEqual(read("Scene.AmbientColor"), [ .4, .5, .6, 1 ]);

    // A second call at the same simulation time is ignored (cpp:409-413); the next frame republishes.
    a.Update(10, 10);
    assert.deepEqual(read("Scene.AmbientColor"), [ .4, .5, .6, 1 ]);
    a.Update(20, 20);
    assert.deepEqual(read("Scene.AmbientColor"), [ .1, .2, .3, 1 ]);
    assert.deepEqual(read("Sun.DirWorld"), [ 0, 0, -1 ]);
});

test("UpdateScene runs Update with one time, and lights get the simulation time as ticks", t =>
{
    const create = setup(t);
    const scene = create();
    const light = new Tr2InteriorLightSource();
    const times = [];
    light.curveSets.push({ Update: seconds => times.push(seconds) });
    scene.AddLightSource(light);
    scene.ambientColor.set([ .7, .7, .7, 1 ]);
    scene.UpdateSceneFromScript(20000000);
    assert.deepEqual(read("Scene.AmbientColor"), [ .7, .7, .7, 1 ]);
    // Tr2InteriorLightSource.cpp:146-152: Blue ticks to seconds (TimeAsDouble) for each curve set.
    assert.deepEqual(times, [ 2 ]);
});
