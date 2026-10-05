// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/SplineTunnelGroup.h
import { INotify } from "../../../../../global/blue/INotify.js";
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/SplineTunnelGroup.cpp
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { BLUELISTEVENT } from "#consts/blue";
import { TunnelGroupType } from "../enums.js";
import { SplineTunnel } from "./SplineTunnel.js";
import { SplineTunnelPoint } from "./SplineTunnelPoint.js";

const DEBUG_TRANSFORM = mat4.create();
const DEBUG_START = vec3.create();
const DEBUG_END = vec3.create();

/** SplineTunnelGroup (eve/child/behaviors) - generated from schema shapeHash da595535.... */
@meta.define({ className: "SplineTunnelGroup", family: "eve" })
@meta.blue.inherit(INotify)
@meta.blue.interface(INotify)
export class SplineTunnelGroup
{
  static TunnelGroupType = TunnelGroupType;

  /** CPU spline tunnel records rebuilt from the authored curve sets. */
  tunnels = [];

  /** m_tunnelGroupType (TunnelGroupType - enum TunnelGroupType) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.SplineTunnelGroup.TunnelGroupType")
  tunnelGroupType = 2;

  /** m_curveSets (PTr2CurveVector3Vector) [READ, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2CurveVector3")
  curveSets = [];

  /** m_numBreakPoints (int32_t) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  breakPoints = 2;

  /** m_tunnelWidth (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  tunnelWidth = 15;

  /** m_entrancePullSize (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  entrancePullSize = 50;

  /** m_entrySize (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  entrySize = 20;

  // Owner callback into the system/behavior tunnel registry (Carbon
  // m_changeSystemTunnelRegistry) and its debug color.
  _changeSystemTunnelRegistry = null;

  _debugColor = 0xffffff00;

  // Re-entrancy guard: the registry callback may ask for the tunnels while
  // they are being rebuilt.
  _creatingTunnels = false;

  /** Carbon SplineTunnelGroup::GetTunnelGroupType (cpp:24-27). */
  @meta.blue.method
  @meta.implemented
  GetTunnelGroupType()
  {
    return this.tunnelGroupType;
  }

  /**
   * Stores the owner's tunnel-registry callback and debug color, then
   * rebuilds the tunnels (Carbon SetSystemTunnelFunctionReferenceAndColor,
   * cpp:30-35).
   * @param {Function} callback
   * @param {Number} color - debug color (retained for parity; debug rendering is omitted)
   */
  @meta.blue.method
  @meta.implemented
  SetSystemTunnelFunctionReferenceAndColor(callback, color = 0xffffff00)
  {
    this._changeSystemTunnelRegistry = callback;
    this._debugColor = color >>> 0;
    this.createSplineTunnels();
  }

  /**
   * Carbon method createSplineTunnels -> CreateSplineTunnels (cpp:37-79): one tunnel per curve, sampled at
   * breakPoints + 2 evenly spaced times, each point facing the next; then the registry callback, when one is set.
   *
   * Adapted: a re-entrant call (the callback reading GetTunnels) returns the tunnels being built instead of starting
   * again, and the tunnels are returned.
   */
  @meta.blue.method
  @meta.renamed("createSplineTunnels")
  @meta.adapted
  createSplineTunnels()
  {
    if (this._creatingTunnels)
    {
      return this.tunnels;
    }
    this._creatingTunnels = true;
    try
    {
      this.tunnels.length = 0;
      const breakPoints = this.GetNumBreakPoints();
      for (const curve of this.curveSets)
      {
        const duration = curve.Length();
        const step = duration / (breakPoints + 1);
        const positions = [];
        for (let index = 0; index < breakPoints + 2; index++)
        {
          positions.push(curve.GetValue(index * step, vec3.create()));
        }

        const tunnel = new SplineTunnel();
        for (let index = 0; index < positions.length; index++)
        {
          const point = new SplineTunnelPoint();
          vec3.copy(point.pos, positions[index]);
          const previous = index === positions.length - 1 ? positions[index - 1] : positions[index];
          const next = index === positions.length - 1 ? positions[index] : positions[index + 1];
          vec3.subtract(point.rot, next, previous);
          tunnel.splinePoints.push(point);
        }
        tunnel.cylWidth = this.tunnelWidth;
        tunnel.pullSize = this.entrancePullSize;
        tunnel.pointOfNoReturnSize = this.entrySize;
        tunnel.tunnelGroupType = this.tunnelGroupType;
        this.tunnels.push(tunnel);
      }
    }
    finally
    {
      this._creatingTunnels = false;
    }
    if (this._changeSystemTunnelRegistry)
    {
      this._changeSystemTunnelRegistry();
    }
    return this.tunnels;
  }

  /** Carbon SplineTunnelGroup::OnListModified. */
  @meta.blue.method
  @meta.implemented
  OnListModified(event, _key = 0, _key2 = 0, _value = null, list = null)
  {
    if (list !== this.curveSets) return;
    const maskedEvent = Number(event) & BLUELISTEVENT.BELIST_EVENTMASK;
    if ([BLUELISTEVENT.BELIST_INSERTED, BLUELISTEVENT.BELIST_REMOVED, BLUELISTEVENT.BELIST_LOADFINISHED].includes(maskedEvent))
    {
      this.createSplineTunnels();
    }
  }

  /**
   * Returns the tunnel records (Carbon GetTunnels, cpp:81-84).
   *
   * Adapted: builds them on first access when curves are present, since the JS load path raises no curve-set list
   * notify to trigger the first CreateSplineTunnels.
   */
  @meta.blue.method
  @meta.adapted
  GetTunnels()
  {
    if (this.tunnels.length === 0 && this.curveSets.length !== 0 && !this._creatingTunnels)
    {
      this.createSplineTunnels();
    }
    return this.tunnels;
  }

  /** Carbon SplineTunnelGroup::GetCurveSets (cpp:86-89). */
  @meta.blue.method
  @meta.implemented
  GetCurveSets()
  {
    return this.curveSets;
  }

  /** Carbon SplineTunnelGroup::SetNumBreakPoints (cpp:91-94). */
  @meta.blue.method
  @meta.implemented
  SetNumBreakPoints(value)
  {
    this.breakPoints = Number(value) | 0;
  }

  /** Carbon SplineTunnelGroup::GetNumBreakPoints (cpp:96-99). */
  @meta.blue.method
  @meta.implemented
  GetNumBreakPoints()
  {
    return Math.max(this.breakPoints, 0);
  }

  /** Carbon SplineTunnelGroup::Initialize (cpp:104-107). */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    this.createSplineTunnels();
    return true;
  }

  /** Carbon SplineTunnelGroup::OnModified (cpp:112-117): any property change
   * rebuilds the tunnels. */
  @meta.blue.method
  @meta.implemented
  OnModified(_value = null)
  {
    this.createSplineTunnels();
    return true;
  }

  /**
   * Registers this group's "SplineTunnels" debug option in the caller's option
   * bag (Set-like add or insert) and returns that bag.
   *
   * Adapted: Adds option strings through the supplied collection's add or insert method; the
   * debug adapter retains its capability checks.
   */
  @meta.blue.method
  @meta.adapted
  GetDebugOptions(options = new Set())
  {
    if (options?.add) options.add("SplineTunnels");
    else options?.insert?.("SplineTunnels");
    return options;
  }

  /**
   * Draws every tunnel's shape: pull and point-of-no-return spheres at its first spline point, a marker sphere at its last, and a cylWidth cylinder along each point's direction vector.
   *
   * Adapted: Emits Carbon's tunnel primitives through an injected
   * ITr2DebugRenderer2-compatible capability.
   *
   * @param {Object} renderer - injected debug renderer capability
   * @param {Float32Array} [parentWorldLocation] - places the tunnel geometry in world space
   */
  @meta.blue.method
  @meta.adapted
  RenderDebugInfo(renderer, parentWorldLocation = mat4.create())
  {
    for (const tunnel of this.tunnels)
    {
      const points = tunnel?.splinePoints ?? [];
      if (!points.length) continue;
      const first = points[0];
      const last = points[points.length - 1];
      mat4.translate(DEBUG_TRANSFORM, parentWorldLocation, first.pos);
      renderer?.DrawSphere?.(this, DEBUG_TRANSFORM, tunnel.pullSize, 6, 0, 0xff551111);
      renderer?.DrawSphere?.(this, DEBUG_TRANSFORM, tunnel.pointOfNoReturnSize, 6, 0, 0xff551111);
      mat4.translate(DEBUG_TRANSFORM, parentWorldLocation, last.pos);
      renderer?.DrawSphere?.(this, DEBUG_TRANSFORM, 5, 6, 0, 0xff335555);
      for (const point of points)
      {
        mat4.translate(DEBUG_TRANSFORM, parentWorldLocation, point.pos);
        renderer?.DrawSphere?.(this, DEBUG_TRANSFORM, tunnel.cylWidth, 6, 0, 0xff555555);
        vec3.add(DEBUG_END, point.pos, point.rot);
        vec3.transformMat4(DEBUG_START, point.pos, parentWorldLocation);
        vec3.transformMat4(DEBUG_END, DEBUG_END, parentWorldLocation);
        renderer?.DrawCylinder?.(this, DEBUG_START, DEBUG_END, tunnel.cylWidth, 8, 0, this._debugColor);
      }
    }
  }

}

// Exact native Blue exposure: only these identities participate in loading.
