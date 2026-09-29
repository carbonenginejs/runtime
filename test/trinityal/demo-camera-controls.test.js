import assert from "node:assert/strict";
import test from "node:test";
import { EveCamera, EveShip2 } from "../../npm/dist/trinity/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { createCameraControls, readShipBounds } from "./webgpu/demo/cameraControls.js";

function setup()
{
  const camera = new EveCamera();
  camera.frontClip=1;camera.backClip=10000;camera.translationFromParent=100;
  camera.fieldOfView=Math.PI/4;camera.useExtraTranslation=true;camera.SetOrbit(0.7,-0.3);
  camera.zoomCurve=null;camera.Update(0,1.6,0);
  const viewport={width:800,height:500};
  const controls=createCameraControls({camera,getViewport:()=>viewport,getBounds:()=>({centre:[0,0,0],radius:10})});
  return {camera,controls,viewport};
}

test("demo orbit retains inverted axes and cancel stops native spring motion",()=>
{
  const {camera,controls}=setup();
  controls.orbit(100,40);
  for(let step=0;step<60;step++)camera.Update(step/60,1.6);
  assert.ok(camera.yaw<0.7);assert.ok(camera.pitch<-0.3);
  controls.cancel();const yaw=camera.yaw,pitch=camera.pitch;
  camera.Update(2,1.6);
  assert.equal(camera.yaw,yaw);assert.equal(camera.pitch,pitch);
  controls.preferences.invertX=false;controls.orbit(10,0);camera.Update(3,1.6);
  assert.ok(camera.yaw>yaw);
});

test("pan translates a rotated camera along its actual right/up basis at projection scale",()=>
{
  const {camera,controls,viewport}=setup();
  const before=Array.from(camera.pos),right=Array.from(camera.rightVec),up=Array.from(camera.upVec);
  const p=camera.projectionMatrix.transform;
  const x=-30*200/(p[0]*viewport.width),y=20*200/(p[5]*viewport.height);
  assert.equal(controls.pan(30,20),true);
  camera.Update(1,1.6,0);
  for(let i=0;i<3;i++)assert.ok(Math.abs(camera.pos[i]-(before[i]+right[i]*x+up[i]*y))<1e-4);
  viewport.width=0;assert.equal(controls.pan(20,20),false);
});

test("continuous dolly, radians FOV bounds and reset preserve a valid native view",()=>
{
  const {camera,controls}=setup();const pose=controls.getPose();
  controls.dolly(0.5);assert.ok(camera.translationFromParent>100&&camera.translationFromParent<101);
  controls.dolly(-1e9);assert.ok(camera.translationFromParent>0);
  controls.setFieldOfView(1000);assert.equal(camera.fieldOfView,120*Math.PI/180);
  controls.setFieldOfView(-1);assert.equal(camera.fieldOfView,5*Math.PI/180);
  assert.throws(()=>controls.setFieldOfView(NaN),/finite/);
  controls.reset();assert.deepEqual(controls.getPose(),pose);
  camera.Update(1,1.6,0);assert.ok(Array.from(camera.viewMatrix.transform).every(Number.isFinite));
});

test("current bounds use the transformed ship sphere rather than its local center",()=>
{
  const ship=new EveShip2();ship.boundingSphereCenter.set([2,3,4]);ship.boundingSphereRadius=5;ship.modelScale=4;
  mat4.fromYRotation(ship.worldTransform,0.6);mat4.scale(ship.worldTransform,ship.worldTransform,[2,3,4]);
  ship.worldTransform[12]=100;ship.worldTransform[13]=-20;ship.worldTransform[14]=50;
  const bounds=readShipBounds(ship,null,new Float32Array(4));
  assert.ok(bounds.centre[0]>100&&bounds.centre[2]>50);assert.equal(bounds.radius,20);
  assert.notDeepEqual(Array.from(bounds.centre),Array.from(ship.boundingSphereCenter));
});


function sphereFits(camera, center, radius)
{
  const v=camera.viewMatrix.transform,p=camera.projectionMatrix.transform;
  const x=v[0]*center[0]+v[4]*center[1]+v[8]*center[2]+v[12];
  const y=v[1]*center[0]+v[5]*center[1]+v[9]*center[2]+v[13];
  const z=v[2]*center[0]+v[6]*center[1]+v[10]*center[2]+v[14];
  const distances=[
    (p[0]*x+(p[8]-1)*z)/Math.hypot(p[0],p[8]-1),
    (-p[0]*x+(-p[8]-1)*z)/Math.hypot(p[0],p[8]+1),
    (p[5]*y+(p[9]-1)*z)/Math.hypot(p[5],p[9]-1),
    (-p[5]*y+(-p[9]-1)*z)/Math.hypot(p[5],p[9]+1),
    -z-camera.frontClip,camera.backClip+z
  ];
  for(const distance of distances)assert.ok(distance>=radius-1e-3,JSON.stringify({distance,radius,x,y,z}));
}

test("sphere fitting contains actual native projection planes for portrait,1.6 and ultrawide",()=>
{
  for(const aspect of [0.4,1.6,3.5])for(const offset of [0,0.3]){
    const {camera}=setup();camera.centerOffset=offset;camera.frontClip=80;camera.backClip=100;
    const viewport={width:aspect*500,height:500},bounds={centre:[120,-15,90],radius:30};
    const controls=createCameraControls({camera,getViewport:()=>viewport,getBounds:()=>bounds});
    const yaw=camera.yaw,pitch=camera.pitch,fov=camera.fieldOfView;
    assert.equal(controls.frame(),true);assert.equal(camera.yaw,yaw);assert.equal(camera.pitch,pitch);assert.equal(camera.fieldOfView,fov);
    camera.Update(1,aspect);sphereFits(camera,bounds.centre,bounds.radius);assert.equal(camera.fieldOfView,fov);
    assert.ok(camera.backClip>100,"far clip expands instead of clipping a requested fit");
  }
});

test("zero viewport defers fit; resize/new hull refit while skin-only preserves pose",()=>
{
  const {camera}=setup(),viewport={width:0,height:0};let bounds={centre:[20,30,40],radius:10};
  const controls=createCameraControls({camera,getViewport:()=>viewport,getBounds:()=>bounds});
  const before=controls.getPose();assert.equal(controls.frame(),false);assert.deepEqual(controls.getPose(),before);
  viewport.width=800;viewport.height=500;assert.equal(controls.resize(),true);
  camera.Update(1,1.6);sphereFits(camera,bounds.centre,bounds.radius);
  controls.pan(10,20);controls.dolly(5);const skin=controls.getPose();controls.targetChanged(false);assert.deepEqual(controls.getPose(),skin);
  bounds={centre:[-100,200,50],radius:200};controls.targetChanged(true);camera.Update(2,1.6);sphereFits(camera,bounds.centre,bounds.radius);
  viewport.width=200;assert.equal(controls.resize(),true);camera.Update(3,0.4);sphereFits(camera,bounds.centre,bounds.radius);
  assert.equal(controls.resize(),false);
});

test("manual demo FOV survives native updates and reset restores the initial fitted pose",()=>
{
  const camera=new EveCamera();camera.fieldOfView=Math.PI/4;
  const controls=createCameraControls({camera,getViewport:()=>({width:800,height:500}),getBounds:()=>({centre:[1,2,3],radius:100})});
  controls.frame();const initial=controls.getPose();
  controls.setFieldOfView(Math.PI/3);camera.Update(10,1.6);assert.equal(camera.fieldOfView,Math.PI/3);
  controls.dolly(100);controls.pan(10,10);controls.reset();assert.deepEqual(controls.getPose(),initial);
  camera.Update(11,1.6);sphereFits(camera,[1,2,3],100);
});