import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync,readFileSync} from 'node:fs';
import {CjsSchema} from '../../npm/dist/global/schema/index.js';
import {NotifyModified} from '../../npm/dist/global/blue/index.js';
import {EveStarfield,EveSpaceScene,Tr2EffectStateManager,Tr2Renderer,TriDevice,Tr2RenderContext_GetMainThreadRenderContext} from '../../npm/dist/trinity/index.js';
import {Tr2RenderContextALStub,ALResult} from '../../npm/dist/trinityal/index.js';
import {SharedGeometryBuffer} from '../../npm/dist/trinity/core/mesh/TriGeometryResAllocations.js';
import {RenderingMode} from '../../npm/dist/global/consts/graphics/index.js';

function setup(t) {
  const context=Tr2RenderContext_GetMainThreadRenderContext(),prior=context.GetRenderContextAL();
  const before=new Set(TriDevice.GetResourcesRegistered());
  const al=new Tr2RenderContextALStub();context.SetRenderContextAL(al);al.CreateDevice();al.BeginScene();
  const uploads=[],draws=[],create=al.CreateBuffer.bind(al),draw=al.DrawIndexedInstanced.bind(al);
  al.CreateBuffer=(desc,data,...rest)=>{if(desc.stride===32&&data)uploads.push(new Uint8Array(data.buffer,data.byteOffset,data.byteLength).slice());return create(desc,data,...rest);};
  al.DrawIndexedInstanced=(...args)=>{draws.push(args);return draw(...args);};
  const shader={GetTechniqueIndex:()=>0,GetPassCount:()=>1,GetShaderTypeMask:()=>3,ApplyAllStateForPass(){}};
  const effect={GetShaderStateInterface:()=>shader,CompatibleWithGdr:()=>false,ApplyMaterialDataForPass(){}};
  t.after(()=>{for(const resource of TriDevice.GetResourcesRegistered())if(!before.has(resource)&&resource.constructor===EveStarfield)resource.Destroy();SharedGeometryBuffer(context).ReleaseResources();context.SetRenderContextAL(prior);});
  return {context,al,uploads,draws,effect};
}

function make(values={}) {return CjsSchema.from('EveStarfield',{numStars:3,...values});}
function collect(stars) {const batches=[];stars.GetBatches({Commit:b=>batches.push(b)},null);return batches;}

test('mapped starfield initialization uploads seeded native sprite records',t=>{
  const {uploads}=setup(t),stars=make({seed:0,minDist:10,maxDist:10,minFlashRate:2,maxFlashRate:2,minFlashIntensity:1});
  assert.equal(uploads.length,1);
  const bytes=uploads[0],view=new DataView(bytes.buffer);
  assert.equal(bytes.length,3*4*32);
  for(let star=0;star<3;star++)for(let corner=0;corner<4;corner++){
    const offset=(star*4+corner)*32;
    assert.ok(Math.abs(Math.hypot(view.getFloat32(offset,true),view.getFloat32(offset+4,true),view.getFloat32(offset+8,true))-10)<0.00001);
    assert.equal(view.getFloat32(offset+16,true),1);assert.equal(view.getFloat32(offset+24,true),2);
    assert.equal(bytes[offset+28],corner);assert.ok(bytes[offset+29]<4);
    assert.deepEqual(bytes.slice(offset,offset+28),bytes.slice(star*128,star*128+28));
  }
  // TriMath.cpp's seed-zero integer sequence: fourth draw593286, sixth212109, eighth574727.
  assert.equal(view.getFloat32(12,true),Math.fround(593286/714025));
  assert.equal(view.getFloat32(20,true),Math.fround(212109/714025));assert.equal(bytes[29],3);
  const declaration=Tr2EffectStateManager.getVertexDeclarationElements(stars._vertexDeclHandle);
  assert.deepEqual(declaration.items.map(item=>[item.offset,item.type]),[[0,'FLOAT32_3'],[12,'FLOAT32_1'],[16,'FLOAT32_1'],[20,'FLOAT32_1'],[24,'FLOAT32_1'],[28,'UBYTE_4']]);
  const again=make({seed:0,minDist:10,maxDist:10,minFlashRate:2,maxFlashRate:2,minFlashIntensity:1});
  assert.deepEqual(uploads[1],bytes);again.Destroy();
});

test('batched edits rebuild once; inert callback control leaves old uploaded stars',t=>{
  const {uploads}=setup(t),stars=make();
  const original=uploads[0].slice();
  CjsSchema.setValues(stars,{seed:19,numStars:5});assert.equal(uploads.length,1);
  const scene=new EveSpaceScene();scene.starfield=stars;scene.Update(0,0);assert.equal(uploads.length,2);assert.equal(uploads[1].length,5*128);
  stars.Update(1);assert.equal(uploads.length,2);
  assert.notDeepEqual(uploads[1].slice(0,original.length),original);
  const control=t.mock.method(stars,'OnModified',()=>true);
  CjsSchema.setValues(stars,{seed:23});stars.Update(2);assert.equal(uploads.length,2,'negative control: bypassed invalidation preserves old upload');
  control.mock.restore();NotifyModified(stars,['seed']);stars.Update(3);assert.equal(uploads.length,3);
  CjsSchema.setValues(stars,{display:false});stars.Update(4);assert.equal(uploads.length,3,'non-notifying display does not regenerate');
});

test('failed starfield allocation retries and device preparation restores storage',t=>{
  const {al,effect}=setup(t),stars=make();stars.SetEffect(effect);
  const create=al.CreateBuffer.bind(al);let refused=true;
  al.CreateBuffer=(desc,data,internal)=>refused&&desc.stride===32?{result:ALResult.E_FAIL,implementation:null}:create(desc,data,internal);
  CjsSchema.setValues(stars,{seed:12});stars.Update(0);assert.equal(collect(stars).length,0);assert.equal(stars._dirty,true);
  refused=false;stars.Update(1);assert.equal(collect(stars).length,1);assert.equal(stars._dirty,false);
  stars.ReleaseResources();assert.equal(collect(stars).length,0);stars.PrepareResources();assert.equal(collect(stars).length,1);
  CjsSchema.setValues(stars,{numStars:0});stars.Update(2);assert.equal(collect(stars).length,0);
});

test('starfield scene background submits actual additive indexed draws',t=>{
  const {context,draws,effect}=setup(t),stars=make(),scene=new EveSpaceScene();
  scene.starfield=stars;stars.SetEffect(effect);assert.equal(stars.GetEffect(),effect);
  const modes=[],esm=context.GetEffectStateManager(),apply=esm.ApplyStandardStates.bind(esm);
  t.mock.method(esm,'ApplyStandardStates',mode=>{modes.push(mode);return apply(mode);});
  scene.RenderBackgroundPassObjects(null,null,context,null,EveSpaceScene.BackgroundRenderingReason.BACKGROUND_RENDER_COLOR);
  assert.equal(draws.length,1);assert.equal(draws[0][0],18);assert.equal(draws[0][1],1);
  assert.ok(modes.includes(RenderingMode.RM_ALPHA_ADDITIVE));assert.equal(scene._secondaryAdditiveBatches.GetBatches().length,0);
  stars.display=false;scene.RenderBackgroundPassObjects(null,null,context,null,EveSpaceScene.BackgroundRenderingReason.BACKGROUND_RENDER_COLOR);assert.equal(draws.length,1);
  stars.Destroy();assert.ok(!TriDevice.GetResourcesRegistered().includes(stars));
});

test('starfield promotion preserves declaration ownership and interface mappings',()=>{
  assert.equal(existsSync('src/trinity/generated/eve/effect/EveStarfield.js'),false);
  const summary=JSON.parse(readFileSync('src/trinity/generated/summary.json','utf8'));
  assert.ok(JSON.stringify(summary).includes('EveStarfield'));
  assert.equal(CjsSchema.getField(EveStarfield,'numStars').type.kind,'int32');
});
