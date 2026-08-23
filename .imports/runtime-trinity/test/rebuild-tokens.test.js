import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CjsBatchManager,
  EveSpriteSet,
  Tr2Effect,
  Tr2Mesh,
  Tr2MeshArea
} from "../npm/dist/index.js";

import { TriBatchType } from "@carbonenginejs/runtime-utils/graphics";

test("packed attachment sets declare the packedGeometry consequence", () =>
{
  const set = EveSpriteSet.from({});
  assert.ok(set.__state.rebuild.has("packedGeometry"), "armed at construction");

  set.__state.rebuild.clear();
  set.SetValues({ skinned: true });
  assert.ok(set.__state.rebuild.has("packedGeometry"), "declared-field change re-adds");

  set.__state.rebuild.clear();
  set.SetValues({ skinned: true });
  assert.equal(set.__state.rebuild.size, 0, "equal write adds nothing");
});

test("Tr2Effect splits pipeline vs bindings consequences", () =>
{
  const effect = Tr2Effect.from({});
  assert.ok(effect.__state.rebuild.has("pipeline"));
  assert.ok(effect.__state.rebuild.has("bindings"));

  effect.__state.rebuild.clear();
  effect.SetValues({ effectFilePath: "res:/graphics/effect/other.fx" });
  assert.ok(effect.__state.rebuild.has("pipeline"));
  assert.equal(effect.__state.rebuild.has("bindings"), false, "path change is pipeline work only");
});

test("mesh-area child tokens feed the owner-propagation convention", () =>
{
  const mesh = Tr2Mesh.from({});
  const area = Tr2MeshArea.from({});
  mesh.AddArea(TriBatchType.TRIBATCHTYPE_OPAQUE, area);

  // Owner and child both settle (realizer consumed everything).
  mesh.__state.rebuild.clear();
  area.__state.rebuild.clear();
  assert.equal(CjsBatchManager.AnyRebuildWork(mesh, mesh.GetAllAreas()), false);

  // A later CHILD edit alone re-advertises work to the owning realizer.
  area.SetValues({ index: 2 });
  assert.equal(CjsBatchManager.HasRebuildWork(mesh), false, "no upward token copying");
  assert.equal(CjsBatchManager.AnyRebuildWork(mesh, mesh.GetAllAreas()), true,
    "owning realizer sees the child token");
});
