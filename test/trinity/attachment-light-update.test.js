import assert from "node:assert/strict";
import test from "node:test";
import { EveSpaceObject2 } from "../../npm/dist/trinity/index.js";

test("root async update passes current bone palette and shader gains to attachments before impact overlay", () =>
{
  const root=new EveSpaceObject2(), bones=new Float32Array(24), calls=[];
  root.animationUpdater={IsInitialized:()=>true,GetMeshBoneCount:()=>2,GetMeshBoneMatrixList:()=>bones};
  root.spaceObjectShipData[0]=0.75;
  root.impactOverlay={GetActivationStrength:()=>0.4,GetDataTextureOffset:()=>0,UpdateAsyncronous(){calls.push("impact");}};
  root.attachments=[{UpdateLights(...args){calls.push(args);}}];
  root.isVisible=false;
  root.UpdateAsyncronous({currentTime:1});
  assert.equal(calls.length,2,"EveSpaceObject2.cpp:733-749 updates lights even when controller frequency is zero");
  assert.equal(calls[0][0],root.worldTransform);
  assert.equal(calls[0][1],bones,"borrow the current palette, never copy or mutate it");
  assert.equal(calls[0][2],2);
  assert.ok(Math.abs(calls[0][3]-0.4)<1e-7);
  assert.equal(calls[0][4],0.75);
  assert.equal(calls[1],"impact");
  assert.deepEqual(Array.from(bones),new Array(24).fill(0));
  calls.length=0;root.update=false;root.UpdateAsyncronous({currentTime:2});
  assert.equal(calls.length,0,"cpp:635-639 update=false skips the entire update");
  root.update=true;root.animationUpdater=null;root.UpdateAsyncronous({currentTime:3});
  assert.equal(calls[0][1],null);assert.equal(calls[0][2],0,"native uninitialized/no palette contract");
});
