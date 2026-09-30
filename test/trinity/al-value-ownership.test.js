import assert from 'node:assert/strict';
import test from 'node:test';
import {Tr2RenderContextALStub,Tr2TextureAL,Tr2BufferAL,Tr2BufferDescriptionAL,Tr2BitmapDimensions,Tr2TextureSubresource,ALResult} from '../../npm/dist/trinityal/index.js';
import {Tr2TextureReference,Tr2RuntimeGpuBuffer,Tr2Effect,Tr2GpuResourcePool} from '../../npm/dist/trinity/index.js';
import {Tr2GpuUsage,Tr2CpuUsage,TextureType,PixelFormat} from '../../npm/dist/global/consts/renderContext/index.js';
function context(){const al=new Tr2RenderContextALStub();al.CreateDevice();return al;}
function texture(al){return al.CreateTexture(Tr2BitmapDimensions.texture2D(4,4,1,PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM),{gpuUsage:Tr2GpuUsage.RENDER_TARGET|Tr2GpuUsage.SHADER_RESOURCE,cpuUsage:Tr2CpuUsage.READ});}
const bufferDesc=()=>Tr2BufferDescriptionAL.FromStride(4,16,Tr2GpuUsage.VERTEX_BUFFER,Tr2CpuUsage.WRITE|Tr2CpuUsage.READ);

test('texture copies retain one registered implementation through final owner release',()=>{
 const al=context(),a=texture(al),b=new Tr2TextureAL({copy:a}),implementation=a.TrinityALImpl_GetObject();
 assert.notEqual(a,b);assert.ok(a.Equals(b));assert.ok(implementation.IsRegistered());
 a.Destroy();assert.equal(a.IsValid(),false);assert.ok(b.IsValid());assert.ok(implementation.IsRegistered());
 b.Destroy();assert.equal(implementation.IsValid(),false);assert.equal(implementation.IsRegistered(),false);al.Destroy();
});
test('shared description inputs and recreation cannot corrupt a surviving buffer',()=>{
 const al=context(),desc=bufferDesc(),a=al.CreateBuffer(desc),b=al.CreateBuffer(desc),copy=new Tr2BufferAL({copy:a});
 assert.equal(a.GetSize(),64);a.Destroy();assert.equal(desc.count,16);assert.equal(b.GetSize(),64);assert.equal(copy.GetSize(),64);
 assert.equal(copy.Create(copy.GetDesc(),null,al),ALResult.S_OK);assert.equal(copy.GetSize(),64);assert.ok(b.MapForReading(al).data);
 b.Destroy();copy.Destroy();al.Destroy();
});
test('owned providers and effects release only their own value shares',()=>{
 const al=context(),value=texture(al),implementation=value.TrinityALImpl_GetObject(),reference=new Tr2TextureReference();
 reference.SetTexture(value);reference.SetTexture(reference.GetTexture());
 const effect=new Tr2Effect();effect.SetParameter('ColorMap',value);value.Destroy();
 assert.ok(reference.GetTexture().IsValid());assert.ok(implementation.IsValid());
 effect.ClearAllResources();assert.ok(implementation.IsValid());reference.SetTexture(null);
 assert.equal(implementation.IsRegistered(),false);effect.Destroy();al.Destroy();
});
test('effect final teardown preserves a caller-owned provider',()=>{
 const al=context(),value=texture(al),reference=new Tr2TextureReference(),effect=new Tr2Effect();
 reference.SetTexture(value);value.Destroy();effect.SetParameter('ColorMap',reference);effect.Destroy();
 assert.ok(reference.GetTexture().IsValid());reference.SetTexture(null);al.Destroy();
});
test('runtime buffer parameter survives caller reset and is released with its effect',()=>{
 const al=context(),buffer=al.CreateBuffer(bufferDesc()),implementation=buffer.TrinityALImpl_GetObject(),effect=new Tr2Effect();
 effect.SetParameter('Data',buffer);buffer.Destroy();assert.ok(implementation.IsValid());
 effect.Destroy();assert.equal(implementation.IsValid(),false);assert.equal(implementation.IsRegistered(),false);al.Destroy();
});
test('pool handles and escaped values survive explicit pool destruction',()=>{
 const al=context(),pool=new Tr2GpuResourcePool().SetRenderContext(al);
 const handle=pool.GetPersistentTexture('retained',{type:TextureType.TEX_TYPE_2D,format:PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM,width:4,height:4,depth:1,mipCount:1,gpuUsage:Tr2GpuUsage.RENDER_TARGET});
 const borrowed=handle.Get(),copy=new Tr2TextureAL({copy:borrowed}),implementation=copy.TrinityALImpl_GetObject();
 pool.Destroy();assert.ok(handle.Get().IsValid());pool.Free(handle);assert.equal(handle.Get(),null);assert.equal(borrowed.IsValid(),false);assert.ok(copy.IsValid());
 copy.Destroy();assert.equal(implementation.IsRegistered(),false);al.Destroy();
});
test('context binding and saved stack independently retain texture values',()=>{
 const al=context(),value=texture(al),implementation=value.TrinityALImpl_GetObject();
 al.SetRenderTarget(0,value);al.PushRenderTarget(0);value.Destroy();al.SetRenderTarget(0,null);assert.ok(implementation.IsValid());
 al.PopRenderTarget(0);assert.ok(al.GetRenderTarget(0).IsValid());al.SetRenderTarget(0,null);assert.equal(implementation.IsRegistered(),false);al.Destroy();
});
test('empty texture operands keep native errors and map overloads agree',()=>{
 const al=context(),value=texture(al),empty=new Tr2TextureAL(),region=new Tr2TextureSubresource();
 assert.equal(value.CopySubresourceRegion(region,empty,region,al),ALResult.E_INVALIDARG);
 assert.equal(value.Resolve(empty,al),ALResult.E_INVALIDCALL);assert.equal(empty.Resolve(value,al),ALResult.E_INVALIDARG);
 const mip=Tr2TextureSubresource.ForMipLevel(0);
 const first=value.MapForReading(mip,al);value.UnmapForReading(al);const second=value.MapForReading(mip,true,al);
 assert.equal(first.result,second.result);assert.equal(first.result,ALResult.S_OK);value.UnmapForReading(al);value.Destroy();al.Destroy();
});

test('typed and structured GPU owners release replacements but preserve native invalid-create ordering',async()=>{
 const {Tr2GpuBuffer,Tr2GpuStructuredBuffer}=await import('../../npm/dist/trinity/index.js');
 const al=context();
 for(const structured of [false,true]){
  const owner=structured?new Tr2GpuStructuredBuffer():new Tr2GpuBuffer();
  const format=structured?4:PixelFormat.PIXEL_FORMAT_R32_FLOAT;
  assert.equal(owner.Create(4,format,1,al),ALResult.S_OK);
  const old=owner.GetGpuBuffer().TrinityALImpl_GetObject();
  assert.equal(owner.Create(8,format,1,al),ALResult.S_OK);
  assert.equal(old.IsRegistered(),false);
  const current=owner.GetGpuBuffer().TrinityALImpl_GetObject();
  assert.equal(owner.Create(0,format,1,al),ALResult.E_INVALIDARG);
  assert.equal(current.IsRegistered(),structured,'structured refusal retains its previous value; typed refusal resets it');
  owner.Destroy();owner.Destroy();
  assert.equal(current.IsRegistered(),false);
  assert.equal(owner.GetGpuBuffer(),null);
 }
 al.Destroy();
});

test('final context shutdown releases only its own shared geometry blocks',async()=>{
 const {StubContext}=await import('../support/stubContext.js');
 const {SharedGeometryBuffer}=await import('../../npm/dist/trinity/core/mesh/TriGeometryResAllocations.js');
 const a=StubContext(),b=StubContext();
 const first=SharedGeometryBuffer(a).Allocate(4,4,new Uint8Array(16),a);
 const second=SharedGeometryBuffer(b).Allocate(4,4,new Uint8Array(16),b);
 const firstBackend=first.GetBuffer().TrinityALImpl_GetObject();
 const secondBackend=second.GetBuffer().TrinityALImpl_GetObject();
 a.Destroy();a.Destroy();
 assert.equal(first.IsValid(),false);assert.equal(firstBackend.IsRegistered(),false);
 assert.equal(second.IsValid(),true);assert.equal(secondBackend.IsRegistered(),true);
 b.Destroy();assert.equal(secondBackend.IsRegistered(),false);
});

test('render-target final disposal releases an attachment retained by operational detach',async()=>{
 const {Tr2RenderTarget}=await import('../../npm/dist/trinity/index.js');
 const al=context(),value=texture(al),backend=value.TrinityALImpl_GetObject();
 const target=new Tr2RenderTarget();
 target.Attach(value,{});value.Destroy();
 target.Destroy();assert.equal(backend.IsValid(),true);
 target.Detach();assert.equal(backend.IsValid(),true);
 target.Dispose();target.Dispose();assert.equal(backend.IsRegistered(),false);
 al.Destroy();
});
test('device final teardown releases the occlusion singleton without creating a replacement',async()=>{
 const {Tr2OcclusionBuffer}=await import('../../npm/dist/trinity/eve/effect/lensflare/Tr2OcclusionBuffer.js');
 const {Tr2VariableStore}=await import('../../npm/dist/trinity/index.js');
 const {StubContext}=await import('../support/stubContext.js');
 Tr2OcclusionBuffer.ReleaseStaticResources();
 const renderContext=StubContext(),instance=Tr2OcclusionBuffer.getInstance();
 assert.equal(instance.buffer.Create(4,PixelFormat.PIXEL_FORMAT_R32_UINT,1,renderContext),ALResult.S_OK);
 const backend=instance.buffer.GetGpuBuffer().TrinityALImpl_GetObject();
 Tr2OcclusionBuffer.ReleaseStaticResources();Tr2OcclusionBuffer.ReleaseStaticResources();
 assert.equal(Tr2OcclusionBuffer._instance,null);
 assert.equal(backend.IsRegistered(),false);
 assert.equal(Tr2VariableStore.GlobalStore().FindVariable('FlareOcclusionBuffer'),null);
 renderContext.Destroy();
});

test('effect replacement and resource removal release internally minted provider shares',()=>{
 const al=context(),first=texture(al),second=texture(al),effect=new Tr2Effect();
 const firstBackend=first.TrinityALImpl_GetObject(),secondBackend=second.TrinityALImpl_GetObject();
 effect.SetParameter('ColorMap',first);first.Destroy();
 effect.SetParameter('ColorMap',second);second.Destroy();
 assert.equal(firstBackend.IsRegistered(),false);assert.equal(secondBackend.IsRegistered(),true);
 effect.ClearAllResources();assert.equal(secondBackend.IsRegistered(),false);
 effect.Destroy();effect.Destroy();al.Destroy();
});
