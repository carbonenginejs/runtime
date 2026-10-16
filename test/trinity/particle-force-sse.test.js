import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { num } from "../../npm/dist/global/math/num.js";
import { Tr2ParticleAttractorForce, Tr2ParticleVortexForce, Tr2ParticleFluidDragForce } from "../../npm/dist/trinity/index.js";

const cases = JSON.parse(readFileSync(new URL("../global/math/fixtures/particle-force-sse-cases.json", import.meta.url), "utf8"));
const view = new DataView(new ArrayBuffer(4));
function fromBits(word) { view.setUint32(0,word,true); return view.getFloat32(0,true); }
function bits(value) { view.setFloat32(0,value,true); return view.getUint32(0,true); }

test("SSE reciprocal estimate retains measured precision and exceptional inputs", () =>
{
    assert.equal(num.reciprocalSqrtEstSse(4),0.49993896484375);
    assert.equal(num.reciprocalSqrtEstSse(0),Infinity);
    assert.equal(num.reciprocalSqrtEstSse(-0),-Infinity);
    assert.equal(num.reciprocalSqrtEstSse(2**-149),Infinity);
    assert.equal(num.reciprocalSqrtEstSse(Infinity),0);
    assert.ok(Number.isNaN(num.reciprocalSqrtEstSse(-1)));
});

test("particle forces reproduce the selected native SSE oracle bit for bit", () =>
{
    for (const [index,c] of cases.entries())
    {
        const attractor = new Tr2ParticleAttractorForce();
        const vortex = new Tr2ParticleVortexForce();
        const drag = new Tr2ParticleFluidDragForce();
        for (const force of [attractor,vortex])
        {
            force.position.set(c.target.map(fromBits));
            force.magnitude = fromBits(c.magnitude);
        }
        vortex.axis.set(c.axis.map(fromBits));
        drag.drag = fromBits(c.drag);
        const position = c.position.map(fromBits), velocity = c.velocity.map(fromBits);
        for (const [name,force] of [["attractor",attractor],["vortex",vortex],["fluid",drag]])
        {
            const out = force.GetForce(position,velocity,fromBits(c.dt),fromBits(c.mass));
            for(let axis=0;axis<3;axis++)
            {
                const expected = fromBits(c[name][axis]);
                if(Number.isNaN(expected)) assert.ok(Number.isNaN(out[axis]));
                else assert.equal(bits(out[axis]),c[name][axis],`${name} sample ${index} axis ${axis}`);
            }
        }
    }
});
