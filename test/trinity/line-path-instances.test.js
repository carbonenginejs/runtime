import assert from 'node:assert/strict';
import test from 'node:test';
import {EveCircle,EveBezierCurve,EveLineChildContainer,Tr2RenderContext} from '../../npm/dist/trinity/index.js';
import {Tr2BufferAL,Tr2BufferDescriptionAL,Tr2RenderContextALStub,ALResult} from '../../npm/dist/trinityal/index.js';
import {Tr2CpuUsage,Tr2GpuUsage} from '../../npm/dist/global/consts/renderContext/index.js';
import {mat4} from '../../npm/dist/global/math/mat4.js';
import {quat} from '../../npm/dist/global/math/quat.js';

function near(actual,expected,epsilon=1e-5) {assert.equal(actual.length,expected.length);actual.forEach((value,index)=>assert.ok(Math.abs(value-expected[index])<epsilon,`${index}: ${value} != ${expected[index]}`));}
function cursor(count,prefix=0) {const bytes=new Uint8Array(prefix+count*48+8).fill(0xcd);return {bytes,view:new DataView(bytes.buffer),offset:prefix};}
function record(c,index=0,prefix=0) {return Array.from(new Float32Array(c.bytes.buffer,prefix+index*48,12));}
function translation(c,index=0) {const r=record(c,index);return [r[3],r[7],r[11]];}
function scales(c,index=0) {const r=record(c,index);return [0,1,2].map(axis=>Math.hypot(r[axis],r[axis+4],r[axis+8]));}
function forward(c,index=0) {const r=record(c,index),size=Math.hypot(r[2],r[6],r[10]);return [-r[2]/size,-r[6]/size,-r[10]/size];}
function direction(v) {const len=Math.hypot(...v);return v.map(x=>x/len);}
function circle() {const p=new EveCircle();p._points=[[0,0,0],[4,0,0],[4,4,0],[0,4,0]];return p;}
function bezier() {const p=new EveBezierCurve();p._points=[[0,0,0],[2,0,0],[4,0,0]];p.point2.set([6,0,0]);p.billboardObjects=false;p.animValue=0.5;return p;}

test('circle instance bytes compose local SRT and transpose exactly once without parent multiplication',()=>{
  const p=circle();p._points=[[0,0,0],[0,0,-2],[2,0,-2]];p.objectScale.set([1,2,3]);
  mat4.fromRotationTranslationScale(p.localTransform,quat.setAxisAngle(quat.create(),[0,0,1],Math.PI/2),[10,20,30],[2,3,4]);
  const parent=mat4.fromRotationTranslationScale(mat4.create(),quat.setAxisAngle(quat.create(),[0,1,0],0.7),[100,200,300],[3,2,1]);
  const c=cursor(3,4);p.UpdateBuffer(null,c,parent,48);
  near(record(c,0,4),[0,-6,0,10,2,0,0,20,0,0,12,30]);
  assert.equal(c.offset,148);assert.ok(c.bytes.slice(0,4).every(x=>x===0xcd));assert.ok(c.bytes.slice(c.offset).every(x=>x===0xcd));
});

test('incomplete circles wrap the last point and taper the first and last two records',()=>{
  const p=circle();p.completeness=0.5;p.animValue=0.25;p.objectScale.set([2,3,4]);const c=cursor(4);
  p.UpdateBuffer(null,c,mat4.create(),48);
  near(translation(c),[1,0,0]);near(translation(c,3),[0,3,0]);
  near(scales(c),[0.5,0.75,1]);near(scales(c,1),[2,3,4]);near(scales(c,2),[1.5,2.25,3]);near(scales(c,3),[1.5,2.25,3]);
  p.completeness=1;c.offset=0;p.UpdateBuffer(null,c,mat4.create(),48);near(scales(c),[2,3,4]);near(scales(c,3),[2,3,4]);
  p.completeness=0.5;p.animValue=0;c.offset=0;p.UpdateBuffer(null,c,mat4.create(),48);near(scales(c),[0.02,0.03,0.04]);
});

test('Bezier instance terminal and penultimate records retain the native world-endpoint quirk',()=>{
  const p=bezier();p.scaleEndpoints=false;mat4.fromTranslation(p.worldTransform,[10,20,30]);const c=cursor(3);
  p.UpdateBuffer(null,c,mat4.create(),48);
  near(translation(c),[1,0,0]);near(translation(c,1),[3,0,0]);near(translation(c,2),[10,10,15]);
  near(forward(c,1),direction([4,5,7.5]));near(forward(c,2),direction([6,10,15]));
  // Negative control for an attractive but wrong local-endpoint substitution.
  assert.notDeepEqual(translation(c,2),[5,0,0]);
});

test('Bezier endpoint scales apply to complete paths and incomplete final records are zero',()=>{
  const p=bezier(),c=cursor(3);p.UpdateBuffer(null,c,mat4.create(),48);
  near(scales(c),[0.5,0.5,0.5]);near(scales(c,1),[1,1,1]);near(scales(c,2),[0.5,0.5,0.5]);
  p.completeness=0.5;mat4.fromTranslation(p.worldTransform,[10,20,30]);c.offset=0;p.UpdateBuffer(null,c,mat4.create(),48);
  near(scales(c,1),[0.5,0.5,0.5]);near(forward(c,1),direction([2.5,2.5,3.75]));assert.deepEqual(record(c,2),Array(12).fill(0));
  assert.equal(c.offset,144);
});

test('billboards remove only the parent rotation rather than its nonuniform scale',()=>{
  const parent=mat4.fromRotationTranslationScale(mat4.create(),quat.setAxisAngle(quat.create(),[0,0,1],Math.PI/2),[10,-3,7],[2,3,4]);
  const context={GetViewPosition:()=>[3,4,12]};
  for(const p of [circle(),bezier()]){
    p._points=[[2,1,0],[3,1,0],[4,1,0]];p.animValue=0;p.scaleEndpoints=false;p.billboardObjects=true;
    const c=cursor(3);p.UpdateBuffer(context,c,parent,48);near(translation(c),[2,1,0]);near(forward(c),direction([3,4,5]));
  }
});

test('native forward quaternion branch gives a half-turn for an exact positive-Z billboard',()=>{
  const p=circle();p._points=[[0,0,0],[1,0,0]];p.billboardObjects=true;const c=cursor(2);
  p.UpdateBuffer({GetViewPosition:()=>[0,0,10]},c,mat4.create(),48);
  near(record(c),[1,0,0,0,0,-1,0,0,0,0,-1,0]);
});

test('hidden nested paths zero their own records and keep later cursor offsets intact',()=>{
  const first=circle(),middle=new EveLineChildContainer(),last=bezier(),root=new EveLineChildContainer();
  first._points=[[0,0,0],[0,0,-1]];middle.lines=[circle(),bezier()];middle.isVisible=false;last.scaleEndpoints=false;
  root.lines=[first,middle,last];const c=cursor(root.GetPointCount());root.UpdateBuffer(null,c,mat4.create(),48);
  assert.equal(c.offset,12*48);assert.ok(c.bytes.slice(2*48,9*48).every(x=>x===0));near(translation(c,9),[1,0,0]);
  root.display=false;c.offset=0;root.UpdateBuffer(null,c,mat4.create(),48);assert.ok(c.bytes.slice(0,c.offset).every(x=>x===0));
  assert.ok(c.bytes.slice(c.offset).every(x=>x===0xcd));
});

test('generated paths write consecutive live AL instance records and hidden leaves preserve capacity',()=>{
  const al=new Tr2RenderContextALStub(),context=new Tr2RenderContext();context.SetRenderContextAL(al);al.CreateDevice();
  const p=new EveCircle();p.numSegments=4;p.circleRadius=2;p.GeneratePoints();
  const b=new EveBezierCurve();b.segments=3;b.point2.set([6,0,0]);b.bezierPoint.set([3,2,0]);b.billboardObjects=false;b.GeneratePoints();
  const root=new EveLineChildContainer();root.lines=[p,b];root.localTransform[12]=500;
  const buffer=new Tr2BufferAL();assert.equal(buffer.Create(Tr2BufferDescriptionAL.FromStride(48,7,Tr2GpuUsage.VERTEX_BUFFER,Tr2CpuUsage.WRITE_OFTEN),null,context),ALResult.S_OK);
  try {
    const mapped=buffer.MapForWriting(context),c={view:new DataView(mapped.data.buffer,mapped.data.byteOffset,mapped.data.byteLength),offset:0};
    root.UpdateBuffer(context,c,mat4.create(),48);buffer.UnmapForWriting(context);assert.equal(c.offset,336);
    near([c.view.getFloat32(12,true),c.view.getFloat32(28,true),c.view.getFloat32(44,true)],[Math.SQRT2,0,Math.SQRT2]);
    b.display=false;const next=buffer.MapForWriting(context);c.view=new DataView(next.data.buffer,next.data.byteOffset,next.data.byteLength);c.offset=0;
    root.UpdateBuffer(context,c,mat4.create(),48);buffer.UnmapForWriting(context);assert.ok(next.data.slice(192).every(x=>x===0));
  } finally {buffer.Destroy();}
});
