import test from 'node:test';
import assert from 'node:assert/strict';
import {blue,IInitialize,INotify} from '../../npm/dist/global/blue/index.js';
import {CjsSchema} from '../../npm/dist/global/schema/index.js';
import {Tr2ImpostorManager,Tr2QuadRenderer,Tr2Renderer,TriDevice,Tr2VariableStore,Tr2RenderTarget,TriRenderBatchAccumulator,Tr2RenderContext_GetMainThreadRenderContext} from '../../npm/dist/trinity/index.js';
import {Tr2RenderContextALStub,ALResult} from '../../npm/dist/trinityal/index.js';
import {PixelFormat} from '../../npm/dist/global/consts/renderContext/index.js';
import {TR2SHADERMODEL,TriBatchType} from '../../npm/dist/global/consts/graphics/index.js';
import {retireDemoShips} from '../trinityal/webgpu/demo/demoShipLifetime.js';
import {StubResMan} from '../support/stubResMan.js';

function setup(t) {
  const context=Tr2RenderContext_GetMainThreadRenderContext(),oldAL=context.GetRenderContextAL(),oldRes=blue.resMan;
  const oldQuad=Tr2QuadRenderer._instance,oldShader=Tr2Renderer.GetShaderModel(),al=new Tr2RenderContextALStub(),quad=new Tr2QuadRenderer();
  al.CreateDevice();context.SetRenderContextAL(al);blue.resMan=new StubResMan();Tr2QuadRenderer._instance=quad;
  const managers=[];t.after(()=>{for(const m of managers)m.Destroy();quad._vertexBuffer.ReleaseResources();quad._quad?.Destroy();quad._quadIB?.Destroy();Tr2QuadRenderer._instance=oldQuad;Tr2Renderer.SetShaderModel(oldShader);context.SetRenderContextAL(oldAL);blue.resMan=oldRes;al.Destroy();});
  return {context,al,quad,manager(){const m=new Tr2ImpostorManager();managers.push(m);return m;}};
}
function hash(x=1) {return {viewDir:[x,2,3],upDir:[0,1,0]};}
function object(priority=1) {
  return {GetRenderPriority(){return priority;},GetImpostorBoundingSphere(out){out.set([1,2,3,4]);return true;},GetLastImpostorBoundingSphere(out){out.set([5,6,7,8]);}};
}

test('impostor constructor registers distinct effects, native globals and interfaces without allocating an atlas',t=>{
  const {manager,quad}=setup(t),m=manager(),other=manager();
  assert.equal(CjsSchema.cast(m,IInitialize),m);assert.equal(CjsSchema.cast(m,INotify),m);
  assert.equal(CjsSchema.getField(Tr2ImpostorManager,'width').type.kind,'uint32');
  assert.equal(m.itemWidth,32);assert.equal(m.itemHeight,32);assert.equal(m.atlas.IsValid(),false);assert.equal(m.Add(object(),hash()),false);
  assert.notEqual(m._effectKey,other._effectKey);assert.equal(quad.GetEffectRecords().size,2);
  const record=quad.GetEffectRecords().get(m._effectKey);assert.equal(record.instanceSize,36);assert.equal(record.quadCount,1);
  assert.deepEqual(record.definition.items.map(x=>[x.type,x.offset,x.stream,x.instanceStepRate]),[['FLOAT32_1',0,0,0],['FLOAT32_4',0,1,1],['FLOAT32_4',16,1,1],['FLOAT16_2',32,1,1]]);
  const store=Tr2VariableStore.globalStore();assert.equal(store.FindVariable('ImposterAtlasMap').GetValue(),other.atlas);
  assert.deepEqual([...store.FindVariable('ImposterItemSize').GetValue()],[0,0,0,0]);
  m.__init__();assert.equal(m.itemWidth,16);assert.equal(m.atlas.IsValid(),true);
});

test('coalesced size edits reset once and allocate native surfaces; update budget alone has no notification',t=>{
  const {manager,context}=setup(t),m=manager();m.Create(64,32,16,8);m.BeginUpdate();assert.equal(m.Add(object(),hash()),true);
  const init=t.mock.method(m,'Initialize'),create=t.mock.method(context,'CreateTexture');
  CjsSchema.setValues(m,{width:128,height:64,itemWidth:32,itemHeight:16});
  assert.equal(init.mock.callCount(),1);assert.equal(create.mock.callCount(),3);assert.equal(m.count,0);
  assert.equal(m.atlas.GetWidth(),128);assert.equal(m.atlas.GetHeight(),64);assert.equal(m.atlas.format,PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
  assert.equal(m._itemRt.GetWidth(),512);assert.equal(m._ds.GetWidth(),512);assert.equal(m._ds.GetHeight(),16);
  CjsSchema.setValues(m,{maxUpdates:3});assert.equal(init.mock.callCount(),1);assert.equal(m._itemRt.GetWidth(),512);
  m.SetItemSize(32,16);assert.equal(init.mock.callCount(),1);m.SetItemSize(16,16);assert.equal(init.mock.callCount(),2);assert.equal(m._itemRt.GetWidth(),48);
  Tr2Renderer.SetShaderModel(TR2SHADERMODEL.TR2SM_3_0_LO);m.PrepareResources();assert.equal(m._ds.GetTexture().GetFormat(),PixelFormat.PIXEL_FORMAT_D24_UNORM_S8_UINT);
  Tr2Renderer.SetShaderModel(TR2SHADERMODEL.TR2SM_3_0_DEPTH);m.PrepareResources();assert.equal(m._ds.GetTexture().GetFormat(),PixelFormat.PIXEL_FORMAT_D24_UNORM_S8_UINT);
});

test('atlas pool reserves backwards, copies returned coordinates and rejects invalid tile dimensions',()=>{
  const pool=new Tr2ImpostorManager.ImpostorAtlas(),coord=new Uint16Array(2);pool.Resize(4,4,2,2);
  assert.equal(pool.Reserve(coord),true);assert.deepEqual([...coord],[0x3900,0x3900]);
  pool.Drop(coord);coord.fill(0);pool.Reserve(coord);assert.deepEqual([...coord],[0x3900,0x3900]);
  pool.Reserve(coord);assert.deepEqual([...coord],[0x3000,0x3900]);pool.Reserve(coord);pool.Reserve(coord);assert.equal(pool.Reserve(coord),false);
  pool.Resize(3,2,4,2);assert.equal(pool.Reserve(coord),false);assert.throws(()=>pool.Resize(4,4,0,2),RangeError);
});

test('new objects consume the budget first, then existing objects compete by descending priority',t=>{
  const {manager,context}=setup(t),m=manager();m.maxUpdates=2;m.Create(4,4,2,2);
  const a=object(5),b=object(10),c=object(1),input=hash(4);m.BeginUpdate();assert.equal(m.Add(a,input),true);assert.equal(m.Add(b,hash()),true);assert.equal(m.Add(c,hash()),false);
  input.viewDir[0]=99;assert.equal(m._objects.get(a).hash.viewDir[0],4);
  m.EndUpdate();m.BeginUpdateAtlas(context);m.EndUpdateAtlas(context);assert.equal(m._objects.get(a).oldHash.viewDir[0],4);
  m.BeginUpdate();assert.equal(m.Add(a,hash(7)),true);assert.equal(m.Add(b,hash()),true);assert.equal(m.Add(c,hash()),true);m.EndUpdate();assert.deepEqual(m._renderQueue,[c,b]);
  assert.equal(m._objects.get(a).oldHash.viewDir[0],4);assert.equal(m.count,3);
  const dropped=[...m._objects.get(c).texcoord];m.BeginUpdate();m.Add(b,hash());m.EndUpdate();assert.equal(m.count,1);
  m.BeginUpdate();const d=object();m.Add(b,hash());m.Add(d,hash());assert.deepEqual([...m._objects.get(d).texcoord],dropped);
});

test('billboards pack 36 bytes and reach the real quad upload and instanced batch path',t=>{
  const {manager,quad,context}=setup(t),m=manager();m.Create(4,4,2,2);m.BeginUpdate();m.Add(object(),hash());m.EndUpdate();
  const record=quad.GetEffectRecords().get(m._effectKey),bytes=record.pending[0],view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  assert.equal(bytes.byteLength,36);assert.deepEqual(Array.from({length:8},(_,i)=>view.getFloat32(i*4,true)),[1,2,3,4,5,6,7,8]);
  assert.equal(view.getUint16(32,true),0x3900);assert.equal(view.getUint16(34,true),0x3900);
  t.mock.method(m.effect,'GetShaderStateInterface',()=>({GetSortValue:()=>1}));quad.BeginRendering(context);const batches=new TriRenderBatchAccumulator();quad.GetBatches(TriBatchType.TRIBATCHTYPE_OPAQUE,batches);
  assert.equal(batches.GetBatchCount(),1);const batch=batches.GetBatches()[0];assert.equal(batch.instanceCount,1);assert.equal(batch.indexCountPerInstance,6);
  assert.equal(record.count,1);assert.equal(batch.vertexStreams[1],quad._vertexBuffer.GetBuffer());quad.DoneRendering(context);
  const store=Tr2VariableStore.globalStore();assert.equal(store.FindVariable('ImposterAtlasMap').GetValue(),m.atlas);assert.deepEqual([...store.FindVariable('ImposterItemSize').GetValue()],[.5,.5,0,0]);
});

test('atlas capture clears once, restores targets, selects viewports and copies decoded half-float destinations',t=>{
  const {manager,context}=setup(t),m=manager();m.maxUpdates=2;m.Create(10000,32,32,32);
  const background=new Tr2RenderTarget();background.Create(8,8,1,PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);t.after(()=>background.Destroy());context.GetEffectStateManager().SetRenderTarget(0,background.GetRenderTarget());
  const clear=t.mock.method(context,'Clear'),copy=t.mock.method(m.atlas.GetRenderTarget(),'CopySubresourceRegion');
  m.BeginUpdateAtlas(context);assert.equal(clear.mock.callCount(),0);assert.equal(m._atlasDirty,true);
  const a=object();m.BeginUpdate();m.Add(a,hash(7));m.EndUpdate();m.BeginUpdateAtlas(context);
  assert.equal(clear.mock.callCount(),2);assert.equal(clear.mock.calls[1].arguments[0].depth,0);
  assert.equal(m.BeginImpostorUpdate(0,context),a);assert.equal(m.BeginImpostorUpdate(1,context),null);assert.equal(m.BeginImpostorUpdate(-1,context),null);
  assert.equal(context.GetEffectStateManager().GetViewport().width,32);m.EndImpostorUpdate(0,context);m.EndUpdateAtlas(context);
  assert.equal(copy.mock.callCount(),1);assert.equal(copy.mock.calls[0].result,0);
  const [dst,source,src]=copy.mock.calls[0].arguments;assert.equal(dst.m_box.left,9951,'native half rounding shifts this non-power-of-two destination');assert.equal(dst.m_box.right,9983);assert.equal(dst.m_box.top,0);assert.equal(source,m._itemRt.GetRenderTarget());assert.equal(src.m_box.left,0);assert.equal(src.m_box.right,32);
  assert.equal(m._objects.get(a).oldHash.viewDir[0],7);assert.equal(context.GetRenderTargetSize(0).width,8);
  m.BeginUpdateAtlas(context);m.EndUpdateAtlas(context);assert.equal(clear.mock.callCount(),3,'only the capture strip clears again');
});

test('failed allocation stays invalid and device-gated preparation recovers',t=>{
  const {manager,context,al}=setup(t),m=manager();m.width=16;m.height=16;m.itemWidth=8;m.itemHeight=8;
  const fail=t.mock.method(context,'CreateTexture',()=>null);assert.equal(m.Initialize(),true);assert.equal(m.atlas.IsValid(),false);assert.equal(m.Add(object(),hash()),false);
  fail.mock.restore();al.Destroy();const create=t.mock.method(context,'CreateTexture');assert.equal(m.PrepareResources(),true);assert.equal(create.mock.callCount(),0);
  al.CreateDevice();m.PrepareResources();assert.equal(m.atlas.IsValid(),true);assert.equal(m._ds.IsValid(),true);
});

test('reset preserves the native pending queue until BeginUpdate, and release is genuinely empty',t=>{
  const {manager}=setup(t),m=manager();m.Create(8,8,4,4);m.BeginUpdate();m.Add(object(),hash());m.Reset();
  assert.equal(m.count,0);assert.equal(m.GetRenderQueueLength(),1);m.BeginUpdate();assert.equal(m.GetRenderQueueLength(),0);
  const texture=m.atlas.GetRenderTarget();m.ReleaseResources();assert.equal(m.atlas.GetRenderTarget(),texture);assert.equal(texture.IsValid(),true);
});

test('retirement unregisters managers and effects, releases wrappers once and preserves another manager global binding',t=>{
  const {manager,quad}=setup(t),m=manager(),other=manager();m.Create(8,8,4,4);const surfaces=[m.atlas.GetRenderTarget(),m._itemRt.GetRenderTarget(),m._ds.GetDepthStencil()];
  const destroys=surfaces.map(x=>t.mock.method(x,'Destroy')),effect=t.mock.method(m.effect,'Destroy');assert.ok(TriDevice.GetResourcesRegistered().includes(m));
  m.Destroy();m.Destroy();assert.equal(effect.mock.callCount(),1);assert.ok(destroys.every(x=>x.mock.callCount()===1));assert.equal(quad.GetEffectRecords().has(m._effectKey),false);
  assert.equal(TriDevice.GetResourcesRegistered().includes(m),false);assert.equal(Tr2VariableStore.globalStore().FindVariable('ImposterAtlasMap').GetValue(),other.atlas);
});


test('demo retirement releases an impostor owner while retaining its effect shared by a live graph',t=>{
  const {manager,quad}=setup(t),m=manager(),other=manager();other.effect=m.effect;
  const shared=t.mock.method(m.effect,'Destroy'),otherDefault=[...other._ownedEffects][0],otherDestroy=t.mock.method(otherDefault,'Destroy');
  retireDemoShips([m],[other]);assert.equal(quad.GetEffectRecords().has(m._effectKey),false);assert.equal(shared.mock.callCount(),0);
  retireDemoShips([other],[]);assert.equal(shared.mock.callCount(),1);assert.equal(otherDestroy.mock.callCount(),1);assert.equal(quad.GetEffectRecords().size,0);
});


test('a source without bounds gets fresh zero sphere storage rather than the previous instance',t=>{
  const {manager,quad}=setup(t),m=manager();m.Create(8,8,4,4);m.BeginUpdate();m.Add(object(),hash());
  m.Add({GetImpostorBoundingSphere(){return false;},GetLastImpostorBoundingSphere(out){out[0]=9;}},hash());m.EndUpdate();
  const bytes=quad.GetEffectRecords().get(m._effectKey).pending[1],view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  assert.deepEqual(Array.from({length:8},(_,i)=>view.getFloat32(i*4,true)),[0,0,0,0,9,0,0,0]);
});


test('a failed capture-strip allocation keeps native failed-copy behavior without dereferencing null',t=>{
  const {manager,context}=setup(t),m=manager(),create=context.CreateTexture.bind(context);let calls=0;
  t.mock.method(context,'CreateTexture',(...args)=>++calls===2?null:create(...args));m.Create(16,16,8,8);
  assert.equal(m.atlas.IsValid(),true);assert.equal(m._itemRt.IsValid(),false);m.BeginUpdate();const a=object();m.Add(a,hash(6));m.EndUpdate();
  const copy=t.mock.method(m.atlas.GetRenderTarget(),'CopySubresourceRegion');m.BeginUpdateAtlas(context);m.EndUpdateAtlas(context);
  assert.equal(copy.mock.calls[0].result,ALResult.E_INVALIDARG);assert.equal(m._objects.get(a).oldHash.viewDir[0],6);assert.equal(context.GetStackSizeDS(),0);
});
