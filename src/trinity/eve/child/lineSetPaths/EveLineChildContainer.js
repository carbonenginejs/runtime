// Source: trinity/trinity/Eve/SpaceObject/Children/LineSetPaths/EveLineChildContainer.h
// Promoted from generated intake so its required IEveLineSetPath behavior remains explicit.
import { mat4 } from "#math/mat4";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { carbon, impl, io, type } from "#schema";
import { IEveLineSetPath } from "./IEveLineSetPath.js";


/** Groups line-path children beneath a shared transform with naming and visibility state. */
@type.define({ className: "EveLineChildContainer", family: "eve/child/lineSetPaths", purpose: "Groups line-path children beneath an EveChildTransform with shared naming and visibility state." })
export class EveLineChildContainer extends IEveLineSetPath
{

  #boundingSphere = sph3.create();

  #meshSize = 0;

  #parentTransform = mat4.create();

  #regenerate = false;

  /** m_isVisible (bool) [READ] */
  @io.read
  @type.boolean
  isVisible = true;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_display (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  display = true;

  /** m_lines (PIEveLineSetPathVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveLineSetPath")
  lines = [];

  /** Carbon invalidates generated points and bounds for every authored change. */
  @carbon.method
  @impl.implemented
  OnModified(_value = null)
  {
    this.#regenerate = true;
    return true;
  }

  /** Carbon invalidates generated points and bounds for every line-list change. */
  @carbon.method
  @impl.implemented
  OnListModified(_event = 0, _key = 0, _key2 = 0, _value = null, _list = null)
  {
    this.#regenerate = true;
  }

  /** Updates every child and rebuilds points or aggregate bounds when required. */
  @carbon.method
  @impl.implemented
  Update(updateContext, params)
  {
    let updateBounds = false;
    for (const line of this.lines)
    {
      updateBounds = line.Update(updateContext, params) || updateBounds;
    }

    if (this.#regenerate)
    {
      this.GeneratePoints();
      this.CalculateBoundingSphere();
      updateBounds = true;
    }
    else if (updateBounds)
    {
      // Known Carbon defect CE-21: `false` occupies the float mesh-size slot,
      // so children are recalculated through the default second argument. Keep
      // parity until the measured CarbonEngineJS adaptation lands deliberately.
      this.CalculateBoundingSphere(false);
    }
    return updateBounds;
  }

  /** Regenerates child points beneath this container's composed world transform. */
  @carbon.method
  @impl.implemented
  GeneratePoints(parentTransform = EveLineChildContainer.#identity)
  {
    if (!mat4.exactEquals(parentTransform, EveLineChildContainer.#identity))
    {
      this.UpdateTransform(parentTransform);
      mat4.copy(this.#parentTransform, parentTransform);
    }
    else
    {
      this.UpdateTransform(this.#parentTransform);
    }

    for (const line of this.lines)
    {
      line.GeneratePoints(this.worldTransform);
    }
    this.#regenerate = false;
  }

  /** Returns the sum of every child path's generated-point count. */
  @carbon.method
  @impl.implemented
  GetPointCount()
  {
    let count = 0;
    for (const line of this.lines)
    {
      count += Number(line.GetPointCount()) >>> 0;
    }
    return count;
  }

  /**
   * Rebuilds Carbon's intentionally loose preliminary sphere: the mean child
   * centre plus the largest centre distance and largest child radius.
   */
  @carbon.method
  @impl.implemented
  CalculateBoundingSphere(meshSize = 0, reCalculateChildren = true)
  {
    meshSize = Number(meshSize);
    if (meshSize !== 0)
    {
      this.#meshSize = meshSize;
    }
    else if (this.#meshSize !== 0)
    {
      meshSize = this.#meshSize;
    }

    if (this.lines.length === 0)
    {
      return;
    }

    if (reCalculateChildren)
    {
      for (const line of this.lines)
      {
        line.CalculateBoundingSphere(meshSize, true);
      }
    }

    const centre = vec3.create();
    const childSphere = sph3.create();
    let biggestRadius = 0;
    for (const line of this.lines)
    {
      line.GetBoundingSphere(childSphere);
      centre[0] += childSphere[0];
      centre[1] += childSphere[1];
      centre[2] += childSphere[2];
      biggestRadius = Math.max(biggestRadius, childSphere[3]);
    }
    vec3.scale(centre, centre, 1 / this.lines.length);

    let distanceSquared = 0;
    for (const line of this.lines)
    {
      line.GetBoundingSphere(childSphere);
      const x = childSphere[0] - centre[0];
      const y = childSphere[1] - centre[1];
      const z = childSphere[2] - centre[2];
      distanceSquared = Math.max(distanceSquared, x * x + y * y + z * z);
    }
    sph3.set(this.#boundingSphere, centre[0], centre[1], centre[2], Math.sqrt(distanceSquared) + biggestRadius);
  }

  /** Writes the aggregate sphere after applying this container's local transform. */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(out = vec4.create())
  {
    return sph3.transformMat4(out, this.#boundingSphere, this.localTransform);
  }

  /** Culls the container before forwarding visibility to every child path. */
  @carbon.method
  @impl.implemented
  UpdateVisibility(frustum, parentLod, systemLocation)
  {
    if (!this.display)
    {
      return;
    }

    const sphere = sph3.transformMat4(vec4.create(), this.#boundingSphere, this.worldTransform);
    if (!frustum.IsSphereVisible(sphere))
    {
      this.isVisible = false;
      return;
    }

    this.isVisible = true;
    for (const line of this.lines)
    {
      line.UpdateVisibility(frustum, parentLod, systemLocation);
    }
  }

  /** Forwards line emission while both authored and computed visibility permit it. */
  @carbon.method
  @impl.implemented
  AddLinesToSet(lineSet, color, animationColor, scrollSpeed)
  {
    if (!this.display || !this.isVisible)
    {
      return;
    }
    for (const line of this.lines)
    {
      line.AddLinesToSet(lineSet, color, animationColor, scrollSpeed);
    }
  }

  /** Carbon declares no container-specific debug options. */
  @carbon.method
  @impl.noop
  GetDebugOptions(_options)
  {
  }

  static #identity = mat4.create();

}
