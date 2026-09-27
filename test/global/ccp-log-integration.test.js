import test from "node:test";
import assert from "node:assert/strict";
import * as CcpLog from "../../npm/dist/global/logging/ccpLog.js";
import { CcpLog as PublicLog } from "../../npm/dist/global/index.js";
import { HostBitmap } from "../../npm/dist/global/imageio/HostBitmap.js";
import { Tr2TexturePipelineStepLoad } from "../../npm/dist/resource/texture/Tr2TexturePipelineStepLoad.js";
import { Tr2TexturePipelineStepPack } from "../../npm/dist/resource/texture/Tr2TexturePipelineStepPack.js";
import { PixelFormat } from "../../npm/dist/global/consts/renderContext/index.js";

test("public CcpLog and resource/image diagnostics share the host-injected sink", () =>
{
    assert.equal(PublicLog.RegisterLogEcho, CcpLog.RegisterLogEcho);
    const records = [];
    const sink = (channel, type, userData, message) => records.push({ channel, type, userData, message });
    PublicLog.UnregisterLogEcho(PublicLog.LogToDebugger);
    PublicLog.RegisterLogEcho(sink);
    try
    {
        const invalid = new HostBitmap();
        assert.equal(invalid.Create(0, 4, 1, PixelFormat.PIXEL_FORMAT_R8_UNORM), false);
        assert.equal(records.at(-1).type, CcpLog.LogType.LOGTYPE_WARN);
        assert.match(records.at(-1).message, /invalid parameters: 0 x 4/);
        assert.equal(invalid.GetAverageColor(), null);
        assert.equal(records.at(-1).message, "GetAverageColor: bitmap is not valid");
        const load = new Tr2TexturePipelineStepLoad();
        load.path = "res:/missing%name.dds";
        assert.equal(load.Execute(invalid, new Map()), false);
        assert.equal(records.at(-1).channel.facility, "trinity");
        assert.equal(records.at(-1).channel.object, "TexturePipeline");
        assert.equal(records.at(-1).message, "Tr2TexturePipelineStepLoad: failed to get input texture res:/missing%name.dds");
        const count = records.length;
        const input = new HostBitmap();
        assert.equal(input.Create(2, 2, 1, PixelFormat.PIXEL_FORMAT_R8_UNORM), true);
        assert.equal(load.Execute(invalid, new Map([[load.path, input]])), true);
        assert.equal(records.length, count, "valid empty-output load should not report a failure");
        assert.equal(load.Execute(invalid, new Map([[load.path, input]])), true);
        assert.equal(records.at(-1).type, CcpLog.LogType.LOGTYPE_WARN);
        assert.equal(records.at(-1).message, "Tr2TexturePipelineStepLoad: output bitmap is not empty");
        const pack = new Tr2TexturePipelineStepPack();
        pack.format = -1;
        assert.equal(pack.Execute(new HostBitmap(), new Map()), false);
        assert.equal(records.at(-1).type, CcpLog.LogType.LOGTYPE_ERR);
        assert.equal(records.at(-1).channel.object, "TexturePipeline");
    }
    finally
    {
        PublicLog.UnregisterLogEcho(sink);
        PublicLog.RegisterLogEcho(PublicLog.LogToDebugger);
    }
});

test("device failure and expression parse diagnostics reach the same host sink", async t =>
{
    const { TriDevice, Tr2RenderContext_GetMainThreadRenderContext } = await import("../../npm/dist/trinity/index.js");
    const { Tr2RenderContextALStub, ALResult } = await import("../../npm/dist/trinityal/index.js");
    const { EveSmartLightAttributeModifierExpressionBucket } = await import("../../npm/dist/trinity/eve/smartLights/attributeModifiers/EveSmartLightAttributeModifierExpressionBucket.js");
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    const previous = context.GetRenderContextAL();
    const backend = new Tr2RenderContextALStub();
    const records = [];
    const sink = (channel, type, userData, message) => records.push({ channel, type, message });
    context.SetRenderContextAL(backend);
    t.mock.method(backend, "SetPresentParameters", () => ALResult.E_FAIL);
    CcpLog.UnregisterLogEcho(CcpLog.LogToDebugger);
    CcpLog.RegisterLogEcho(sink);
    try
    {
        assert.equal(new TriDevice().SetPresentParameters(0, { software: false }), false);
        assert.equal(records.at(-1).type, CcpLog.LogType.LOGTYPE_ERR);
        assert.equal(records.at(-1).message, "Device Reset failed: 0x80004005");
        new EveSmartLightAttributeModifierExpressionBucket().SetExpression("(");
        assert.match(records.at(-1).message, /SetExpression invalid expression "\(":/);
    }
    finally
    {
        context.SetRenderContextAL(previous);
        CcpLog.UnregisterLogEcho(sink);
        CcpLog.RegisterLogEcho(CcpLog.LogToDebugger);
    }
});
