import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { parse } from "@babel/parser";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";
import { CjsGraphRoot } from "../../npm/dist/global/model/graph/CjsGraphRoot.js";

// All 86 maintained owner Destruct declarations at runtime089be93feed49cb892dcac51243f1930acab1d39.
// The brief's91 was a stale count; a source AST audit of that revision found these86.
// Keep this integration inventory: moving a body is insufficient if registration loses its hook.
// Cleanup behavior is covered by the reviewed migration commits and owner-specific tests, not this inventory.
const owners = [
  ["ScopedThreadStatus", "blue/services/ScopedThreadStatus.js"],
  ["CjsPaperDoll", "character/application/CjsPaperDoll.js"],
  ["CjsPaperDollComposition", "character/application/composers/CjsPaperDollComposition.js"],
  ["CjsPaperDollCompositor", "character/application/compositor/CjsPaperDollCompositor.js"],
  ["Tr2InteriorCell", "character/incarna/interior/Tr2InteriorCell.js"],
  ["Tr2InteriorStatic", "character/incarna/interior/Tr2InteriorStatic.js"],
  ["Tr2InteriorPlaceable", "character/trinity/interior/Tr2InteriorPlaceable.js"],
  ["Tr2InteriorScene", "character/trinity/interior/Tr2InteriorScene.js"],
  ["Tr2SkinnedModel", "character/trinity/trinityCore/Tr2SkinnedModel.js"],
  ["CjsOverlay2D", "core/overlay/CjsOverlay2D.js"],
  ["VideoPlayer", "core/platform/VideoPlayer.js"],
  ["VideoPlaylistController", "core/platform/VideoPlaylistController.js"],
  ["Tr2MouseCursor", "input/Tr2MouseCursor.js"],
  ["Tr2Blitter", "trinity/core/Tr2Blitter.js"],
  ["Tr2GpuResourcePool", "trinity/core/Tr2GpuResourcePool/Tr2GpuResourcePool.js"],
  ["Tr2ImpostorManager", "trinity/core/Tr2ImpostorManager/Tr2ImpostorManager.js"],
  ["Tr2GrannyAnimation", "trinity/core/animation/Tr2GrannyAnimation.js"],
  ["Tr2TextureAnimation", "trinity/core/animation/Tr2TextureAnimation.js"],
  ["Tr2DynamicBinding", "trinity/core/binding/Tr2DynamicBinding.js"],
  ["Tr2RenderContext", "trinity/core/context/Tr2RenderContext.js"],
  ["Tr2DeviceResource", "trinity/core/device/Tr2DeviceResource.js"],
  ["Tr2GpuBuffer", "trinity/core/device/Tr2GpuBuffer.js"],
  ["Tr2GpuStructuredBuffer", "trinity/core/device/Tr2GpuStructuredBuffer.js"],
  ["Tr2CurveLineSet", "trinity/core/line/Tr2CurveLineSet.js"],
  ["Tr2GrannyPrimitiveSet", "trinity/core/line/Tr2GrannyPrimitiveSet.js"],
  ["Tr2LineSet", "trinity/core/line/Tr2LineSet.js"],
  ["Tr2SolidSet", "trinity/core/line/Tr2SolidSet.js"],
  ["Tr2DirectInstanceData", "trinity/core/mesh/Tr2DirectInstanceData.js"],
  ["Tr2InstancedMesh", "trinity/core/mesh/Tr2InstancedMesh.js"],
  ["Tr2Mesh", "trinity/core/mesh/Tr2Mesh.js"],
  ["Tr2RuntimeInstanceData", "trinity/core/mesh/Tr2RuntimeInstanceData.js"],
  ["Tr2PickBuffer", "trinity/core/scene/Tr2PickBuffer.js"],
  ["Tr2PrimitiveScene", "trinity/core/scene/Tr2PrimitiveScene.js"],
  ["Tr2ManipulationTool", "trinity/core/tool/Tr2ManipulationTool.js"],
  ["Tr2GrannyTrack", "trinity/curves/track/Tr2GrannyTrack.js"],
  ["EveBoosterSet2", "trinity/eve/attachment/booster/EveBoosterSet2.js"],
  ["EveTrailsSet", "trinity/eve/attachment/booster/EveTrailsSet.js"],
  ["EveSpaceObjectDecal", "trinity/eve/attachment/decal/EveSpaceObjectDecal.js"],
  ["EveHazeSet", "trinity/eve/attachment/haze/EveHazeSet.js"],
  ["EveTurretSet", "trinity/eve/attachment/turrets/EveTurretSet.js"],
  ["EveChildBehaviorSystem", "trinity/eve/child/EveChildBehaviorSystem.js"],
  ["EveChildBulletStorm", "trinity/eve/child/EveChildBulletStorm.js"],
  ["EveChildCloud", "trinity/eve/child/EveChildCloud.js"],
  ["EveChildCloud2", "trinity/eve/child/EveChildCloud2.js"],
  ["EveChildLineSet", "trinity/eve/child/EveChildLineSet.js"],
  ["EveCloudEditableVolume", "trinity/eve/child/EveCloudEditableVolume.js"],
  ["EveStarfield", "trinity/eve/effect/EveStarfield.js"],
  ["EveLensflare", "trinity/eve/effect/lensflare/EveLensflare.js"],
  ["EveSpaceScene", "trinity/eve/scene/EveSpaceScene.js"],
  ["EveSpaceSceneRenderDriver", "trinity/eve/scene/EveSpaceSceneRenderDriver.js"],
  ["EvePendingPickingReadback", "trinity/eve/scene/picking/EvePendingPickingReadback.js"],
  ["EvePickingContext", "trinity/eve/scene/picking/EvePickingContext.js"],
  ["EveEllipseSet", "trinity/eve/ui/EveEllipseSet.js"],
  ["EveSpherePin", "trinity/eve/ui/EveSpherePin.js"],
  ["EveSprite2dBracketRenderer", "trinity/eve/ui/EveSprite2dBracketRenderer.js"],
  ["EveLineSet", "trinity/eve/ui/lines/EveLineSet.js"],
  ["EveTacticalTrails", "trinity/eve/ui/tacticalOverlay/EveTacticalTrails.js"],
  ["Tr2GpuParticleSystem", "trinity/particle/Tr2GpuParticleSystem.js"],
  ["Tr2ParticleSystem", "trinity/particle/Tr2ParticleSystem.js"],
  ["Tr2PostProcessRenderer", "trinity/postProcess/Tr2PostProcessRenderer.js"],
  ["Tr2Effect", "trinity/shader/Tr2Effect.js"],
  ["Tr2EffectStateManager", "trinity/shader/Tr2EffectStateManager.js"],
  ["Tr2Sprite2dContainer", "trinity/sprite2d/Tr2Sprite2dContainer.js"],
  ["Tr2Sprite2dContainerBase", "trinity/sprite2d/Tr2Sprite2dContainerBase.js"],
  ["Tr2Sprite2dDisplayList", "trinity/sprite2d/Tr2Sprite2dDisplayList.js"],
  ["Tr2Sprite2dLayer", "trinity/sprite2d/Tr2Sprite2dLayer.js"],
  ["Tr2Sprite2dScene", "trinity/sprite2d/Tr2Sprite2dScene.js"],
  ["Tr2Sprite2dTextObject", "trinity/sprite2d/Tr2Sprite2dTextObject.js"],
  ["Tr2Sprite2dTexture", "trinity/sprite2d/Tr2Sprite2dTexture.js"],
  ["Tr2TexturedSpriteObject", "trinity/sprite2d/Tr2TexturedSpriteObject.js"],
  ["Tr2LockGuard", "trinityal/Tr2LockGuard.js"],
  ["Tr2MemoryCounterAL", "trinityal/Tr2MemoryCounterAL.js"],
  ["Tr2ReadbackAL", "trinityal/Tr2ReadbackAL/Tr2ReadbackAL.js"],
  ["CjsWebgl2VideoColorSampler", "trinityal/webgl2/CjsWebgl2VideoColorSampler.js"],
  ["CjsWebgpuDevice", "trinityal/webgpu/CjsWebgpuDevice.js"],
  ["CjsWebgpuVideoColorSampler", "trinityal/webgpu/CjsWebgpuVideoColorSampler.js"],
  ["CjsWebgpuConstantArena", "trinityal/webgpu/core/CjsWebgpuConstantArena.js"],
  ["CjsWebgpuRenderTarget", "trinityal/webgpu/core/CjsWebgpuRenderTarget.js"],
  ["TnyHangar", "wrap/TnyHangar.js"],
  ["TnyCameraControls", "wrap/cameras/TnyCameraControls.js"],
  ["TnyTransformGizmo", "wrap/gizmos/TnyTransformGizmo.js"],
  ["TnyInputMan", "wrap/input/TnyInputMan.js"],
  ["TnyMobile", "wrap/objects/TnyMobile.js"],
  ["TnySlot", "wrap/objects/TnySlot.js"],
  ["TnySpaceObject", "wrap/objects/TnySpaceObject.js"],
  ["TnyOutlineHelper", "wrap/outline/TnyOutlineHelper.js"]
];

// Four plain helpers deliberately avoid Blue/value exposure; the render target keeps its fluent return.
// Their public-entry behavior is covered by compositor, blitter, sampler and render-target tests.
const delegates = new Set([
  "CjsPaperDollComposition", "CjsPaperDollCompositor", "Tr2Blitter",
  "CjsWebgl2VideoColorSampler", "CjsWebgpuRenderTarget"
]);

for (const [name, file] of owners)
{
  test(`migrated lifetime: ${name} retains its registered own hook and public entry`, async () =>
  {
    const Constructor = (await import(new URL(`../../npm/dist/${file}`, import.meta.url)))[name];
    assert.equal(typeof Constructor, "function");
    const record = CjsGraph._classes.get(Constructor);
    assert.ok(record?.lifetime, "class registration must supply ancestry independent of value exposure");
    const destructor = Object.getOwnPropertyDescriptor(Constructor.prototype, "_Destructor")?.value;
    if (destructor)
    {
      const destructors = CjsGraph._getDestructors(record);
      assert.equal(destructors.filter(value => value === destructor).length, 1, "own destructor appears once in the ancestry");
    }
    // One of ours: its cleanup is its OnDestruct, found by dispatch.
    else assert.equal(typeof Object.getOwnPropertyDescriptor(Constructor.prototype, "OnDestruct")?.value, "function");
    assert.equal(typeof Constructor.prototype.Destruct, "function");
    if (!delegates.has(name)) assert.equal(Constructor.prototype.Destruct, CjsGraphRoot.prototype.Destruct);
    else
    {
      assert.equal(Object.hasOwn(Constructor.prototype, "Destruct"), true);
      const source = await readFile(new URL(`../../src/${file}`, import.meta.url), "utf8");
      const ast = parse(source, { sourceType: "module", plugins: ["classProperties", "classPrivateMethods"] });
      const owner = ast.program.body.map(node => node.declaration ?? node).find(node => node.type === "ClassDeclaration" && node.id.name === name);
      const statements = owner.body.body.find(node => node.type === "ClassMethod" && node.key.name === "Destruct").body.body;
      const fluent = name === "CjsWebgpuRenderTarget";
      assert.equal(statements.length, fluent ? 2 : 1, "delegates contain no cleanup machinery");
      const call = statements[0].expression;
      assert.equal(statements[0].type, "ExpressionStatement");
      assert.equal(call.type, "CallExpression");
      assert.equal(call.callee.type, "MemberExpression");
      assert.equal(call.callee.object.name, "CjsGraph");
      assert.equal(call.callee.property.name, "destruct");
      assert.equal(call.arguments.length, 1);
      assert.equal(call.arguments[0].type, "ThisExpression");
      if (fluent)
      {
        assert.equal(statements[1].type, "ReturnStatement");
        assert.equal(statements[1].argument.type, "ThisExpression");
      }
    }
  });
}
