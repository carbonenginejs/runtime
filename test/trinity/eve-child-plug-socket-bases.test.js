// EveChildPlug / EveChildSocket: Carbon's ITr2DebugRenderable, IShaderConfigurer
// and ITr2SoundEmitterOwner bases (EveChildPlug.h:21-32, EveChildSocket.h:21-31).
import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { ITr2DebugRenderable } from "../../npm/dist/global/interfaces/index.js";
import { EveChildPlug, EveChildSocket, EveChildRef, EveChildParticleSystem, ITr2SoundEmitterOwner } from "../../npm/dist/trinity/index.js";

test("plug and socket carry Carbon's three missing bases", () =>
{
  for (const Class of [ EveChildPlug, EveChildSocket ])
  {
    const object = new Class();
    assert.ok(CjsSchema.cast(object, ITr2DebugRenderable), `${Class.name} is ITr2DebugRenderable`);
    assert.ok(CjsSchema.cast(object, ITr2SoundEmitterOwner), `${Class.name} is ITr2SoundEmitterOwner`);
  }
});

test("FindSoundEmitter: the plug asks its objects in order, the socket asks its plug (cpp:486-500, 499-506)", () =>
{
  const plug = new EveChildPlug();
  const emitter = {};
  const first = new EveChildRef();
  first.FindSoundEmitter = () => null;
  const second = new EveChildRef();
  second.FindSoundEmitter = name => (name === "engine" ? emitter : null);
  plug.objects.push(first, second);

  assert.equal(plug.FindSoundEmitter("engine"), emitter);
  assert.equal(plug.FindSoundEmitter("other"), null);

  const socket = new EveChildSocket();
  assert.equal(socket.FindSoundEmitter("engine"), null, "an empty socket has none");
  socket.plug = plug;
  assert.equal(socket.FindSoundEmitter("engine"), emitter);
});

test("debug options and drawing forward to children; hidden plugs and sockets draw nothing (cpp:359-383, 455-477)", () =>
{
  const plug = new EveChildPlug();
  // A debug-renderable child: EveChildParticleSystem inherits ITr2DebugRenderable.
  const child = new EveChildParticleSystem();
  const drawn = [];
  child.GetDebugOptions = options => options.add("child");
  child.RenderDebugInfo = renderer => drawn.push(renderer);
  plug.objects.push(child);

  const socket = new EveChildSocket();
  socket.plug = plug;
  const options = new Set();
  socket.GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ "child" ]);

  const renderer = {};
  socket.RenderDebugInfo(renderer);
  assert.deepEqual(drawn, [ renderer ]);
  socket.display = false;
  socket.RenderDebugInfo(renderer);
  plug.display = false;
  plug.RenderDebugInfo(renderer);
  assert.equal(drawn.length, 1);
});

test("SetShaderOption forwards from socket to plug to every object (cpp:263-270, 402-408)", () =>
{
  const plug = new EveChildPlug();
  const seen = [];
  const child = new EveChildRef();
  child.SetShaderOption = (name, value) => seen.push([ name, value ]);
  plug.objects.push(child);
  const socket = new EveChildSocket();
  socket.plug = plug;
  socket.SetShaderOption("A", "B");
  assert.deepEqual(seen, [ [ "A", "B" ] ]);
});
