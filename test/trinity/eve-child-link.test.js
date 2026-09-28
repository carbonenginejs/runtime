import test from "node:test";
import assert from "node:assert/strict";
import { EveChildLink } from "../../npm/dist/trinity/index.js";
import { Tr2Mesh } from "../../npm/dist/trinity/core/index.js";

// Carbon keeps ONE m_isVisible, on EveChildMesh (EveChildMesh.h:276).
// EveChildLink::UpdateVisibility (EveChildLink.cpp:154-169) writes it and the
// inherited EveChildMesh::GetRenderables (EveChildMesh.cpp:574) reads it. A
// link that kept its own copy wrote a field GetRenderables never read, so it
// never returned itself: the first case fails against that split.

test("EveChildLink returns itself as a renderable once UpdateVisibility sees a mesh", () =>
{
  const link = new EveChildLink();
  link.display = true;
  link.mesh = new Tr2Mesh();
  link.UpdateVisibility(null, null, 0);
  assert.deepEqual(link.GetRenderables([]), [ link ]);
});

test("negative control: a link with its own visibility copy is never returned", () =>
{
  // The pre-merge shape: UpdateVisibility wrote a private copy that the
  // inherited GetRenderables did not read. The check above must fail on it.
  class SplitLink extends EveChildLink
  {
    #isVisible = false;

    UpdateVisibility()
    {
      this.#isVisible = Boolean(this.display && this.mesh);
    }
  }
  const link = new SplitLink();
  link.display = true;
  link.mesh = new Tr2Mesh();
  link.UpdateVisibility(null, null, 0);
  assert.notDeepEqual(link.GetRenderables([]), [ link ]);
});

test("EveChildLink without a mesh, or with display off, returns nothing", () =>
{
  const bare = new EveChildLink();
  bare.display = true;
  bare.UpdateVisibility(null, null, 0);
  assert.deepEqual(bare.GetRenderables([]), []);

  const hidden = new EveChildLink();
  hidden.mesh = new Tr2Mesh();
  hidden.display = false;
  hidden.UpdateVisibility(null, null, 0);
  assert.deepEqual(hidden.GetRenderables([]), []);
});
