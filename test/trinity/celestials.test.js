import test from 'node:test';
import assert from 'node:assert/strict';
import { EvePlanet, EveLensflare, EveSpaceScene, EveChildContainer, EveChildMesh, Tr2RenderContext } from '../../npm/dist/trinity/index.js';
import { mat4 } from '../../npm/dist/global/math/mat4.js';
import { quat } from '../../npm/dist/global/math/quat.js';
import { vec3 } from '../../npm/dist/global/math/vec3.js';
import { Tr2Lod } from '../../npm/dist/trinity/eve/EveLODHelper.js';
import { ITr2Controller } from '../../npm/dist/trinity/controllers/ITr2Controller/ITr2Controller.js';
import { UnlinkReason } from '../../npm/dist/trinity/controllers/enums.js';
import { meta } from '../../npm/dist/global/schema/index.js';
import { TriBatchType } from '../../npm/dist/global/consts/graphics/index.js';

function close(actual, expected, epsilon = 1e-5)
{
  assert.equal(actual.length, expected.length);
  actual.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) < epsilon * Math.max(1, Math.abs(expected[i])), `${i}: ${v} != ${expected[i]}`));
}

test('hydrated planet assigns itself as owner of existing nested effect children', () =>
{
  const planet=new EvePlanet();
  const layer=new EveChildContainer();
  const surface=new EveChildMesh();
  layer.objects.push(surface);
  planet.effectChildren.push(layer);
  planet.Initialize();
  assert.equal(layer.GetOwner(),planet);
  assert.equal(surface.GetOwner(),planet);
});

test('planet composes ball before local rotation; surface scales translation and basis, depth remains world space', () =>
{
  const planet = new EvePlanet();
  const calls = [];
  planet.translation.set([4, 5, 6]);
  planet.scaling.set([2, 3, 4]);
  quat.setAxisAngle(planet.rotation, [0, 1, 0], Math.PI / 2);
  const ball = quat.setAxisAngle(quat.create(), [1, 0, 0], Math.PI / 2);
  planet.translationCurve = { Update(time, out) { assert.equal(time, 123); out.set([1000000, 2000000, 3000000]); } };
  planet.rotationCurve = { Update(_time, out) { out.set(ball); } };
  const child = name => ({
    UpdateAsyncronous(_context, params) { calls.push([name, 'async', Array.from(params.localToWorldTransform), params.spaceObjectParent, params.childParent]); },
    UpdateSyncronous(_context, params) { calls.push([name, 'sync', Array.from(params.localToWorldTransform)]); }
  });
  planet.effectChildren.push(child('surface'));
  planet.zOnlyModel = child('depth');
  planet.UpdatePlanetSyncronous({ GetTime: () => 123, renderContext: null }, 1000000);
  assert.deepEqual(calls.map(c => c.slice(0, 2)), [['surface','async'],['surface','sync'],['depth','sync'],['depth','async']]);
  assert.equal(calls[0][3], null);
  assert.equal(calls[0][4], null);
  // X rotated about X remains X, then local Y rotates it to -Z: order is observable.
  close(calls[2][2].slice(0, 3), [0, 0, -2]);
  close(calls[2][2].slice(12, 15), [1000004, 2000005, 3000006]);
  for (let column = 0; column < 4; column++)
    close(calls[0][2].slice(column * 4, column * 4 + 3), calls[2][2].slice(column * 4, column * 4 + 3).map(x => x / 1000000));
});

test('planet size threshold is strict and depth proxy has no minScreenSize gate', () =>
{
  const planet = new EvePlanet();
  const changes = [];
  const child = { ChangeLOD: level => changes.push(level), GetRenderables: out => out.push('child') };
  planet.effectChildren.push(child);
  planet.zOnlyModel = child;
  planet.estimatedPixelDiameter = planet.minScreenSize;
  planet.lodLevel = Tr2Lod.TR2_LOD_HIGH;
  assert.deepEqual(planet.GetRenderables(), []);
  assert.deepEqual(planet.GetZOnlyRenderables(), ['child']);
  planet.UpdateLOD();
  assert.equal(planet.lodLevel, Tr2Lod.TR2_LOD_LOW);
  planet.estimatedPixelDiameter += 0.01;
  planet.UpdateLOD();
  assert.deepEqual(planet.GetRenderables(), ['child']);
  assert.deepEqual(changes, [Tr2Lod.TR2_LOD_LOW, Tr2Lod.TR2_LOD_LOW, Tr2Lod.TR2_LOD_HIGH, Tr2Lod.TR2_LOD_HIGH]);
  planet.radius = 5000000;
  assert.equal(planet._EstimatePixelDiameterDist(1000, 1, 1000000, { GetViewport: () => ({width: 1000}) }), 5);
  planet.radius = 1;
  assert.equal(planet._EstimatePixelDiameterDist(1000, 1, 1000000, { GetViewport: () => ({width: 1000}) }), 0);
});

function camera()
{
  const context = new Tr2RenderContext();
  const view = mat4.lookAt(mat4.create(), [3000000, 5000000, -7000000], [10000000, 2000000, 4000000], [0,1,0]);
  const projection = mat4.perspectiveZO(mat4.create(), 0.9, 1.6, 2, 5e9);
  context.SetViewTransform(view);
  context.SetProjection(projection);
  context.GetViewport=()=>({x:0,y:0,width:1280,height:800,minZ:0,maxZ:1});
  return {context, view, projection};
}

test('scaled planet update restores the camera after a child throws', () =>
{
  const scene = new EveSpaceScene();
  const {context, view} = camera();
  scene.updateContext.renderContext = context;
  scene.planets.push({ UpdatePlanetSyncronous(update, scale) {
    assert.equal(scale, 1000000);
    close(context.GetViewTransform().slice(0, 12), view.slice(0, 12));
    close(context.GetViewTransform().slice(12, 15), Array.from(view.slice(12, 15), v => v / 1000000));
    throw new Error('child failure');
  } });
  assert.throws(() => scene.UpdatePlanets(scene.updateContext), /child failure/);
  close(context.GetViewTransform(), view);
});

test('empty planet draw restores projection and camera', () =>
{
  const scene = new EveSpaceScene();
  const {context, view, projection} = camera();
  scene.projection.set(projection);
  scene.projectionLast.set(projection);
  scene.planets.push({ GetRenderables() {} });
  scene.RenderPlanets(context);
  close(context.GetViewTransform(), view);
  close(context.GetProjection(), projection);
});

test('planet draw orders depth, opaque, decal, transparent, additive and restores state on draw failure', () =>
{
  for (const fail of [false,true]) {
    const scene = new EveSpaceScene();
    const {context,view,projection} = camera();
    scene.projection.set(projection); scene.projectionLast.set(projection);
    const log = [];
    const esm = context.GetEffectStateManager();
    // The CPU AL intentionally has no state; record the requested depth ownership.
    let readOnlyDepth=false;
    context.SetReadOnlyDepth=value=>{readOnlyDepth=value;};
    context.GetRenderContextAL().GetReadOnlyDepth=()=>readOnlyDepth;
    scene.PopulatePerFramePSData = () => log.push('PS');
    scene.PopulatePerFrameVSData = () => log.push('VS');
    scene.ApplyPerFrameData = () => log.push('apply');
    scene.planets.push({GetRenderables(out) {out.push({
      GetPerObjectData: () => null, GetBatches() {}, HasTransparentBatches: () => true, GetSortValue: () => 1
    });}});
    context.GetTriPoolAllocator = () => ({});
    const expected=[TriBatchType.TRIBATCHTYPE_DEPTH,TriBatchType.TRIBATCHTYPE_OPAQUE,TriBatchType.TRIBATCHTYPE_DECAL,TriBatchType.TRIBATCHTYPE_TRANSPARENT,TriBatchType.TRIBATCHTYPE_ADDITIVE];
    context.RenderBatches = (batch,technique) => {
      const type=[...scene._secondaryBatches].find(([,value])=>value === batch)[0];
      log.push(type);
      if(type === TriBatchType.TRIBATCHTYPE_DEPTH) assert.equal(technique,'Depth');
      if(type === TriBatchType.TRIBATCHTYPE_TRANSPARENT) {
        assert.equal(context.GetRenderContextAL().GetReadOnlyDepth(),true);
        if(fail) throw new Error('draw failure');
      }
    };
    if(fail) assert.throws(()=>scene.RenderPlanets(context),/draw failure/);
    else scene.RenderPlanets(context);
    assert.deepEqual(log.filter(x=>typeof x === 'number'),fail?expected.slice(0,4):expected);
    assert.deepEqual(log.slice(-3),['PS','VS','apply']);
    assert.equal(context.GetRenderContextAL().GetReadOnlyDepth(),false);
    close(context.GetViewTransform(),view); close(context.GetProjection(),projection);
  }
});

test('background occlusion sees planet depth before the final depth clear', () =>
{
  const scene=new EveSpaceScene();
  scene.backgroundRenderingEnabled=true;
  const {context}=camera();
  scene.updateContext.renderContext=context;
  scene.planets.push({SetRenderScale(){},UpdateLOD(){},UpdatePlanetVisibility(){}});
  const order=[];
  scene.RenderPlanets=()=>order.push('planets');
  scene.lensflares.push({RunBackgroundOcclusionQueries(){order.push('query');}});
  context.Clear=options=>{assert.equal(options.depth,0);order.push('clear');};
  scene.RenderBackgroundPass(null,null,null,context,null);
  assert.deepEqual(order,['planets','query','clear']);
});

test('transparent batches preserve native reversed stable sort at equal distances', () =>
{
  const scene = new EveSpaceScene();
  const order = [];
  const make = (id, distance) => ({ distance, object: {
    GetPerObjectData: () => id,
    GetBatches(batch, type, data) { assert.equal(type, TriBatchType.TRIBATCHTYPE_TRANSPARENT); order.push(data); }
  } });
  scene.PrepareTransparentBatch([make('near',1),make('a',10),make('b',10)],scene._secondaryBatches);
  assert.deepEqual(order,['b','a','near']);
});

test('shadow spheres exclude the sun by curve identity and planets behind it; keep largest two', () =>
{
  const scene = new EveSpaceScene();
  const curve = x => ({ GetValueAt: (_time, out) => out.set([x,0,0]) });
  scene.sunBall = curve(100);
  const planet = (size, ball, x, radius) => ({
    GetEstimatedPixelDiameter: () => size, GetTranslationCurve: () => ball,
    GetWorldPosition: out => out.set([x,2,3]), GetRadius: () => radius
  });
  scene.planets.push(planet(1000, scene.sunBall,100,5),planet(900,curve(101),101,8),planet(100,curve(10),10,4),planet(200,null,20,6),planet(50,null,30,7));
  const out = [new Float32Array(4),new Float32Array(4)];
  scene.SetupPlanetsAsShadowCaster(out,2);
  assert.deepEqual(out.map(x => [...x]),[[20,2,3,6],[10,2,3,4]]);
  scene.planets.length = 0;
  scene.SetupPlanetsAsShadowCaster(out,2);
  assert.deepEqual(out.map(x => [...x]),[[0,0,0,0],[0,0,0,0]]);
});

test('depth pass uses the identified sun half-radius and preserves the native invalid domain', () =>
{
  const scene=new EveSpaceScene();
  const {context}=camera();
  let distance=10, angle;
  scene.sunBall={GetValueAt:(_time,out)=>out.set([distance,0,0])};
  scene.planets.push({
    GetZOnlyRenderables(){}, GetTranslationCurve:()=>scene.sunBall,
    GetWorldPosition:out=>out.set([distance,0,0]), GetRadius:()=>10,
    GetEstimatedPixelDiameter:()=>1000
  });
  scene.ApplyPerFrameData=()=>{};
  scene.volumetricsRenderer={SetSunAngle:value=>{angle=value;},SetPlanets:spheres=>{
    assert.deepEqual(spheres.map(x=>Array.from(x)),[[0,0,0,0],[0,0,0,0]]);
  }};
  const batches={GetAccumulator:()=>null};
  scene.RenderDepthPass(null,null,null,context,'Depth',batches);
  assert.ok(Math.abs(angle-Math.PI/6)<1e-7);
  distance=0;
  scene.RenderDepthPass(null,null,null,context,'Depth',batches);
  assert.ok(Number.isNaN(angle));
});

test('lensflare controller initialization, insertion replay and destruction preserve ownership', () =>
{
  const flare = new EveLensflare();
  const log = [];
  class Controller extends ITr2Controller {
    IsLinked() { return this.owner !== undefined; }
    Link(owner) { this.owner = owner; log.push('link'); }
    SetVariable(name,value) { log.push([name,value]); }
    Unlink(reason) { log.push(['unlink',reason]); this.owner = undefined; }
  }
  meta.blue.interfaceTable({interfaces:[ITr2Controller],chainTo:null})(Controller,{kind:'class'});
  const loaded = new Controller();
  flare.controllers.push(loaded);
  flare.Initialize(); flare.Initialize();
  assert.deepEqual(log,['link']);
  flare.SetControllerVariable('radius',5);
  const inserted = new Controller();
  assert.equal(flare.controllers.Append(inserted),true);
  assert.equal(inserted.owner,flare);
  assert.deepEqual(log.slice(-2),['link',['radius',5]]);
  flare.Destroy();
  assert.deepEqual(log.slice(-2),[['unlink',UnlinkReason.DELETING],['unlink',UnlinkReason.DELETING]]);
});

test('lensflare distance law reaches both global and per-object glare scale', () =>
{
  const flare = new EveLensflare();
  const {context, view, projection} = camera();
  const frustum = {viewPos: [0,0,0], viewDir: [0,0,1], projectionMatrix: projection};
  for (const au of [0.1,1,10]) {
    flare.translationCurve = { Update: (_time,out) => out.set([0,0,-au * 0.1495978707e12]) };
    flare.Update(10,20);
    const expected = 1.5 / Math.log(vec3.length(flare.position) / 0.1495978707e12 + 2.71);
    assert.equal(flare.sunSize,expected);
    flare.PrepareRender(frustum,context);
    close(flare._directionVar.GetValue(), [0,0,1,expected]);
    let global;
    const data = {Set(name,value) { if(name === 'directionScale') global = value[3]; },SetIndex() {}};
    flare.GetPerObjectData({Alloc: () => data});
    assert.equal(global,expected);
  }
});

test('lensflare curve owner addresses all same-name sets and leaves others alone', () =>
{
  const flare = new EveLensflare();
  const log = [];
  const set = (name,duration) => ({GetName:()=>name,GetMaxCurveDuration:()=>duration,GetRangeDuration:()=>duration/2,
    ResetTimeRange:()=>log.push('reset'),Play:()=>log.push('play'),PlayTimeRange:r=>log.push(r),Stop:()=>log.push('stop'),Update:(a,b)=>log.push([a,b])});
  flare.curveSets.push(set('sun',2),set('sun',4),set('other',100));
  assert.equal(flare.GetCurveSetDuration('sun'),4);
  assert.equal(flare.GetRangeDuration('sun','rise'),2);
  flare.PlayCurveSet('sun'); flare.PlayCurveSet('sun','rise'); flare.StopCurveSet('sun'); flare.UpdateCurveSet('sun',123);
  assert.deepEqual(log,['reset','play','reset','play','rise','rise','stop','stop',[123,123],[123,123]]);
});


test('a sun without a depth proxy finishes its empty depth pass before restoring scene colour', async () =>
{
  const { StubContext, StubTarget } = await import('../support/stubContext.js');
  const { CjsWebgpuWorkQueue } = await import('../../npm/dist/trinityal/webgpu/internal.js');
  const scene = new EveSpaceScene();
  scene.planets.push(new EvePlanet());
  const context = StubContext();
  const al = context.GetRenderContextAL();
  const colour = StubTarget();
  const depth = StubTarget();
  context.GetEffectStateManager().SetRenderTarget(0, colour);
  context.GetEffectStateManager().SetDepthStencilBuffer(depth);
  const queue = new CjsWebgpuWorkQueue();
  queue.BeginFrame();
  const ended = [];
  al.RenderPassHint = (colourHint, depthHint) => queue.RenderPassHint([colourHint], depthHint);
  al.EndRenderPassHint = () =>
  {
    ended.push({ target: context.GetRenderTarget(0), events: queue.EndRenderPassHint() });
  };
  scene.RenderDepthPass(depth, null, null, context, 'Depth', { GetAccumulator: () => null });
  assert.equal(queue.HasPendingRenderPassHint(), false, 'depth hint cannot reach the restored colour');
  assert.equal(ended.length, 1);
  assert.equal(ended[0].target, null, 'the empty pass executes with no scene colour attached');
  const opened = ended[0].events.find(event => event.type === 'open');
  assert.equal(opened.attachments.depth.loadOp, 'clear');
  assert.equal(opened.attachments.depth.clearValue, 0);
  assert.equal(context.GetRenderTarget(0).Equals(colour), true);
  assert.equal(queue.GetPassCount(), 1, 'the clear happens even without a draw');
  queue.EndFrame();
});
