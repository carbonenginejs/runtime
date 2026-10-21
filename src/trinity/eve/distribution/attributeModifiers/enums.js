// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { blueEnums, EnumRegistrationType } from "#blue/enums/CjsBlueEnumRegistry";

export const DistributionEntityLifeTimeEvent = Object.freeze({
  DO_NOTHING: 0,
  KILL_ENTITY: 1,
  KILL_AND_SPAWN_NEW_FROM_DISTRIBUTION: 2,
  KILL_AND_SPAWN_NEW_FROM_INITIAL_POSITION: 3,
  KILL_AND_SPAWN_NEW_FROM_CURRENT_POSITION: 4,
});

// Registered as Carbon registers it (trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionAttributeModifiers/EveDistributionModifierProcessLifetime_Blue.cpp:15).
blueEnums.Create("trinity.lifetimeEvent", DistributionEntityLifeTimeEvent, {
  exposedName: "lifetimeEvent", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "Do nothing", value: DistributionEntityLifeTimeEvent.DO_NOTHING, description: "do nothing, use for debug only" },
    { name: "Kill entity", value: DistributionEntityLifeTimeEvent.KILL_ENTITY, description: "destroy precessed entity when lifeTime > eventAtTime" },
    { name: "Kill and Spawn new", value: DistributionEntityLifeTimeEvent.KILL_AND_SPAWN_NEW_FROM_DISTRIBUTION, description: "kill + creates a new random entity by parent Distribution" },
    { name: "Kill and spawn from my initial placement", value: DistributionEntityLifeTimeEvent.KILL_AND_SPAWN_NEW_FROM_INITIAL_POSITION, description: "kill + creates a new entity from the same initial parameters" },
    { name: "Kill and spawn new from current location", value: DistributionEntityLifeTimeEvent.KILL_AND_SPAWN_NEW_FROM_CURRENT_POSITION, description: "kill + creates a new entity from the current parameters" }
  ]
});
