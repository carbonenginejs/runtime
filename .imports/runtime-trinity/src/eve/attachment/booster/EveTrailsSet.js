// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveTrailsSet.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveTrailsSet.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


/**
 * Holds the booster trail placements a hull emits, together with the mesh
 * resource and effect a renderer draws them with.
 */
@type.define({ className: "EveTrailsSet", family: "eve/attachment/boosters" })
export class EveTrailsSet extends CjsModel
{

  /** m_geometryResource (TriGeometryResPtr) [READ] */
  @io.read
  @type.objectRef("TriGeometryRes")
  geometryResource = null;

  /** m_fadeSpeed (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  fadeSpeed = 1;

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @io.rebuild("packedGeometry")
  @io.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  /** m_geometryResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @io.rebuild("geometry")
  @io.notify
  @io.persist
  @type.string
  geometryResPath = "";

  /** m_display (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  display = true;

  #trailData = [];

  #revision = 0;

  /** Bumps the revision so an adapter re-reads the trail data on its next pass. */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.#revision++;
    return true;
  }

  /**
   * Bumps the revision after a property change so an adapter re-reads the trail
   * data.
   */
  @carbon.method
  @impl.adapted
  OnModified()
  {
    this.#revision++;
    return true;
  }

  /**
   * Accepts the per-frame update; the set itself holds no time-varying state,
   * because trail motion lives on each booster renderable's spline.
   */
  @carbon.method
  @impl.implemented
  Update()
  {
  }

  /** Drops every trail placement and bumps the revision. */
  @carbon.method
  @impl.adapted
  Clear()
  {
    this.#trailData.length = 0;
    this.#revision++;
  }

  /**
   * Appends a trail placement with its size, cloning the transform; throws a
   * TypeError when localMatrix is not sixteen values.
   */
  @carbon.method
  @impl.implemented
  Add(localMatrix, size)
  {
    if (!localMatrix || localMatrix.length !== 16)
    {
      throw new TypeError("EveTrailsSet transforms must contain 16 values");
    }
    this.#trailData.push({
      transform: mat4.clone(localMatrix),
      size: Number(size) || 0
    });
    this.#revision++;
  }

  /** The authored rate at which a trail fades out behind its booster. */
  @carbon.method
  @impl.implemented
  GetFadeSpeed()
  {
    return this.fadeSpeed;
  }

  /** Sets the effect that draws the trails. */
  @carbon.method
  @impl.implemented
  SetEffect(effect)
  {
    this.effect = effect ?? null;
  }

  /**
   * Sets the trail mesh resource path and bumps the revision; resolving the path
   * to a resource is the host's job.
   */
  @carbon.method
  @impl.adapted
  SetMeshResPath(path)
  {
    this.geometryResPath = String(path ?? "");
    this.#revision++;
  }

  /**
   * Attaches a resolved trail geometry resource, bumping the revision only when
   * the resource actually changes.
   */
  @carbon.method
  @impl.adapted
  SetGeometryResource(resource)
  {
    if (this.geometryResource !== resource)
    {
      this.geometryResource = resource ?? null;
      this.#revision++;
    }
  }

  /**
   * The trail placements as deep copies, safe for an adapter to keep past the
   * next Clear or Add.
   */
  @carbon.method
  @impl.adapted
  GetTrailData()
  {
    return this.#trailData.map(trail => ({
      transform: mat4.clone(trail.transform),
      size: trail.size
    }));
  }

  /**
   * A counter bumped whenever the trail placements, mesh path or geometry
   * resource change, so an adapter can tell its packed data is stale.
   */
  @carbon.method
  @impl.implemented
  GetRevision()
  {
    return this.#revision;
  }

}
