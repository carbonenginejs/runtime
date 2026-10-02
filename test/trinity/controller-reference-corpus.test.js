import { CjsSchema } from "../../npm/dist/global/schema/index.js";
// Optional offline proof using unmodified copies of indexed Black files.
// Set CONTROLLER_BLACK_CORPUS_DIR to a directory containing the two filenames
// below. Game data is not committed; hashes and sizes pin the inspected inputs.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { blue, CjsResMan } from "../../npm/dist/global/blue/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { EveChildContainer, ExecuteMainThreadActions, Tr2ControllerReference } from "../../npm/dist/trinity/index.js";
import { StubResMan } from "../support/stubResMan.js";

const corpus = process.env.CONTROLLER_BLACK_CORPUS_DIR;

test("real fx_01a loads its stand-alone controller and animates all five rib DiffuseColors", {
  skip: !corpus && "set CONTROLLER_BLACK_CORPUS_DIR for the real Black-file proof"
}, async t =>
{
  const fixtures = [
    [ "angbc1_t1_fx_01a.black", 281768, "d26590b55fe1b1f5d0a1b8fa3628a40b" ],
    [ "ShipStandard_FxStandAlone.black", 1170, "a26ea8e11017eec72e1b5d0a7a264931" ]
  ];
  const bytes = [];
  for (const [ name, size, md5 ] of fixtures)
  {
    const data = await readFile(join(corpus, name));
    assert.equal(data.length, size, name);
    assert.equal(createHash("md5").update(data).digest("hex"), md5, name);
    bytes.push(data);
  }
  const previous = blue.resMan;
  const getActualTime = blue.os.GetActualTime;
  const getFrameTime = blue.os.GetCurrentFrameTime;
  t.after(() =>
  {
    blue.resMan = previous;
    blue.os.GetActualTime = getActualTime;
    blue.os.GetCurrentFrameTime = getFrameTime;
    ExecuteMainThreadActions();
  });
  let ticks = 0;
  blue.os.GetActualTime = () => ticks;
  blue.os.GetCurrentFrameTime = () => ticks;
  let reads = 0;
  const manager = new CjsResMan({ source: { Read(path)
  {
    assert.equal(path.toLowerCase(), "res:/dx9/model/controller/shipstandard_fxstandalone.red");
    reads += 1;
    return bytes[1];
  } } });
  manager.RegisterObjectBuilder("red", input => CjsBlackFormat.createObjectBuilder(input));
  // Meshes, shaders and textures remain unloaded CPU resource handles. Only
  // controller objects use the real manager and Black object-builder route.
  const resourceHandles = new StubResMan();
  manager.GetResource = resourceHandles.GetResource.bind(resourceHandles);
  blue.resMan = manager;
  const root = CjsSchema.from("EveChildContainer", CjsBlackFormat.readPayload(bytes[0]).object);
  root.SetInheritProperties(Array.from({ length: 128 }, () => [ 1, 1, 1, 1 ]));
  root.StartControllers();
  const reference = root.controllers.find(value => value.path?.includes("ShipStandard_FxStandAlone"));
  assert.ok(reference, "real effect carries its own Tr2ControllerReference");
  for (let turn = 0; turn < 100 && !reference.controller; turn += 1)
  {
    manager.PumpMainThreadQueue();
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.ok(reference.controller, "Tr2ControllerReference.cpp:16 loads the referenced controller");
  assert.equal(reference.controller.GetOwner(), root);
  const second = new Tr2ControllerReference();
  second.path = reference.path;
  await second.ResolveController();
  assert.notEqual(second.controller, reference.controller, "cached bytes do not share a live controller");
  assert.equal(reads, 1);

  const containers = [];
  function collect(value)
  {
    containers.push(value);
    for (const child of value.objects ?? []) collect(child);
  }
  collect(root);
  const strips = containers.filter(value => [ "FlowLights_Ribs_fx_01a_", "FlowRibsTop_fx_01a", "FlowLightsBack_fx_01a" ].includes(value.name));
  assert.equal(strips.length, 3);
  const parameters = strips.flatMap(value => value.objects.flatMap(child => child.mesh.additiveAreas.map(area => area.effect.FindParameterByName("DiffuseColor"))));
  assert.equal(parameters.length, 5);
  const range = root.curveSets.find(value => value.name === "ShipStandard_FxStandAlone");
  for (let time = 0; time <= 5; time += 1)
  {
    ticks = time * 10000000;
    for (const container of containers)
    {
      for (const controller of container.controllers ?? []) controller.Update(0);
      for (const curves of container.curveSets ?? []) curves.Update(time);
    }
    ExecuteMainThreadActions();
  }

  for (const parameter of parameters)
  {
    const color = Array.from(parameter.value);
    assert.ok(color.some(value => value > 0), `rib DiffuseColor remains zero: ${color}`);
    assert.ok(color.every(Number.isFinite));
  }
  assert.equal(range.isPlaying, true, "the referenced controller starts the authored range");
  t.diagnostic(`five DiffuseColors at t=5: ${JSON.stringify(parameters.map(value => Array.from(value.value)))}`);
});
