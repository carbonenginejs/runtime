// AudEmitter and StretchAudio debug rendering (audio/src/AudEmitter.cpp:125-211,
// audio/src/Components/StretchAudio.cpp:139-169). Expected values are written from the Carbon source.
import test from "node:test";
import assert from "node:assert/strict";
import { AudEmitter } from "../../npm/dist/audio/trinity/audio/AudEmitter.js";
import { StretchAudio } from "../../npm/dist/audio/trinity/audio/StretchAudio.js";
import { AudGameObjResource } from "../../npm/dist/audio/trinity/audio/AudGameObjResource.js";
import { AudManager } from "../../npm/dist/audio/trinity/audio/AudManager.js";
import { CjsWwiseSoundEngineStub } from "../../npm/dist/global/audio/CjsWwiseSoundEngineStub.js";
import { ITr2DebugRenderer2 } from "../../npm/dist/global/interfaces/ITr2DebugRenderer2.js";
import { color } from "../../npm/dist/global/math/color.js";

const SPHERE = "Audio Attenuation Sphere";
const DIRECTION = "Audio Emitter Direction";
const LISTENER_ID = 4;

function WithManager(run)
{
  const previousManager = AudGameObjResource.manager;
  const previousBackend = AudGameObjResource.backend;
  const manager = new AudManager();
  manager._state = "enabled";
  manager._callbackGameObjects.set(LISTENER_ID, { GetPosition: () => [ 0, 0, 0 ] });
  AudGameObjResource.manager = manager;
  AudGameObjResource.backend = new CjsWwiseSoundEngineStub();
  try { return run(manager); }
  finally
  {
    AudGameObjResource.manager = previousManager;
    AudGameObjResource.backend = previousBackend;
  }
}

/** A renderer that records its draws and answers HasOption from a set. */
function RecordingRenderer(options)
{
  const calls = [];
  return {
    calls,
    HasOption: (owner, option) => options.has(option),
    DrawSphere__CenterRadius: (owner, center, radius, segments, effect, colour) => calls.push({ kind: "sphere", owner, center: [ ...center ], radius, segments, effect, colour }),
    DrawArrow: (owner, start, end, radius, pointer, segments, effect, colour) => calls.push({ kind: "arrow", owner, start: [ ...start ], end: [ ...end ], radius, pointer, segments, effect, colour }),
    DrawText: (font, position, colour, text) => calls.push({ kind: "text", font, position: [ ...position ], colour, text })
  };
}

function Emitter(name, position)
{
  const emitter = new AudEmitter();
  emitter.name = name;
  emitter.position = Float32Array.from(position);
  emitter._culled = false;
  return emitter;
}

test("GetDebugOptions offers the two toggles (cpp:125-129)", () =>
{
  const options = new Set();
  new AudEmitter().GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ SPHERE, DIRECTION ]);
});

test("RenderDebugInfo draws nothing for a culled emitter or a disabled manager (cpp:133-136)", () =>
{
  WithManager(manager =>
  {
    const renderer = RecordingRenderer(new Set([ SPHERE, DIRECTION ]));
    const emitter = Emitter("a", [ 0, 0, 0 ]);

    emitter._culled = true;
    emitter.RenderDebugInfo(renderer);
    assert.equal(renderer.calls.length, 0);

    emitter._culled = false;
    manager._state = "disabled";
    emitter.RenderDebugInfo(renderer);
    assert.equal(renderer.calls.length, 0);
  });

  const renderer = RecordingRenderer(new Set([ SPHERE, DIRECTION ]));
  const previous = AudGameObjResource.manager;
  AudGameObjResource.manager = null;
  try { Emitter("a", [ 0, 0, 0 ]).RenderDebugInfo(renderer); }
  finally { AudGameObjResource.manager = previous; }
  assert.equal(renderer.calls.length, 0);
});

test("RenderDebugInfo draws the range sphere, direction arrow and name (cpp:143-211)", () =>
{
  WithManager(() =>
  {
    const renderer = RecordingRenderer(new Set([ SPHERE, DIRECTION ]));
    const emitter = Emitter("engine", [ 1000, 0, 0 ]);
    emitter.visualizationRadius = 10000;
    emitter.scalingFactor = 2;
    emitter.RenderDebugInfo(renderer);

    const [ visual, range, arrow, text ] = renderer.calls;

    // 8 + 10000 / 5000 segments (cpp:150-153).
    assert.equal(visual.kind, "sphere");
    assert.equal(visual.segments, 10);
    assert.equal(visual.radius, 20000);
    assert.equal(visual.effect, ITr2DebugRenderer2.Effect.Wireframe);
    // The visualisation sphere is green: Color( 0xff00ff00 ).
    assert.equal(visual.colour.color, 0xff00ff00);

    assert.equal(range.kind, "sphere");
    assert.equal(range.radius, 10000);
    assert.deepEqual(range.center, [ 1000, 0, 0 ]);
    assert.equal(range.colour.color, color.toARGB(emitter._debugColor));

    // 1000 from the listener * 0.025 = 25 (the minimum); radius max( 25 * 0.035, 1.5 ) = 1.5 (cpp:171-178).
    assert.equal(arrow.kind, "arrow");
    assert.deepEqual(arrow.start, [ 1000, 0, 0 ]);
    assert.deepEqual(arrow.end, [ 1000, 0, 25 ]);
    assert.equal(arrow.radius, 1.5);
    assert.ok(Math.abs(arrow.pointer - 0.22) < 1e-6);
    assert.equal(arrow.segments, 12);
    assert.equal(arrow.effect, ITr2DebugRenderer2.Effect.Solid);

    assert.equal(text.kind, "text");
    assert.equal(text.font, 0);
    assert.equal(text.text, `engine(${emitter.ID})`);
    assert.equal(text.colour, color.toARGB(emitter._debugColor));
  });
});

test("The arrow length scales with listener distance and clamps at 250 (cpp:171-174)", () =>
{
  WithManager(() =>
  {
    const near = RecordingRenderer(new Set([ DIRECTION ]));
    Emitter("near", [ 4000, 0, 0 ]).RenderDebugInfo(near);
    // 4000 * 0.025 = 100; radius 100 * 0.035 = 3.5.
    const nearArrow = near.calls.find(call => call.kind === "arrow");
    assert.equal(nearArrow.end[2], 100);
    assert.ok(Math.abs(nearArrow.radius - 3.5) < 1e-9);

    const far = RecordingRenderer(new Set([ DIRECTION ]));
    Emitter("far", [ 1e6, 0, 0 ]).RenderDebugInfo(far);
    assert.equal(far.calls.find(call => call.kind === "arrow").end[2], 250);
  });
});

test("Without options nothing is drawn; display-all shows the sphere and the name (cpp:145, 168, 201)", () =>
{
  WithManager(manager =>
  {
    const renderer = RecordingRenderer(new Set());
    Emitter("quiet", [ 1, 2, 3 ]).RenderDebugInfo(renderer);
    assert.equal(renderer.calls.length, 0);

    // g_debugDisplayAllEmitters shows the sphere and the name, not the arrow.
    manager.EnableDebugDisplayAllEmitters();
    const all = RecordingRenderer(new Set());
    Emitter("all", [ 1, 2, 3 ]).RenderDebugInfo(all);
    assert.deepEqual(all.calls.map(call => call.kind), [ "sphere", "text" ]);
  });
});

test("SetAttenuationScalingFactor turns the debug colour red, 0xaaff0000 (cpp:116)", () =>
{
  WithManager(() =>
  {
    const emitter = Emitter("scaled", [ 0, 0, 0 ]);
    emitter.SetAttenuationScalingFactor(1);

    assert.equal(color.toARGB(emitter._debugColor), 0xaaff0000);
  });
});

test("The random debug colour keeps every channel in 0.3..0.9 and opaque (DebugUtilities.cpp:10-16)", () =>
{
  for (let i = 0; i < 50; ++i)
  {
    const [ r, g, b, a ] = new AudEmitter()._debugColor;
    for (const channel of [ r, g, b ]) assert.ok(channel >= Math.fround(0.3) && channel <= 0.9 + 1e-6, `${channel}`);
    assert.equal(a, 1);
  }
});

test("StretchAudio forwards debug options and drawing to source, destination, then stretch (cpp:139-169)", () =>
{
  WithManager(() =>
  {
    const stretch = new StretchAudio();
    stretch.sourceEmitter = Emitter("source", [ 0, 0, 0 ]);
    stretch.destinationEmitter = null;
    stretch.stretchEmitter = Emitter("stretch", [ 5, 0, 0 ]);

    const options = new Set();
    stretch.GetDebugOptions(options);
    assert.deepEqual([ ...options ], [ SPHERE, DIRECTION ]);

    const renderer = RecordingRenderer(new Set([ SPHERE, DIRECTION ]));
    stretch.RenderDebugInfo(renderer);

    const names = renderer.calls.filter(call => call.kind === "text").map(call => call.text.split("(")[0]);
    assert.deepEqual(names, [ "source", "stretch" ]);
  });
});
