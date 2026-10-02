import assert from 'node:assert/strict';
import test from 'node:test';
import {blue,INotify,IInitialize,NotifyModified} from '../../../npm/dist/global/blue/index.js';
import {CjsSchema} from '../../../npm/dist/global/schema/index.js';
import {Tr2InteriorScene} from '../../../npm/dist/character/index.js';
import {Tr2RenderContext,Tr2RenderContext_GetMainThreadRenderContext} from '../../../npm/dist/trinity/index.js';
import {Tr2RenderContextALStub} from '../../../npm/dist/trinityal/index.js';
import {PixelFormat,Tr2GpuUsage} from '../../../npm/dist/global/consts/renderContext/index.js';
import {ResourceRequirement} from '../../../npm/dist/resource/index.js';
import {StubResMan} from '../../support/stubResMan.js';

function setup(t) {
  const context=Tr2RenderContext_GetMainThreadRenderContext(),oldAL=context.GetRenderContextAL(),oldManager=blue.resMan;
  const al=new Tr2RenderContextALStub();al.CreateDevice();context.SetRenderContextAL(al);blue.resMan=new StubResMan();
  const scenes=[];t.after(()=>{for(const scene of scenes)scene.Destroy();context.SetRenderContextAL(oldAL);blue.resMan=oldManager;al.Destroy();});
  return {context,al,manager:blue.resMan,scene:()=>{const scene=new Tr2InteriorScene();scenes.push(scene);return scene;}};
}

test('interior scene initialization acquires only its cubemap and preserves the assigned effect',t=>{
  const {scene,manager}=setup(t),s=scene(),effect={};s.backgroundCubemapPath='res:/environment.dds';s.backgroundEffect=effect;
  assert.equal(CjsSchema.cast(s,IInitialize),s);assert.equal(CjsSchema.cast(s,INotify),s);assert.equal(s.Initialize(),true);
  assert.equal(s.backgroundCubemapRes,manager.resources.get('res:/environment.dds'));
  assert.equal(manager.requests[0].options.requirement,ResourceRequirement.TEXTURE);assert.equal(s.backgroundEffect,effect);
  assert.deepEqual(s.lightRenderTargets,[]);assert.equal(s._lightDepthStencil,null);
  CjsSchema.setValues(s,{backgroundCubemapPath:''});assert.equal(s.backgroundCubemapRes,null);assert.equal(manager.requests.length,1);
});

test('coalesced background, count and size edits acquire once and allocate final shadow dimensions once',t=>{
  const {scene,context,manager}=setup(t),s=scene();s.lights=[{}, {}, {}];
  const notify=t.mock.method(s,'OnModified'),setupMaps=t.mock.method(s,'SetupShadowMaps'),create=t.mock.method(context,'CreateTexture');
  CjsSchema.setValues(s,{backgroundCubemapPath:'res:/sky.dds',shadowCount:2,shadowSize:64});
  assert.equal(notify.mock.callCount(),1);assert.equal(setupMaps.mock.callCount(),1);assert.equal(create.mock.callCount(),3);
  assert.equal(s.backgroundCubemapRes,manager.resources.get('res:/sky.dds'));assert.equal(s.lightRenderTargets.length,2);
  for(const target of s.lightRenderTargets) {
    assert.equal(target.IsValid(),true);assert.equal(target.GetWidth(),64);assert.equal(target.GetHeight(),64);
    assert.equal(target.name,'ShadowMap');assert.equal(target.format,PixelFormat.PIXEL_FORMAT_R32_FLOAT);assert.equal(target.mipCount,1);
    assert.equal(target.multiSampleType,1);assert.ok(target.GetTexture().GetGpuUsage()&Tr2GpuUsage.RENDER_TARGET);
  }
  assert.equal(s._lightDepthStencil.IsValid(),true);assert.equal(s._lightDepthStencil.GetWidth(),64);
  assert.equal(s._lightDepthStencil.GetTexture().GetFormat(),PixelFormat.PIXEL_FORMAT_D32_FLOAT);
  const depthCall=create.mock.calls.at(-1).arguments;
  assert.equal(depthCall[1].msaa.samples,1,'shared MSAA description normalizes native zero to one sample');
  CjsSchema.setValues(s,{shadowCount:2,shadowSize:64});assert.equal(setupMaps.mock.callCount(),1);
});

test('shadow allocation follows list length and count even when shadow rendering is disabled',t=>{
  const {scene}=setup(t),s=scene();s.shadowSize=32;s.shadowCount=7;s.lights=[{castShadows:false},{}];s.renderShadows=false;
  s.SetupShadowMaps();assert.equal(s.lightRenderTargets.length,2);
  const oldTargets=s.lightRenderTargets.slice(),oldDepth=s._lightDepthStencil;
  s.shadowCount=0;NotifyModified(s,'shadowCount');assert.equal(s.lightRenderTargets.length,0);
  assert.ok(oldTargets.every(target=>!target.IsValid()));assert.equal(oldDepth.IsValid(),false);
  assert.equal(s._lightDepthStencil.IsValid(),true,'zero targets still owns a depth surface');
  s.lights=[];s.shadowCount=4;s.SetupShadowMaps();assert.equal(s.lightRenderTargets.length,0);assert.equal(s._lightDepthStencil.IsValid(),true);
});

test('unrelated native notified members do not recreate shadow targets',t=>{
  const {scene}=setup(t),s=scene();s.shadowSize=32;s.lights=[{}];s.SetupShadowMaps();
  const target=s.lightRenderTargets[0],depth=s._lightDepthStencil,setupMaps=t.mock.method(s,'SetupShadowMaps');
  CjsSchema.setValues(s,{renderShadows:false,optimizeShadows:false,debugRenderShadowMaps:true,visualizeMethod:1});
  assert.equal(setupMaps.mock.callCount(),0);assert.equal(s.lightRenderTargets[0],target);assert.equal(s._lightDepthStencil,depth);
});

test('shadow rebuild and final destruction release old AL surfaces exactly once',t=>{
  const {scene}=setup(t),s=scene();s.shadowSize=32;s.lights=[{}];s.SetupShadowMaps();
  const target=s.lightRenderTargets[0],depth=s._lightDepthStencil;
  const targetDestroy=t.mock.method(target.GetRenderTarget(),'Destroy'),depthDestroy=t.mock.method(depth.GetDepthStencil(),'Destroy');
  s.SetupShadowMaps();assert.equal(targetDestroy.mock.callCount(),1);assert.equal(depthDestroy.mock.callCount(),1);
  const nextTarget=s.lightRenderTargets[0],nextDepth=s._lightDepthStencil;s.Destroy();s.Destroy();
  assert.equal(nextTarget.IsValid(),false);assert.equal(nextDepth.IsValid(),false);assert.deepEqual(s.lightRenderTargets,[]);assert.equal(s._lightDepthStencil,null);
});

test('allocation failures leave invalid wrappers and the next rebuild can recover',t=>{
  const {scene,context}=setup(t),s=scene();s.shadowSize=32;s.lights=[{}];
  const fail=t.mock.method(context,'CreateTexture',()=>null);s.SetupShadowMaps();
  assert.equal(s.lightRenderTargets.length,1);assert.equal(s.lightRenderTargets[0].IsValid(),false);assert.equal(s._lightDepthStencil.IsValid(),false);
  fail.mock.restore();s.SetupShadowMaps();assert.equal(s.lightRenderTargets[0].IsValid(),true);assert.equal(s._lightDepthStencil.IsValid(),true);
});

test('shadow allocation can use a supplied context without consulting the installed context',t=>{
  const {scene,context}=setup(t),s=scene(),al=new Tr2RenderContextALStub(),other=new Tr2RenderContext();
  al.CreateDevice();other.SetRenderContextAL(al);t.after(()=>al.Destroy());
  t.mock.method(context,'CreateTexture',()=>{throw Error('installed context used');});
  s.shadowSize=16;s.lights=[{}];s.SetupShadowMaps(other);assert.equal(s.lightRenderTargets[0].IsValid(),true);assert.equal(s._lightDepthStencil.IsValid(),true);
});

test('cubemap acquisition uses the supplied host and clears the old reference before a failed request',t=>{
  const {scene}=setup(t),s=scene(),host=new StubResMan();s.backgroundCubemapPath='res:/cube.dds';
  s.SetBackgroundCubemapResPath(host);const old=s.backgroundCubemapRes;assert.ok(old);
  assert.equal(host.requests.length,1);s.backgroundCubemapPath='res:/broken.dds';
  assert.throws(()=>s.SetBackgroundCubemapResPath({GetResource(){throw Error('request failed');}}),/request failed/);
  assert.equal(s.backgroundCubemapRes,null);assert.equal(old.IsGood(),false,'shared resource is not destroyed by replacement');
});
