// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { blue } from "#blue";

export const DestinationType = Object.freeze({
  OWNER: 0,
  CHILD: 1
});
export const PlayAction = Object.freeze({
  PLAY: 0,
  ENQUEUE_PLAY: 1
});
export const ResetBehavior = Object.freeze({
  OBJECT_CENTER: 0,
  LAST_DAMAGELOCATOR_HIT: 1,
  CUSTOM: 2
});
export const StopAction = Object.freeze({
  STOP: 0,
  ENQUEUE_STOP: 1,
  NONE: 2
});
export const Type = Object.freeze({
  FLOAT: 0,
  INTEGER: 1,
  BOOLEAN: 2,
  ENUM: 3
});
export const UnlinkReason = Object.freeze({
  UNLINKING: 0,
  DELETING: 1
});

// Carbon gives this a chooser (trinity/trinity/Controllers/Actions/Tr2ActionPlayMeshAnimation_Blue.cpp:11) but never registers it,
// so it takes no exposure.
blue.enums.RegisterEnum("trinity.Tr2ActionPlayMeshAnimation.PlayAction", PlayAction, {
  source: "trinity/trinity/Controllers/Actions/Tr2ActionPlayMeshAnimation.h", family: "controllers", line: 14,
  chooserSource: "trinity/trinity/Controllers/Actions/Tr2ActionPlayMeshAnimation_Blue.cpp:11",
  chooser: [
    { name: "Play", value: PlayAction.PLAY, description: "Play animation immediately" },
    { name: "Enqueue Play", value: PlayAction.ENQUEUE_PLAY, description: "Play animation after all other animations complete" }
  ]
});

// Carbon gives this a chooser (trinity/trinity/Controllers/Actions/Tr2ActionPlayMeshAnimation_Blue.cpp:16) but never registers it,
// so it takes no exposure.
blue.enums.RegisterEnum("trinity.Tr2ActionPlayMeshAnimation.StopAction", StopAction, {
  source: "trinity/trinity/Controllers/Actions/Tr2ActionPlayMeshAnimation.h", family: "controllers", line: 19,
  chooserSource: "trinity/trinity/Controllers/Actions/Tr2ActionPlayMeshAnimation_Blue.cpp:16",
  chooser: [
    { name: "Stop", value: StopAction.STOP, description: "Stop animation immediately" },
    { name: "Enqueue Stop", value: StopAction.ENQUEUE_STOP, description: "Stop animation after loop finishes" },
    { name: "None", value: StopAction.NONE, description: "Do not stop animation" }
  ]
});

// Carbon gives this a chooser (trinity/trinity/Controllers/Actions/Tr2ActionPlayMeshAnimation_Blue.cpp:22) but never registers it,
// so it takes no exposure.
blue.enums.RegisterEnum("trinity.Tr2ActionPlayMeshAnimation.DestinationType", DestinationType, {
  source: "trinity/trinity/Controllers/Actions/Tr2ActionPlayMeshAnimation.h", family: "controllers", line: 25,
  chooserSource: "trinity/trinity/Controllers/Actions/Tr2ActionPlayMeshAnimation_Blue.cpp:22",
  chooser: [
    { name: "Owner", value: DestinationType.OWNER, description: "Action affects the owner" },
    { name: "Child", value: DestinationType.CHILD, description: "Action affect a child object" }
  ]
});

// Carbon gives this a chooser (trinity/trinity/Controllers/Actions/Tr2ActionResetClipSphereCenter_Blue.cpp:10) but never registers it,
// so it takes no exposure.
blue.enums.RegisterEnum("trinity.Tr2ActionResetClipSphereCenter.ResetBehavior", ResetBehavior, {
  source: "trinity/trinity/Controllers/Actions/Tr2ActionResetClipSphereCenter.h", family: "controllers", line: 13,
  chooserSource: "trinity/trinity/Controllers/Actions/Tr2ActionResetClipSphereCenter_Blue.cpp:10",
  chooser: [
    { name: "Object Center", value: ResetBehavior.OBJECT_CENTER, description: "Sets the clipsphere to the center of the object" },
    { name: "Last Hit Damage Locator", value: ResetBehavior.LAST_DAMAGELOCATOR_HIT, description: "Sets the clipsphere to the last damage locator hit. If there has no damage locator been hit, then a random one is selected" },
    { name: "Custom", value: ResetBehavior.CUSTOM, description: "Sets the clipsphere to the locator defined in 'locatorSetName' and 'locatorIndex'" }
  ]
});

// Carbon gives this a chooser (trinity/trinity/Controllers/Tr2ControllerFloatVariable_Blue.cpp:9) but never registers it,
// so it takes no exposure.
blue.enums.RegisterEnum("trinity.Tr2ControllerFloatVariable.Type", Type, {
  source: "trinity/trinity/Controllers/Tr2ControllerFloatVariable.h", family: "controllers", line: 10,
  chooserSource: "trinity/trinity/Controllers/Tr2ControllerFloatVariable_Blue.cpp:9",
  chooser: [
    { name: "Float", value: Type.FLOAT, description: "Floating point value" },
    { name: "Integer", value: Type.INTEGER, description: "Integer value" },
    { name: "Boolean", value: Type.BOOLEAN, description: "Boolean value" },
    { name: "Enum", value: Type.ENUM, description: "Enumerated value" }
  ]
});
