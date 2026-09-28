// Skinned hulls animate from the granny file their geometry was read from.
//
// A hull's updater borrows the mesh geometry (EveSpaceObject2.cpp:3180-3199:
// SetUseMeshBinding(true), SetSharedGeometryRes) and animates the granny file
// that geometry keeps - Carbon GetFileInfo answers m_geometryRes->GetGrannyInfo()
// (Tr2GrannyAnimation.cpp:367-389). Our geometry payload is the CMF projection
// of that file, which carries no models[], so an updater reading the payload
// never initialized and skinned hulls drew nothing.
//
// Optional real-file proof. Game bytes are never committed. Fetch these exact
// paths through tools-core at build 3552227 and point SKINNED_GR2_CORPUS_DIR at
// the directory:
//
//   SKINNED_GR2_CORPUS_DIR=path/to/gr2 node --test test/trinity/skinned-hull-animation.test.js
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { TriGeometryRes } from "../../npm/dist/resource/index.js";
import { EveSpaceObject2, EveUpdateContext, Tr2GrannyAnimation, Tr2RenderContext, Tr2RingBuffer } from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";

const CORPUS_DIR = process.env.SKINNED_GR2_CORPUS_DIR || "";

const EXPECTED = new Map(Object.entries({
  "gb1_t1.gr2": [ "77d21351ccad7943c717f7010a174113f0d5b9d5a2e36cf189d854bf8b95c025", "res:/dx9/model/ship/gallente/battleship/gb1/gb1_t1.gr2" ]
}));

/** False when the corpus is present; a present `skip` key reports SKIP whatever its value. */
function corpusSkipReason()
{
  return CORPUS_DIR ? false : "set SKINNED_GR2_CORPUS_DIR to run the skinned-hull corpus proof";
}

async function ReadHull(name)
{
  const bytes = new Uint8Array(await readFile(path.join(CORPUS_DIR, name)));
  const [ sha256, resPath ] = EXPECTED.get(name);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), sha256, `${name} is ${resPath} at build 3552227`);

  const geometry = new TriGeometryRes();
  geometry.SetPayload(geometry.ReadGrannyFile(bytes));
  return geometry;
}

/** What EveSpaceObject2 does with its mesh geometry (cpp:3196-3197). */
function BindToGeometry(geometry)
{
  const animation = new Tr2GrannyAnimation();
  animation.SetUseMeshBinding(true);
  animation.SetSharedGeometryRes(geometry);
  return animation;
}

/** Largest absolute difference between a Float4x3 palette and identity rows. */
function DistanceFromIdentity(palette, count)
{
  const identity = [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0 ];
  let largest = 0;
  for (let bone = 0; bone < count; bone++)
  {
    for (let i = 0; i < 12; i++)
    {
      largest = Math.max(largest, Math.abs(palette[bone * 12 + i] - identity[i]));
    }
  }
  return largest;
}

test("a hull read from a .gr2 animates its granny file, not the CMF payload", { skip: corpusSkipReason() }, async () =>
{
  const geometry = await ReadHull("gb1_t1.gr2");
  assert.equal(geometry.IsUsingCMF(), false);

  const animation = BindToGeometry(geometry);

  assert.equal(animation.IsInitialized(), true, "the granny skeleton was found");
  assert.equal(animation.GetMeshBoneCount(), 9, "the mesh binds 9 of the skeleton's 10 bones");
  assert.deepEqual(animation.GetAnimationNames(), [ "NormalLoop", "Normal2Warp", "Warp", "Warp2Normal" ]);
});

test("at rest the palette is identity, and an animation moves it", { skip: corpusSkipReason() }, async () =>
{
  const animation = BindToGeometry(await ReadHull("gb1_t1.gr2"));
  const count = animation.GetMeshBoneCount();

  // World times inverse bind: identity for every bone at the rest pose.
  assert.ok(DistanceFromIdentity(animation.GetMeshBoneMatrixList(), count) < 1e-4, "rest pose");

  animation.PlayAnimation("Normal2Warp", true, 1, 0, 1);
  animation.Update(2);

  assert.ok(DistanceFromIdentity(animation.GetMeshBoneMatrixList(), count) > 1e-2, "2 s into Normal2Warp the bones have moved");
});

test("a ship binds its updater to the mesh geometry, and geometry still loading binds when it completes", { skip: corpusSkipReason() }, async () =>
{
  const loaded = await ReadHull("gb1_t1.gr2");

  // Carbon's constructor creates the updater (EveSpaceObject2.cpp:214) and
  // SetMesh hands it the mesh geometry (PrepareForAnimation, cpp:3176-3199).
  const geometry = new TriGeometryRes();
  const ship = new EveSpaceObject2();
  ship.SetMesh({ GetGeometryResource: () => geometry });

  assert.equal(ship.animationUpdater.HasMeshBinding(), true);
  assert.equal(ship.animationUpdater.IsInitialized(), false, "nothing loaded yet");

  // The geometry arrives: the updater's notify target rebuilds it
  // (Tr2GrannyAnimation.cpp:293).
  geometry.SetPayload(geometry.ReadGrannyFile(await readFile(path.join(CORPUS_DIR, "gb1_t1.gr2"))));
  geometry.MarkPrepared();

  assert.equal(ship.animationUpdater.IsInitialized(), true, "rebuilt on completion");
  assert.equal(ship.animationUpdater.GetMeshBoneCount(), loaded.GetGrannyInfo().meshes[0].boneBindings.length);
});

test("the ship steps its animation in UpdateSyncronous", { skip: corpusSkipReason() }, async () =>
{
  const geometry = await ReadHull("gb1_t1.gr2");
  const ship = new EveSpaceObject2();
  ship.SetMesh({ GetGeometryResource: () => geometry });
  const updater = ship.animationUpdater;
  const count = updater.GetMeshBoneCount();

  updater.PlayAnimation("Normal2Warp", true, 1, 0, 1);
  const context = new EveUpdateContext();
  // GetDeltaT reads a last time of 0 as no previous frame, so the clock starts at 1 s.
  context.SetTime(1);
  ship.UpdateSyncronous(context);
  const start = Float32Array.from(updater.GetMeshBoneMatrixList());

  // Carbon cpp:560-566 steps it each synchronous update; 2 s later the bones
  // have moved from where the animation started.
  context.SetTime(3);
  ship.UpdateSyncronous(context);
  const now = updater.GetMeshBoneMatrixList();
  let moved = 0;
  for (let i = 0; i < count * 12; i++) moved = Math.max(moved, Math.abs(now[i] - start[i]));
  assert.ok(moved > 1e-2, `2 s of Normal2Warp moved the palette (${moved})`);
});

/** The record's uint32 boneOffsets, read as the integers they are (RawData views floats). */
function BoneOffsets(record)
{
  const view = record.vs.Get("boneOffsets");
  return Array.from(new Uint32Array(view.buffer, view.byteOffset, view.length));
}

/** The BoneTransforms ring over a stub device, as EveSpaceScene.Initialize creates it (EveSpaceScene.cpp:257). */
function BoneRing()
{
  Tr2RingBuffer.ResetInstances();
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();
  al.CreateDevice({ mode: { width: 64, height: 64 } });
  context.SetRenderContextAL(al);
  return Tr2RingBuffer.GetInstance("Float4x3", 48, context);
}

test("GetPerObjectData uploads the palette to the bone ring once per frame and stamps its offsets", { skip: corpusSkipReason() }, async (t) =>
{
  const ring = BoneRing();
  t.after(() => Tr2RingBuffer.ResetInstances());

  const geometry = await ReadHull("gb1_t1.gr2");
  const ship = new EveSpaceObject2();
  ship.SetMesh({ GetGeometryResource: () => geometry });
  const count = ship.animationUpdater.GetMeshBoneCount();

  // Carbon cpp:1419-1440: [current offset, previous offset, bone count].
  assert.deepEqual(BoneOffsets(ship.GetPerObjectData()).slice(0, 3), [ 0, 0, count ], "first frame: both offsets at the first upload");
  assert.equal(ring.head, count, "one palette in the ring");

  // A second call in the same frame (the shadow pass) does not upload again.
  ship.GetShadowPerObjectData();
  assert.equal(ring.head, count);

  // Next frame: UpdateAsyncronous re-arms the upload (cpp:633), before its
  // m_update gate - so with updates off it does only that.
  ship.update = false;
  ship.UpdateAsyncronous(new EveUpdateContext());
  assert.deepEqual(BoneOffsets(ship.GetPerObjectData()).slice(0, 3), [ count, 0, count ], "this frame's rows follow last frame's");
  assert.equal(ring.head, count * 2);
});

test("an unanimated ship stamps Carbon's invalid offsets", () =>
{
  assert.deepEqual(BoneOffsets(new EveSpaceObject2().GetPerObjectData()).slice(0, 2), [ 0xffffffff, 0xffffffff ]);
});
