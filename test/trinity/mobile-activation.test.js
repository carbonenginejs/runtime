import assert from "node:assert/strict";
import test from "node:test";
import { EveMobile, EveShip2, EveSpaceObject2 } from "../../npm/dist/trinity/index.js";

test("EveMobile composes raw activation with freshly prepared damage activation without clamping or compounding", () =>
{
  for(const Class of [EveMobile,EveShip2])
  {
    const ship=new Class();
    ship.impactOverlay={GetActivationStrength:()=>0.4};
    for(const raw of [1,0.5,0,-0.5,1.5])
    {
      ship.activationStrength=raw;
      for(let repeat=0;repeat<2;repeat++)
      {
        assert.equal(ship.PrepareShaderData({}),undefined,"EveMobile.cpp:206 returns void");
        assert.ok(Math.abs(ship.spaceObjectShipData[1]-0.4*raw)<1e-7,"cpp:208-210 prepares base then multiplies y");
        assert.equal(ship.activationStrength,raw,"shader composition must not overwrite the authored input");
      }
    }
  }
  const base=new EveSpaceObject2();
  base.activationStrength=0.25;
  base.impactOverlay={GetActivationStrength:()=>0.4};
  base.PrepareShaderData({});
  assert.ok(Math.abs(base.spaceObjectShipData[1]-0.4)<1e-7,"the native override belongs to EveMobile, not its base");
});
