// Shared behavior enums declared by Carbon's IBehavior contracts.
import { blue, EnumRegistrationType } from "#blue";

export const LocatorType = Object.freeze({
  LOCAL_LOCATORS: 0,
  PARENT_LOCATORS: 1,
  TARGET_LOCATORS: 2,
});

export const PlaneType = Object.freeze({
  X: 0,
  Y: 1,
  Z: 2,
});

export const ProcessPriority = Object.freeze({
  LEAST_PRIORITY: 0,
  LESS_PRIORITY: 1,
  MORE_PRIORITY: 3,
  MOST_PRIORITY: 4,
  COUNT: 5,
});

export const TunnelGroupType = Object.freeze({
  EXIT_TUNNELS: 0,
  ENTRANCE_TUNNELS: 1,
  OTHER_TUNNELS: 2,
});

// Registered as Carbon registers it (trinity/trinity/Eve/SpaceObject/Children/Behaviors/Allign_Blue.cpp:17).
blue.enums.RegisterEnum("trinity.IBehavior.ProcessPriority", ProcessPriority, {
  source: "trinity/trinity/Eve/SpaceObject/Children/Behaviors/IBehavior.h", family: "eve/child/behaviors", line: 18,
  exposedName: "BehaviorPriority", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/SpaceObject/Children/Behaviors/Allign_Blue.cpp:8",
  chooser: [
    { name: "LEAST_PRIORITY", value: ProcessPriority.LEAST_PRIORITY, description: "Has the lowest priority" },
    { name: "LESS_PRIORITY", value: ProcessPriority.LESS_PRIORITY, description: "Second to lowest priority" },
    { name: "MORE_PRIORITY", value: ProcessPriority.MORE_PRIORITY, description: "second highest priority" },
    { name: "MOST_PRIORITY", value: ProcessPriority.MOST_PRIORITY, description: "highest priority" }
  ]
});

// Registered as Carbon registers it (trinity/trinity/Eve/SpaceObject/Children/Behaviors/FollowASpline_Blue.cpp:14).
blue.enums.RegisterEnum("trinity.SplineTunnelGroup.TunnelGroupType", TunnelGroupType, {
  source: "trinity/trinity/Eve/SpaceObject/Children/Behaviors/SplineTunnelGroup.h", family: "eve/child/behaviors", line: 68,
  exposedName: "setTunnelType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/SpaceObject/Children/Behaviors/FollowASpline_Blue.cpp:8",
  chooser: [
    { name: "Exit_Tunnels", value: TunnelGroupType.EXIT_TUNNELS, description: "Tunnels Drones flock to when set to exit the scene" },
    { name: "Entrance_Tunnels", value: TunnelGroupType.ENTRANCE_TUNNELS, description: "Tunnels Drones flock to when entering the scene" },
    { name: "Other_Tunnels", value: TunnelGroupType.OTHER_TUNNELS, description: "pathways in the scene (hallways etc)" }
  ]
});
