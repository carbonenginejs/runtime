import assert from 'node:assert/strict';
import test from 'node:test';
import {CjsSchema} from '../../npm/dist/global/schema/index.js';
import {INotify,NotifyModified} from '../../npm/dist/global/blue/index.js';
import {mat4} from '../../npm/dist/global/math/mat4.js';
import {Tr2CurveLineSet,EveCurveLineSet,TriDevice,Tr2EffectStateManager,Tr2RenderContext,Tr2RenderContext_GetMainThreadRenderContext} from '../../npm/dist/trinity/index.js';
import {Tr2RenderContextALStub,ALResult} from '../../npm/dist/trinityal/index.js';
import {TriBatchType} from '../../npm/dist/global/consts/graphics/index.js';
import {Tr2CpuUsage} from '../../npm/dist/global/consts/renderContext/index.js';

function setup(t) {
  const context=Tr2RenderContext_GetMainThreadRenderContext(),prior=context.GetRenderContextAL();
  const registered=new Set(TriDevice.GetResourcesRegistered());
  const al=new Tr2RenderContextALStub();context.SetRenderContextAL(al);al.CreateDevice();al.BeginScene();
  context.PushProjection();context.PushViewTransform();context.SetProjection(mat4.create());context.SetViewTransform(mat4.create());
  const draws=[],draw=al.DrawInstanced.bind(al);
  al.DrawInstanced=(...args)=>{draws.push(args);return draw(...args);};
  const shader={GetTechniqueIndex:()=>0,GetPassCount:()=>1,GetShaderTypeMask:()=>3,ApplyAllStateForPass(){}};
  const effect={GetShaderStateInterface:()=>shader,CompatibleWithGdr:()=>false,ApplyMaterialDataForPass(){}};
  t.after(()=>{
    for(const resource of TriDevice.GetResourcesRegistered())if(!registered.has(resource)&&CjsSchema.cast(resource,INotify))resource.Destroy();
    context.PopProjection();context.PopViewTransform();context.SetRenderContextAL(prior);
  });
  return {context,al,effect,draws};
}
function bytes(lines) {const implementation=lines._vertexBuffer.TrinityALImpl_GetObject();return implementation._buffer.slice();}
function floats(data,offset,count) {return Array.from(new Float32Array(data.buffer,data.byteOffset+offset,count));}
function collect(lines,type=TriBatchType.TRIBATCHTYPE_TRANSPARENT) {const batches=[];lines.GetBatches({Commit:b=>batches.push(b)},type,null);return batches;}
function straight(lines) {return lines.AddStraightLine([1,2,3],[1,0.5,0,1],[4,6,3],[0,0,1,0.5],2);}
function near(actual,expected,epsilon=1e-5) {assert.equal(actual.length,expected.length);actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<epsilon,`${i}: ${v} != ${expected[i]}`));}

test('line submission packs the native 80-byte stream, adjacency, stable IDs and declaration',t=>{
  setup(t);const lines=new Tr2CurveLineSet();const removed=straight(lines);straight(lines);lines.RemoveLine(removed);
  assert.equal(straight(lines),0);lines.ChangeLineMultiColor(0,[0,1,0,1],0.3);lines.ChangeLineAnimation(0,[1,0,1,1],2,4);
  assert.equal(lines.FillVertexBuffer(),true);assert.equal(lines.GetNumOfLines(),2);
  const data=bytes(lines);assert.equal(data.length,960);
  near(floats(data,0,3),[1,2,3]);near(floats(data,12,4),[3,4,0,-2]);near(floats(data,28,4),[0,0,0.3,1]);
  near(floats(data,44,3),[2,4,0]);near(floats(data,56,3),[-2,-2,3]);
  assert.deepEqual(Array.from(data.slice(68,80)),[255,128,0,255,0,255,0,255,255,0,255,255]);
  near(floats(data,160,3),[4,6,3]);near(floats(data,172,4),[-3,-4,0,-2]);near(floats(data,216,3),[7,10,3]);
  assert.equal(floats(data,480+52,1)[0],1);
  const declaration=Tr2EffectStateManager.getVertexDeclarationElements(lines._vertexDeclHandle);
  assert.deepEqual(declaration.items.map(x=>[x.offset,x.type]),[[0,'FLOAT32_3'],[12,'FLOAT32_4'],[28,'FLOAT32_4'],[44,'FLOAT32_3'],[56,'FLOAT32_3'],[68,'UBYTE_4_NORM'],[72,'UBYTE_4_NORM'],[76,'UBYTE_4_NORM']]);
});

test('width notification updates mapped bytes once and a suppressed callback leaves old width',t=>{
  setup(t);const lines=new EveCurveLineSet();straight(lines);lines.SubmitChanges();
  assert.equal(CjsSchema.cast(lines,INotify),lines);
  const original=bytes(lines),fill=t.mock.method(lines,'FillVertexBuffer');
  CjsSchema.setValues(lines,{lineWidthFactor:3,lineEffect:null});assert.equal(fill.mock.calls.length,1);
  assert.equal(floats(bytes(lines),24,1)[0],-6);assert.notDeepEqual(bytes(lines),original);
  const inert=t.mock.method(lines,'OnModified',()=>true);CjsSchema.setValues(lines,{lineWidthFactor:5});
  assert.equal(floats(bytes(lines),24,1)[0],-6,'negative control must preserve stale bytes');
  inert.mock.restore();NotifyModified(lines,['lineWidthFactor']);assert.equal(floats(bytes(lines),24,1)[0],-10);
  const calls=fill.mock.calls.length;NotifyModified(lines,['pickEffect']);assert.equal(fill.mock.calls.length,calls);
});

test('curve and sphere tessellation preserve extrapolated neighbors and native sphere-box quirk',t=>{
  setup(t);const lines=new Tr2CurveLineSet();
  lines.AddCurvedLineCrt([0,0,0],[1,0,0,1],[2,0,0],[0,0,1,1],[1,2,0],1,2);lines.SubmitChanges();
  const curve=bytes(lines);
  near(floats(curve,56,3),[0.5,-1.5,0]);near(floats(curve,160,3),[1,0.5,0]);
  near(floats(curve,216,3),[2,0,0]);near(floats(curve,480+216,3),[1.5,-1.5,0]);
  assert.deepEqual(Array.from(curve.slice(228,232)),[128,0,128,255]);
  lines.ClearLines();const id=lines.AddSpheredLineCrt([3,0,0],[1,1,1,1],[2,1,0],[1,1,1,1],[2,0,0],1);
  lines.ChangeLineSegmentation(id,2);lines.SubmitChanges();const arc=bytes(lines);
  near(floats(arc,160,3),[2+Math.SQRT1_2,Math.SQRT1_2,0]);
  near(floats(arc,56,3),[2+Math.SQRT1_2,-Math.SQRT1_2,0]);
  near(Array.from(lines.minBounds),[2,0,0]);near(Array.from(lines.maxBounds),[2,0,0]);
  assert.ok(lines.boundingSphere[3]>1);assert.equal(lines.currentSubmittedLineCount,2);
});

test('particle packing keeps native fourth-color asymmetry and a shared random value per quad',t=>{
  setup(t);t.mock.method(Math,'random',()=>0.25);const lines=new Tr2CurveLineSet();const id=straight(lines);
  lines.lines[id].type=Tr2CurveLineSet.LineType.LINETYPE_PARTICLE;lines.lines[id].numOfSegments=2;
  lines.ChangeLineIntermediateCrt(id,[7,8,9]);lines.SubmitChanges();const data=bytes(lines);
  for(let i=0;i<6;i++){
    near(floats(data,i*80,3),[1,2,3]);near(floats(data,i*80+12,3),[3,4,0]);
    near(floats(data,i*80+44,3),[7,8,9]);near(floats(data,i*80+56,3),[0,0,0]);
    assert.equal(floats(data,i*80+36,1)[0],0.25);assert.equal(floats(data,i*80+40,1)[0],0);
  }
  assert.deepEqual(Array.from(data.slice(68,72)),[255,128,0,255]);
  assert.deepEqual(Array.from(data.slice(308,312)),[0,128,255,255]);
  assert.equal(floats(data,480+32,1)[0],0.5);
});

test('spherical directions do not accumulate float32 translation error far from the origin',t=>{
  setup(t);const lines=new Tr2CurveLineSet(),center=10000000,radius=99,segments=13;
  const id=lines.AddSpheredLineCrt([center+radius,center,0],[1,1,1,1],[center,center+radius,0],[1,1,1,1],[center,center,0],1);
  lines.ChangeLineSegmentation(id,segments);lines.SubmitChanges();const data=bytes(lines);
  for(let i=0;i<segments;i++){
    const angle=(i+1)*Math.PI/(2*segments);
    near(floats(data,i*480+160,3),[Math.fround(center+radius*Math.cos(angle)),Math.fround(center+radius*Math.sin(angle)),0],0.01);
  }
});

test('buffer capacity, allocation/map failures and device recreation follow native return contracts',t=>{
  const {al,effect}=setup(t);const lines=new Tr2CurveLineSet();straight(lines);straight(lines);lines.SetDynamicFlag(true);
  lines.SubmitChanges();const implementation=lines._vertexBuffer.TrinityALImpl_GetObject();
  assert.equal(lines._vertexBuffer.GetDesc().cpuUsage,Tr2CpuUsage.WRITE_OFTEN);
  lines.RemoveLine(1);lines.SubmitChanges();assert.equal(lines._vertexBuffer.TrinityALImpl_GetObject(),implementation);assert.equal(bytes(lines).length,960);
  const failedMap=t.mock.method(lines._vertexBuffer,'MapForWriting',()=>({result:ALResult.E_FAIL,data:null}));
  assert.equal(lines.FillVertexBuffer(),false);assert.equal(lines.currentSubmittedLineCount,1);assert.equal(lines.SubmitChanges(),true);failedMap.mock.restore();
  lines.SetLineEffect(effect);assert.equal(collect(lines).length,1);lines.ReleaseResources();assert.equal(collect(lines).length,0);
  const create=t.mock.method(al,'CreateBuffer',()=>({result:ALResult.E_FAIL,implementation:null}));
  assert.equal(lines.PrepareResources(),false);assert.equal(lines.currentSubmittedLineCount,0);assert.equal(lines.OnModified('lineWidthFactor'),true);create.mock.restore();
  assert.equal(lines.PrepareResources(),true);assert.equal(collect(lines).length,1);
  lines.ClearLines();lines.SubmitChanges();assert.equal(lines.currentSubmittedLineCount,0);assert.equal(lines._vertexBuffer.IsValid(),true);
  near(Array.from(lines.boundingSphere),[0,0,0,0]);lines.Destroy();assert.ok(!TriDevice.GetResourcesRegistered().includes(lines));
});

test('line batch categories dispatch real nonindexed draws and camera depth uses the native local bound',t=>{
  const {context,effect,draws}=setup(t);const lines=new Tr2CurveLineSet();straight(lines);lines.SubmitChanges();lines.SetLineEffect(effect);lines.SetPickEffect(effect);
  assert.equal(collect(lines,TriBatchType.TRIBATCHTYPE_OPAQUE).length,0);assert.equal(collect(lines,TriBatchType.TRIBATCHTYPE_ADDITIVE).length,0);
  lines.SetAdditiveFlag(true);assert.equal(collect(lines).length,0);assert.equal(collect(lines,TriBatchType.TRIBATCHTYPE_ADDITIVE).length,1);
  const picking=collect(lines,TriBatchType.TRIBATCHTYPE_PICKING);assert.equal(picking.length,1);
  context.RenderBatches({GetBatches:()=>picking});assert.equal(draws.length,1);assert.deepEqual(draws[0].slice(0,4),[6,1,0,0]);
  lines.display=false;assert.equal(collect(lines,TriBatchType.TRIBATCHTYPE_PICKING).length,0);lines.display=true;
  context.SetProjection(mat4.perspective(mat4.create(),Math.PI/3,1.5,1,100));
  lines.boundingSphere.set([0,0,0,1]);lines.depthOffset=0;lines.worldTransform[12]=1000;
  assert.equal(collect(lines,TriBatchType.TRIBATCHTYPE_PICKING)[0].depth,268435456);
  lines.depthOffset=context.GetFrustumRadius()/2;assert.equal(collect(lines,TriBatchType.TRIBATCHTYPE_PICKING)[0].depth,134217728);
  lines.depthOffset=context.GetFrustumRadius()*2;assert.equal(collect(lines,TriBatchType.TRIBATCHTYPE_PICKING)[0].depth,0);
});

test('frustum radius follows inverse-projected corner and projection stack restoration',()=>{
  const context=new Tr2RenderContext();assert.equal(context.GetFrustumRadius(),0);context.PushProjection();
  const projection=mat4.perspective(mat4.create(),Math.PI/3,1.5,1,100);context.SetProjection(projection);
  const expected=100*Math.hypot(1.5*Math.tan(Math.PI/6),Math.tan(Math.PI/6),1);
  assert.ok(Math.abs(context.GetFrustumRadius()-expected)<0.001);const radius=context.GetFrustumRadius();
  context.PushProjection();context.SetProjection(mat4.create());assert.equal(context.GetFrustumRadius(),Math.sqrt(3));
  context.PopProjection();assert.equal(context.GetFrustumRadius(),radius);context.PopProjection();assert.equal(context.GetFrustumRadius(),0);
});
