import test from "node:test";
import assert from "node:assert/strict";
import { Tr2InteriorScene } from "../../../npm/dist/character/index.js";
import { TriDevice, Tr2Renderer, Tr2VariableStore, Tr2RenderTarget } from "../../../npm/dist/trinity/index.js";
import { TriVariableContentType } from "../../../npm/dist/trinity/generated/trinityCore/enums.js";
import { TriStorageFlags } from "../../../npm/dist/global/consts/graphics/trinityEnums.js";
import { StubContext } from "../../support/stubContext.js";

test("public interior teardown releases owned shadows before unregistering its device base", t =>
{
    const scene = new Tr2InteriorScene(), order = [];
    TriDevice.RegisterResource(scene);
    const unregister = TriDevice.UnregisterResource;
    t.mock.method(TriDevice, "UnregisterResource", function(resource)
    {
        if (resource === scene) order.push("base");
        return unregister.call(this, resource);
    });
    const target = new Tr2RenderTarget();
    t.mock.method(target, "Destroy", () => order.push("shadow"));
    scene.lightRenderTargets.Append(target);
    scene.Destruct();
    scene.Destruct();
    assert.deepEqual(order, ["shadow", "base"], "the second Destruct answers false and repeats nothing");
    assert.equal(scene.lightRenderTargets.length, 0);
    assert.equal(TriDevice.GetResourcesRegistered().includes(scene), false);
    assert.equal(scene.IsGood(), false, "final scene teardown must not re-register the device resource");
});

for (const path of ["picking", "forward"])
{
    test(`interior ${path} use renews and rebuilds per-frame buffers after ALL release`, t =>
    {
        const scene = new Tr2InteriorScene();
        const context = StubContext();
        const time = TriDevice.activeTime;
        t.after(() => { TriDevice.activeTime = time; TriDevice.UnregisterResource(scene); });
        t.mock.method(Tr2Renderer, "IsResourceCreationAllowed", () => true);
        // Isolate scene population/visibility; the real consumer still uploads and binds both AL buffers.
        t.mock.method(scene, "_PopulatePerFramePSData", () => {});
        t.mock.method(scene, "_PopulatePerFrameVSData", () => {});
        if (path === "forward")
        {
            Tr2VariableStore.globalStore().RegisterVariableInternal("EnvMap1", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, null);
            scene._renderBackgroundCubeMap = false;
            for (const method of ["_RenderShadows", "VisibilityQuery", "_GatherFullForwardBatches", "_RenderGeometry"])
                t.mock.method(scene, method, () => {});
        }
        const use = () => path === "picking" ? scene.SetPerFrameDataForPicking(context) : scene._RenderFullForward(context);
        assert.equal(TriDevice.GetResourcesRegistered().includes(scene), false);
        use();
        assert.equal(TriDevice.GetResourcesRegistered().includes(scene), true);
        const ps = scene._perFramePSBuffer, vs = scene._perFrameVSBuffer;
        assert.equal(ps.IsValid(), true);
        assert.equal(vs.IsValid(), true);
        TriDevice.activeTime += 10000000;
        use();
        assert.equal(scene._stamp, TriDevice.activeTime);
        scene.ReleaseResources(TriStorageFlags.TRISTORAGE_VIDEOMEMORY);
        scene.ReleaseResources(TriStorageFlags.TRISTORAGE_MANAGEDMEMORY);
        assert.equal(ps.IsValid(), true, "native release requires ALL, not either partial mask");
        assert.equal(vs.IsValid(), true);
        scene.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
        assert.equal(ps.IsValid(), false);
        assert.equal(vs.IsValid(), false);
        assert.equal(scene.PrepareResources(), true);
        assert.equal(scene._perFramePSBuffer.IsValid(), false, "preparation is native no-op; normal use allocates");
        use();
        assert.equal(scene._perFramePSBuffer.IsValid(), true);
        assert.equal(scene._perFrameVSBuffer.IsValid(), true);
        scene.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
    });
}
