import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CjsSchema} from "../../npm/dist/global/schema/index.js";
import {BehaviorGroup,EveChildBehaviorSystem,EveUpdateContext,TriDevice} from "../../npm/dist/trinity/index.js";
import {CjsBlackFormat} from "../../npm/dist/resource/formats/black/index.js";

// Carbon EveUpdateContext.h:51-58 converts 100ns ticks to seconds;
// BehaviorGroup.cpp:524,600-620 clamps dt and integrates acceleration/velocity.
test("behavior updates consume seconds from Blue ticks without a second conversion",t=>{
  const group=new BehaviorGroup(),system=new EveChildBehaviorSystem(),context=new EveUpdateContext();
  t.after(()=>system.Destroy());group.SetCount(1);system.behaviorGroups=[group];
  system._behaviorGroupLoaded=system._behaviorGroupLoadedForTunnel=true;
  group.maxVelocity=1000;group.GetAgents()[0].velocity.set([60,0,0]);context.SetTime(10000000);
  for(let frame=1;frame<=60;frame++){
    context.SetTime(10000000+Math.round(frame*10000000/60));system.UpdateSyncronous(context,{});
  }
  assert.ok(Math.abs(group.GetAgents()[0].lifetime-1)<1e-6);
  assert.ok(Math.abs(group.GetAgents()[0].position[0]-60)<1e-4);
  context.SetTime(30000000);system.UpdateSyncronous(context,{});
  assert.ok(Math.abs(group.GetAgents()[0].lifetime-1.1)<1e-6,"native 0.1 second long-frame clamp");
  assert.ok(Math.abs(group.GetAgents()[0].position[0]-66)<1e-4);
});

for(const [key,label,authoredScale,authoredCounts] of [["CJS_MATIGU_BOIDS","exterior",100,[196,196]],["CJS_MATIGU_HANGAR_BOIDS","hangar",22,[120,125]]]){
  test(`real Matigu ${label} fish preserve authored scale and continuous second-based motion`,{skip:!process.env[key]},t=>{
    const document=CjsBlackFormat.read(readFileSync(process.env[key]),{emit:"json"}),groups=[];
    const walk=value=>{if(!value||typeof value!=="object")return;if(value._type==="BehaviorGroup")groups.push(value);for(const item of Object.values(value))walk(item);};
    walk(document);assert.equal(groups.length,2);assert.deepEqual(groups.map(g=>g.count),authoredCounts);
    const before=new Set(TriDevice.GetResourcesRegistered());
    t.after(()=>{for(const r of TriDevice.GetResourcesRegistered())if(!before.has(r))r.Destroy();});
    t.mock.method(Math,"random",()=>0.41);
    for(const values of groups){
      // Geometry loading is independent of the authored behavior graph.
      const group=CjsSchema.from(values._type,{...values,mesh:null}),system=new EveChildBehaviorSystem();
      system.behaviorGroups=[group];const context=new EveUpdateContext();context.SetTime(10000000);
      for(let frame=1;frame<=120;frame++){
        const positions=group.GetAgents().map(agent=>[...agent.position]);
        context.SetTime(10000000+Math.round(frame*10000000/60));system.UpdateSyncronous(context,{});
        if(positions.length)group.GetAgents().forEach((agent,index)=>{
          const distance=Math.hypot(...agent.position.map((v,axis)=>v-positions[index][axis]));
          assert.ok(distance<=group.maxVelocity*context.GetDeltaT()+0.001);
        });
      }
      assert.equal(group.scale,authoredScale);assert.equal(group.GetSize(),values.count);
      for(const agent of group.GetAgents())assert.ok(Math.abs(agent.lifetime-2)<1e-6);
    }
  });
}
