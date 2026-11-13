import assert from "node:assert/strict";
import test from "node:test";
import { Tr2Sprite2d, Tr2Sprite2dTexture } from "../../npm/dist/trinity/index.js";

test("Sprite2d public destruction inherits both native texture listener removals", t =>
{
  const owner = new Tr2Sprite2d(), peer = new Tr2Sprite2d();
  const primary = new Tr2Sprite2dTexture(), secondary = new Tr2Sprite2dTexture();
  owner.texturePrimary = peer.texturePrimary = primary;
  owner.textureSecondary = peer.textureSecondary = secondary;
  const changed = t.mock.method(owner, "Sprite2dTextureChanged", () => {});
  const peerChanged = t.mock.method(peer, "Sprite2dTextureChanged", () => {});
  primary._SetDirty();
  secondary._SetDirty();
  assert.equal(changed.mock.callCount(), 2);
  owner.Destruct();
  owner.Destruct();
  primary._SetDirty();
  secondary._SetDirty();
  assert.equal(changed.mock.callCount(), 2);
  assert.equal(peerChanged.mock.callCount(), 4);
  assert.equal(Object.hasOwn(Tr2Sprite2d.prototype, "_Destructor"), false);
  assert.equal(owner.texturePrimary, null);
  assert.equal(owner.textureSecondary, null);
});

test("textured sprite base destruction tolerates one texture shared by both slots", t =>
{
  const owner = new Tr2Sprite2d(), peer = new Tr2Sprite2d();
  const texture = new Tr2Sprite2dTexture();
  owner.texturePrimary = owner.textureSecondary = peer.texturePrimary = texture;
  const changed = t.mock.method(owner, "Sprite2dTextureChanged", () => {});
  const peerChanged = t.mock.method(peer, "Sprite2dTextureChanged", () => {});
  texture._SetDirty();
  assert.equal(changed.mock.callCount(), 1, "native identity-set listener is shared by both slots");
  owner.Destruct();
  owner.Destruct();
  texture._SetDirty();
  assert.equal(changed.mock.callCount(), 1);
  assert.equal(peerChanged.mock.callCount(), 2);
  assert.equal(owner.texturePrimary, null);
  assert.equal(owner.textureSecondary, null);
  assert.equal(texture._changeListeners.size, 1);
  peer.Destruct();
  assert.equal(texture._changeListeners.size, 0);
  texture.Destruct();
});
