// Source: trinity/trinity/Tr2VisibilityResults.h
//   trinity/trinity/Tr2VisibilityResults.cpp
//   trinity/trinity/Tr2VisibilityResults_Blue.cpp

import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";
import { blueEnums, EnumRegistrationType } from "#blue/enums/CjsBlueEnumRegistry";

/** Tr2VisibilityEvent::EventType bits. */
const EventType = Object.freeze({
  QUERY_BEGIN: 1 << 0,
  QUERY_END: 1 << 1,
  PORTAL_ENTER: 1 << 2,
  PORTAL_EXIT: 1 << 3,
  PORTAL_PRE_EXIT: 1 << 4,
  CELL_IMMEDIATE_REPORT: 1 << 5,
  VIEW_PARAMETERS_CHANGED: 1 << 6,
  INSTANCE_VISIBLE: 1 << 7,
  REMOVAL_SUGGESTED: 1 << 8,
  INSTANCE_IMMEDIATE_REPORT: 1 << 9,
  REGION_OF_INFLUENCE_ACTIVE: 1 << 10,
  REGION_OF_INFLUENCE_INACTIVE: 1 << 11,
  STENCIL_MASK: 1 << 12,
  TEXT_MESSAGE: 1 << 13,
  DRAW_LINE_2D: 1 << 14,
  DRAW_LINE_3D: 1 << 15,
  DRAW_BUFFER: 1 << 16,
  OCCLUSION_QUERY_BEGIN: 1 << 17,
  OCCLUSION_QUERY_END: 1 << 18,
  OCCLUSION_QUERY_GET_RESULT: 1 << 19,
  OCCLUSION_QUERY_DRAW_DEPTH_TEST: 1 << 20,
  INSTANCE_DRAW_DEPTH: 1 << 21,
  FLUSH_DEPTH: 1 << 22,
  DEPTH_PASS_BEGIN: 1 << 23,
  DEPTH_PASS_END: 1 << 24,
  COLOR_PASS_BEGIN: 1 << 25,
  COLOR_PASS_END: 1 << 26,
  TILE_BEGIN: 1 << 27,
  TILE_END: 1 << 28,
  FLUSH_GPU_COMMAND_BUFFER: 1 << 29
});

// Source: trinity/trinity/RenderJob/TriStepFilterVisibilityResults_Blue.cpp:7
blueEnums.Create("trinity.TRIVISIBILITY_EVENT_TYPE", EventType, {
  exposedName: "TRIVISIBILITY_EVENT_TYPE", exposure: EnumRegistrationType.ENUM_REG_VALUES_ON_MODULE,
  chooser: [
    { name: "TRIVISIBILITY_QUERY_BEGIN", value: EventType.QUERY_BEGIN, description: "Begin of visibility query" },
    { name: "TRIVISIBILITY_QUERY_END", value: EventType.QUERY_END, description: "End of visibility query" },
    { name: "TRIVISIBILITY_PORTAL_ENTER", value: EventType.PORTAL_ENTER, description: "Enter a portal or mirror" },
    { name: "TRIVISIBILITY_PORTAL_EXIT", value: EventType.PORTAL_EXIT, description: "Exit a portal or mirror" },
    { name: "TRIVISIBILITY_PORTAL_PRE_EXIT", value: EventType.PORTAL_PRE_EXIT, description: "Before exiting a portal or mirror" },
    { name: "TRIVISIBILITY_CELL_IMMEDIATE_REPORT", value: EventType.CELL_IMMEDIATE_REPORT, description: "Entering a cell" },
    { name: "TRIVISIBILITY_VIEW_PARAMETERS_CHANGED", value: EventType.VIEW_PARAMETERS_CHANGED, description: "View parameters changed" },
    { name: "TRIVISIBILITY_INSTANCE_VISIBLE", value: EventType.INSTANCE_VISIBLE, description: "Object or light instance visible" },
    { name: "TRIVISIBILITY_REMOVAL_SUGGESTED", value: EventType.REMOVAL_SUGGESTED, description: "" },
    { name: "TRIVISIBILITY_INSTANCE_IMMEDIATE_REPORT", value: EventType.INSTANCE_IMMEDIATE_REPORT, description: "" },
    { name: "TRIVISIBILITY_REGION_OF_INFLUENCE_ACTIVE", value: EventType.REGION_OF_INFLUENCE_ACTIVE, description: "Entering a light region of influence" },
    { name: "TRIVISIBILITY_REGION_OF_INFLUENCE_INACTIVE", value: EventType.REGION_OF_INFLUENCE_INACTIVE, description: "Exiting a light region of influence" },
    { name: "TRIVISIBILITY_STENCIL_MASK", value: EventType.STENCIL_MASK, description: "" },
    { name: "TRIVISIBILITY_TEXT_MESSAGE", value: EventType.TEXT_MESSAGE, description: "" },
    { name: "TRIVISIBILITY_DRAW_LINE_2D", value: EventType.DRAW_LINE_2D, description: "" },
    { name: "TRIVISIBILITY_DRAW_LINE_3D", value: EventType.DRAW_LINE_3D, description: "" },
    { name: "TRIVISIBILITY_DRAW_BUFFER", value: EventType.DRAW_BUFFER, description: "" },
    { name: "TRIVISIBILITY_OCCLUSION_QUERY_BEGIN", value: EventType.OCCLUSION_QUERY_BEGIN, description: "" },
    { name: "TRIVISIBILITY_OCCLUSION_QUERY_END", value: EventType.OCCLUSION_QUERY_END, description: "" },
    { name: "TRIVISIBILITY_OCCLUSION_QUERY_GET_RESULT", value: EventType.OCCLUSION_QUERY_GET_RESULT, description: "" },
    { name: "TRIVISIBILITY_OCCLUSION_QUERY_DRAW_DEPTH_TEST", value: EventType.OCCLUSION_QUERY_DRAW_DEPTH_TEST, description: "" },
    { name: "TRIVISIBILITY_INSTANCE_DRAW_DEPTH", value: EventType.INSTANCE_DRAW_DEPTH, description: "" },
    { name: "TRIVISIBILITY_FLUSH_DEPTH", value: EventType.FLUSH_DEPTH, description: "" },
    { name: "TRIVISIBILITY_DEPTH_PASS_BEGIN", value: EventType.DEPTH_PASS_BEGIN, description: "" },
    { name: "TRIVISIBILITY_DEPTH_PASS_END", value: EventType.DEPTH_PASS_END, description: "" },
    { name: "TRIVISIBILITY_COLOR_PASS_BEGIN", value: EventType.COLOR_PASS_BEGIN, description: "" },
    { name: "TRIVISIBILITY_COLOR_PASS_END", value: EventType.COLOR_PASS_END, description: "" },
    { name: "TRIVISIBILITY_TILE_BEGIN", value: EventType.TILE_BEGIN, description: "" },
    { name: "TRIVISIBILITY_TILE_END", value: EventType.TILE_END, description: "" },
    { name: "TRIVISIBILITY_FLUSH_GPU_COMMAND_BUFFER", value: EventType.FLUSH_GPU_COMMAND_BUFFER, description: "" }
  ]
});


/**
 * Carbon's Tr2VisibilityEvent struct - the shared shape producers push into
 * Tr2VisibilityResults and the interior/portal visibility consumers read.
 * Plain data, not Blue-exposed.
 */
export class Tr2VisibilityEvent
{

  userData = null;

  objectToWorldMatrix = mat4.create();

  clipPlane = vec4.create();

  /** Tr2Rect scissor - left/top/right/bottom in pixels. */
  scissorRect = { left: 0, top: 0, right: 0, bottom: 0 };

  stencilWrite = 0;

  stencilTest = 0;

  mirrorIndex = -1;

  eventType = Tr2VisibilityEvent.EventType.INSTANCE_VISIBLE;

  useClipPlane = false;

  isMirroredInLeftHandedSpace = false;

  static EventType = EventType;

}
