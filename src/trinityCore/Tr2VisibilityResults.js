// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Tr2VisibilityResults.h
//   trinity/trinity/Tr2VisibilityResults.cpp
//   trinity/trinity/Tr2VisibilityResults_Blue.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";


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

  static EventType = Object.freeze({
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

}


/**
 * Collects the visibility events a visibility executor emits, for the interior
 * and portal consumers to read back.
 */
@type.define({ className: "Tr2VisibilityResults", family: "trinityCore" })
export class Tr2VisibilityResults extends CjsModel
{

  // Carbon's m_events is private transient execution state, not Blue data.
  #events = [];

  /** Adds the value-like visibility event emitted by a visibility executor. */
  @carbon.method
  @impl.adapted
  AddVisibilityEvent(event)
  {
    this.#events.push(event);
  }

  /** Returns a detached container view of the current visibility events. */
  @carbon.method
  @impl.adapted
  GetEvents()
  {
    return this.#events.slice();
  }

  /** Clears the result set. */
  @carbon.method
  @impl.implemented
  Clear()
  {
    this.#events.length = 0;
  }

  /** Gets the number of visibility events in the result set. */
  @carbon.method
  @impl.implemented
  GetNumVisibilityEvents()
  {
    return this.#events.length;
  }

}
