// Tr2ShLightingManager: secondary lighting as packed SH coefficients.
//
// The expectations here are derived from the Carbon source
// (trinity/trinity/Tr2ShLightingManager.cpp), not from this implementation's
// output, so a rewrite that changes the math fails rather than re-baselining.
import test from "node:test";
import assert from "node:assert/strict";

import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {CjsBlackFormat} from "../../npm/dist/resource/formats/black/index.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";

import { EveEffectRoot2, EvePlanet, EveSpaceObject2, EveSpaceScene, Tr2ShLightingManager } from "../../npm/dist/trinity/index.js";


const SQRT_PI = Math.sqrt(Math.PI);

/** A manager lit by a unit sun along +Y, matching Carbon's default direction. */
function makeManager(quality = Tr2ShLightingManager.Quality.L2)
{
  const manager = new Tr2ShLightingManager();

  manager.quality = quality;
  manager.UpdateWithDirectionalLight(vec3.fromValues(0, 1, 0), vec3.fromValues(1, 1, 1));

  return manager;
}


/** Registers one emissive sphere and refreshes the processed run. */
function addSphere(manager, position, radius, emissive = [ 1, 1, 1 ])
{
  manager.RegisterSecondaryLightSource(
    Float32Array.from(position),
    radius,
    Float32Array.from([ 0, 0, 0 ]),
    Float32Array.from(emissive)
  );
  manager.UpdateSourceData();
}


test("Carbon's two SH orders are L1 and L2, and the default is L2", () =>
{
  assert.deepEqual(Object.keys(Tr2ShLightingManager.Quality), [ "L1", "L2" ]);
  assert.equal(Tr2ShLightingManager.Quality.L1, 0);
  assert.equal(Tr2ShLightingManager.Quality.L2, 1);
  assert.equal(new Tr2ShLightingManager().quality, Tr2ShLightingManager.Quality.L2);
  assert.equal(Tr2ShLightingManager.PACKED_COEFFICIENT_COUNT, 7);
});


test("an unlit scene packs nothing, and L2 still stamps its constant w lane", () =>
{
  const out = new Float32Array(28);

  makeManager().GetLighting(vec3.create(), 1, 0, out);

  for (let index = 0; index < 27; index++)
  {
    // A negated zero is a legitimate packed value; assert/strict compares with
    // Object.is, which separates -0 from 0.
    assert.ok(out[index] === 0, `coefficient ${index} with no sources`);
  }
  // ShSolver<L2>::PackCoefficients ends with a hard 1 (cpp:168).
  assert.equal(out[27], 1, "the last w lane is a constant, not accumulated");
});


test("an emissive sphere lands its energy in the ambient term", () =>
{
  const manager = makeManager();
  const out = new Float32Array(28);

  // Distance 10, radius 4: comfortably past the one-unit floor, and bright
  // enough that (radius / distance) * maxColorComponent clears the cutoff.
  addSphere(manager, [ 0, 0, 10 ], 4);
  manager.GetLighting(vec3.create(), 1, 0, out);

  // The w lane is NOT the ambient term alone: ShSolver<L2>::PackCoefficients
  // subtracts the z-squared band from it (cpp:154-155), so both contribute.
  const sinAngle = 4 / 10;
  const cosAngle = Math.sqrt(1 - sinAngle * sinAngle);
  const cap0 = -cosAngle + 1;
  const cap2 = cosAngle * (cosAngle * cosAngle - 1);

  // The source sits on +Z, so the basis reduces to coefficients 0 and 6.
  const sh0 = cap0 * (2 * SQRT_PI * 0.282094791773878140 * Math.sqrt(0.3141593e1));
  const sh6 = (3 - 1) * cap2
    * (2 / 5 * Math.sqrt(5 * Math.PI) * -0.315391565252520050 * (-Math.sqrt(5) * Math.sqrt(0.3141593e1) / 2));

  const expected = (1 / (2 * SQRT_PI)) * sh0 - (Math.sqrt(5) / (16 * SQRT_PI)) * sh6;

  for (const channel of [ 0, 1, 2 ])
  {
    assert.ok(
      Math.abs(out[channel * 4 + 3] - expected) < 1e-6,
      `channel ${channel} ambient: expected ${expected}, got ${out[channel * 4 + 3]}`
    );
  }
});


test("a source is skipped when it is too dim, too close, or has no radius", () =>
{
  const out = new Float32Array(28);

  // Too dim: (radius / distance) * maxColorComponent below 0.045 * 7.
  const dim = makeManager();
  addSphere(dim, [ 0, 0, 1000 ], 1);
  dim.GetLighting(vec3.create(), 1, 0, out);
  assert.equal(out[3], 0, "a source below the cutoff ratio contributes nothing");

  // Inside one unit: Carbon's distance < 1 guard.
  const close = makeManager();
  out.fill(0);
  addSphere(close, [ 0, 0, 0.5 ], 4);
  close.GetLighting(vec3.create(), 1, 0, out);
  assert.equal(out[3], 0, "a source within one unit is skipped");

  // A non-positive radius never reaches the processed run at all.
  const flat = makeManager();
  assert.equal(flat.RegisterSecondaryLightSource(
    Float32Array.from([ 0, 0, 10 ]), 0, Float32Array.from([ 0, 0, 0 ]), Float32Array.from([ 1, 1, 1 ])
  ), true);
  assert.equal(flat.UpdateSourceData(), 0, "a zero-radius sphere is not processed");
});


test("the cutoff radius culls spheres but never point lights", () =>
{
  const manager = makeManager();
  const out = new Float32Array(28);

  addSphere(manager, [ 0, 0, 10 ], 4);
  manager.GetLighting(vec3.create(), 1, 100, out);
  assert.equal(out[3], 0, "a sphere smaller than the cutoff is culled");

  // cutoffMultiplier is 0 for a light, so the same cutoff cannot reach it.
  const lit = makeManager();
  lit.lights.push({
    GetLight(position, radius, color)
    {
      vec3.set(position, 0, 0, 10);
      radius[0] = 4;
      color[0] = color[1] = color[2] = 1;
    }
  });
  lit.UpdateSourceData();
  out.fill(0);
  lit.GetLighting(vec3.create(), 1, 100, out);
  assert.ok(Math.abs(out[3]) > 0, "a point light ignores the cutoff radius");
});


test("intensity scales the result linearly", () =>
{
  const manager = makeManager();
  const full = new Float32Array(28);
  const half = new Float32Array(28);

  addSphere(manager, [ 0, 0, 10 ], 4);
  manager.GetLighting(vec3.create(), 1, 0, full);
  manager.GetLighting(vec3.create(), 0.5, 0, half);

  assert.ok(Math.abs(half[3] - full[3] * 0.5) < 1e-6, "half intensity halves the ambient term");
});


test("L1 fills only the first three vec4s, leaving the tail to the caller", () =>
{
  const manager = makeManager(Tr2ShLightingManager.Quality.L1);
  const out = new Float32Array(28).fill(7);

  addSphere(manager, [ 0, 0, 10 ], 4);
  manager.GetLighting(vec3.create(), 1, 0, out);

  assert.ok(Math.abs(out[3]) > 0, "L1 writes the ambient term");
  for (let index = 12; index < 28; index++)
  {
    assert.equal(out[index], 7, `L1 must not touch float ${index}`);
  }
});


test("a registered source is read live, so a moved sphere relights", () =>
{
  const manager = makeManager();
  const position = Float32Array.from([ 0, 0, 10 ]);
  const near = new Float32Array(28);
  const far = new Float32Array(28);

  manager.RegisterSecondaryLightSource(
    position, 4, Float32Array.from([ 0, 0, 0 ]), Float32Array.from([ 1, 1, 1 ])
  );
  manager.UpdateSourceData();
  manager.GetLighting(vec3.create(), 1, 0, near);

  // Carbon holds a POINTER to the caller's position, so moving it and
  // re-evaluating must change the answer with no re-registration.
  position[2] = 40;
  manager.GetLighting(vec3.create(), 1, 0, far);

  assert.ok(far[3] < near[3], "a sphere that moved away contributes less");

  assert.equal(manager.UnregisterSecondaryLightSource(position), true, "unregistered by identity");
  assert.equal(manager.UnregisterSecondaryLightSource(position), false, "and only once");
});


test("EveSpaceObject2 fades the hull's coefficients in across the low-detail threshold", () =>
{
  const object = new EveSpaceObject2();
  const manager = makeManager();
  const context = { GetLowDetailThreshold: () => 10, GetMediumDetailThreshold: () => 50 };

  object.boundingSphereRadius = 10;
  addSphere(manager, [ 0, 0, 30 ], 12);

  // Below the low-detail threshold the hull takes no secondary lighting.
  object.estimatedPixelDiameterWithChildren = 5;
  assert.equal(object.UpdateShLighting(manager, context), false, "below the threshold");
  const parent = object.GetParentData();
  assert.equal(parent.shLighting[3], 0, "and the coefficients stay clear");

  // Past it, the contribution fades in over a quarter of the threshold span.
  object.estimatedPixelDiameterWithChildren = 40;
  assert.equal(object.UpdateShLighting(manager, context), true, "above the threshold");
  assert.ok(Math.abs(parent.shLighting[3]) > 0, "the hull is lit");

  object.ClearShLighting();
  assert.equal(parent.shLighting[3], 0, "ClearShLighting drops it again");
});


test("EveSpaceScene drives every receiver, and does nothing without a manager", () =>
{
  const scene = new EveSpaceScene();
  const lit = new EveSpaceObject2();
  const notAReceiver = { name: "no UpdateShLighting here" };

  lit.boundingSphereRadius = 10;
  lit.estimatedPixelDiameterWithChildren = 40;

  // No manager: Carbon's guard skips the whole pass.
  assert.equal(scene.UpdateShLighting([ lit, notAReceiver ]), 0, "no manager, no work");

  const manager = makeManager();
  addSphere(manager, [ 0, 0, 30 ], 12);
  scene.shLightingManager = manager;
  scene.updateContext.lowDetailThreshold = 10;
  scene.updateContext.mediumDetailThreshold = 50;

  assert.equal(scene.UpdateShLighting([ lit, notAReceiver ]), 1, "only receivers are updated");
  assert.ok(Math.abs(lit.GetParentData().shLighting[3]) > 0, "the hull picked up bounce light");
});


test("secondary light registrations read updated hull and planet radii", () => {
  for(const [source,field] of [[new EveSpaceObject2(),"secondaryLightingSphereRadius"],[new EvePlanet(),"radius"]]) {
    const manager=makeManager();source[field]=4;source.RegisterSecondaryLightSource(manager);
    assert.equal(manager.UpdateSourceData(),1);
    source[field]=0;assert.equal(manager.UpdateSourceData(),0,"radius changes without registration churn");
    source[field]=8;assert.equal(manager.UpdateSourceData(),1);
    assert.equal(source.UnregisterSecondaryLightSource(manager),true);
    assert.equal(manager.UpdateSourceData(),0);
  }
});

test("scene SH dispatch uses the receiver contract and absent manager preserves coefficients", () => {
  const scene=new EveSpaceScene(),lit=new EveSpaceObject2();let impostorCalls=0;
  const impostor={UpdateShLighting(){impostorCalls++;}};
  scene.shLightingManager=makeManager();lit.estimatedPixelDiameterWithChildren=10000;
  assert.equal(scene.UpdateShLighting([lit,impostor,null]),1);assert.equal(impostorCalls,0);
  lit.GetParentData().shLighting.fill(3);scene.shLightingManager=null;
  assert.equal(scene.UpdateShLighting([lit]),0);assert.ok(lit.GetParentData().shLighting.every(value=>value===3));
});

const shCorpus=process.env.SH_CORPUS_DIR;
test("real plasmacloud registration order and later scale changes preserve native live radius", {
  skip:!shCorpus&&"set SH_CORPUS_DIR for copied plasmacloud lighting fields"
}, async () => {
  const bytes=await readFile(join(shCorpus,"plasmaclouds.black"));
  assert.equal(createHash("md5").update(bytes).digest("hex"),"25a3cf0f38c1e8fcbb368a8d42026285");
  const values=CjsBlackFormat.readPayload(bytes).object;
  const root=()=>{const result=new EveEffectRoot2();result.scaling.set(values.scaling);result.secondaryLightingSphereRadius=values.secondaryLightingSphereRadius;result.secondaryLightingEmissiveColor.set(values.secondaryLightingEmissiveColor);return result;};
  const sample=(manager,distance=7200,cutoff=30)=>{const out=new Float32Array(28);manager.GetLighting([distance,0,0],1,cutoff,out);return Array.from(out);};
  const energy=values=>values.slice(0,27).reduce((sum,value)=>sum+Math.abs(value),0);
  const early=root(),late=root(),a=makeManager(),b=makeManager();
  early.RegisterSecondaryLightSource(a);early.UpdateSyncronous();
  late.UpdateSyncronous();late.RegisterSecondaryLightSource(b);
  a.UpdateSourceData();b.UpdateSourceData();
  const expected=sample(b);assert.ok(energy(expected)>0);assert.deepEqual(sample(a),expected);
  assert.equal(energy(sample(a,20000)),0);assert.equal(energy(sample(a,0.5)),0);assert.equal(energy(sample(a,7200,4000)),0);
  a.UpdateWithDirectionalLight([0,-1,0],[0,0,0]);assert.deepEqual(sample(a),expected,"authored zero-albedo emission is sun-independent");
  early.scaling.fill(1200);early.UpdateSyncronous();a.UpdateSourceData();
  assert.equal(energy(sample(a)),0,"shrinking after registration observes the new radius");
  assert.equal(sample(a)[27],1);
});
