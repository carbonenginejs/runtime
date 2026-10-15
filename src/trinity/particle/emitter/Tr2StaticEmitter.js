// Source: trinity/trinity/Particle/Tr2StaticEmitter.h
// Source: trinity/trinity/Particle/Tr2StaticEmitter.cpp
import { be, IsMatch } from "#blue";
import { ResourceRequirement } from "#resource";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import * as CcpLog from "../../../global/logging/ccpLog.js";
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { ITr2GenericEmitter } from "../ITr2GenericEmitter/index.js";
import { Tr2ParticleElementDeclarationName } from "../element/Tr2ParticleElementDeclarationName.js";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { CarbonUsageFromChannel, CarbonUsageFromCmf } from "../../core/vertex/vertexUsage.js";

/**
 * One particle element's source in the geometry: Carbon's DeclarationMapping
 * (Tr2StaticEmitter.h:61-76).
 *
 * @typedef {object} Tr2StaticEmitterMapping
 * @property {ArrayLike<number>|null} channel The vertex channel the element reads, or null.
 * @property {number} components Components per vertex in that channel.
 * @property {number} buffer Particle buffer index (Carbon's buffer type).
 * @property {number} offset Element offset in the particle buffer.
 * @property {number} length Element length (dimension).
 * @property {boolean} isEmpty Whether the element has no source and is zero-filled.
 */

/** A one-shot particle emitter that spawns one particle per vertex of a geometry mesh on first update. */
@blue.define("Tr2StaticEmitter")
@blue.inherit(ITr2GenericEmitter)
@blue.inherit(IInitialize)
@blue.interface(IInitialize)
export class Tr2StaticEmitter
{

  #isThreadSafe = false;

  /** Carbon's internal one-shot spawn state. */
  @type.boolean
  hasSpawnedParticles = false;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /**
   * m_geometryResource (TriGrannyResPtr) [READ]
   *
   * Adapted: holds a TriGeometryRes. Carbon requests the "raw" variant, a
   * TriGrannyRes; ours has no load path, and TriGeometryRes carries the same
   * meshes in CMF form.
   */
  @blue.read
  @type.rootRef("TriGeometryRes")
  geometryResource = null;

  /** m_meshIndex (uint32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.uint32
  meshIndex = 0;

  /** m_particleSystem (Tr2ParticleSystemPtr) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2ParticleSystem")
  particleSystem = null;

  /** m_geometryResourcePath (std::string) [READWRITE, NOTIFY, PERSIST] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.path("TriGeometryRes")
  geometryResourcePath = "";

  /**
   * Carbon Spawn (Tr2StaticEmitter.cpp:314-317): spawns again on the next update.
   */
  @blue.method
  @meta.implemented
  Spawn()
  {
    this.hasSpawnedParticles = false;
  }

  /**
   * Carbon DoSpawn, exposed as ForceSpawn (Tr2StaticEmitter.cpp:96-262): once
   * the particle system is valid and the geometry is good, clears the system
   * and inserts one particle per vertex of mesh `meshIndex`. Each particle
   * element reads the vertex element of the matching usage (LIFETIME from
   * TANGENT, POSITION from POSITION, VELOCITY from NORMAL, MASS from
   * BITANGENT, CUSTOM from TEXCOORD at its usage index); an element with no
   * source is zero-filled.
   *
   * Adapted: Carbon reads the CMF vertex buffer (or Granny's vertex data) and
   * converts Float16 components itself. Ours reads the mesh's decoded
   * channels, which the format has already converted to floats, and still
   * refuses a vertex element that is neither Float32 nor Float16. An element
   * longer than its vertex channel is zero-filled past the channel, where
   * Carbon would read on into the next vertex element.
   *
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  ForceSpawn()
  {
    const system = this.particleSystem;
    const geometry = this.geometryResource;
    if (!system || !system.IsValid() || !geometry || !geometry.IsGood() || !Tr2Renderer.IsResourceCreationAllowed())
    {
      return;
    }

    this.hasSpawnedParticles = true;

    if (this.meshIndex >= geometry.GetMeshCount())
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "Invalid mesh index for Tr2StaticEmitter with geometry path %s", this.geometryResourcePath);
      return;
    }

    const mesh = geometry.GetPayload().meshes[this.meshIndex];
    const mappings = Tr2StaticEmitter.CreateDeclarationMap(mesh, system.GetElementDeclaration(), this.geometryResourcePath);
    if (!mappings) return;

    system.ClearParticles();

    const vertexCount = Tr2StaticEmitter.GetVertexCount(mesh);
    const particle = [];
    for (let vertex = 0; vertex < vertexCount; vertex++)
    {
      if (!system.InsertParticle(particle)) continue;
      for (const mapping of mappings)
      {
        const target = particle[mapping.buffer];
        const available = mapping.isEmpty ? 0 : Math.min(mapping.length, mapping.components);
        const start = vertex * mapping.components;
        for (let i = 0; i < mapping.length; i++)
        {
          target[mapping.offset + i] = i < available ? mapping.channel[start + i] : 0;
        }
      }
      system.DoneInsertingParticle();
    }
  }

  /**
   * IInitialize.Initialize (Tr2StaticEmitter.cpp:35-48): starts loading the
   * geometry and propagates the thread-safe flag.
   *
   * @returns {boolean} Always true.
   */
  @meta.implemented
  Initialize()
  {
    if (this.geometryResourcePath) this.geometryResource = Tr2StaticEmitter.GetGeometry(this.geometryResourcePath);
    if (this.particleSystem && this.#isThreadSafe)
    {
      this.particleSystem.SetThreadSafeFlag();
    }
    return true;
  }

  /**
   * INotify.OnModified (Tr2StaticEmitter.cpp:60-76): a new geometry path
   * starts loading it; a new particle system takes the thread-safe flag.
   *
   * @param {string|null} [propertyName=null] The modified member, by exposed name.
   * @returns {boolean} Always true.
   */
  @meta.implemented
  OnModified(propertyName = null)
  {
    if (IsMatch(propertyName, "geometryResourcePath"))
    {
      this.geometryResource = Tr2StaticEmitter.GetGeometry(this.geometryResourcePath);
    }
    else if (IsMatch(propertyName, "particleSystem") && this.#isThreadSafe && this.particleSystem)
    {
      this.particleSystem.SetThreadSafeFlag();
    }
    return true;
  }

  /** ITr2GenericEmitter.SetThreadSafeFlag (Tr2StaticEmitter.cpp:83-90). */
  /**
   * Marks the emitter thread-safe and propagates the flag to its particle system.
   *
   * Adapted: JavaScript updates are single-threaded; the flag is retained and propagated
   * only for Carbon contract parity.
   */
  @meta.adapted
  SetThreadSafeFlag()
  {
    this.#isThreadSafe = true;
    if (this.particleSystem) this.particleSystem.SetThreadSafeFlag();
  }

  /**
   * Both Carbon SpawnParticles overloads are empty for the static emitter -
   * it only spawns once from Update (Tr2StaticEmitter.cpp:293-308).
   */
  @meta.noop
  SpawnParticles(_arguments, _position = null, _velocity = null, _rateModifier = 1)
  {
  }

  /** Carbon's start/end SpawnParticles overload; empty, as above. */
  @meta.noop
  SpawnParticles__StartEnd(_arguments, _positionStart, _positionEnd, _velocityStart, _velocityEnd, _deltaTime)
  {
  }

  /**
   * ITr2GenericEmitter.Update (Tr2StaticEmitter.cpp:274-280): spawns once.
   *
   * @returns {void}
   */
  @meta.implemented
  Update(_updateArguments)
  {
    if (!this.hasSpawnedParticles) this.ForceSpawn();
  }

  /**
   * Carbon's createDeclarationMap (Tr2StaticEmitter.cpp:100-158): for each
   * particle element, the vertex element with the matching usage, or a
   * zero-fill when there is none.
   *
   * @param {object} mesh Decoded mesh: `decl` and vertex channels.
   * @param {Map<string, object>} elements The particle system's element declaration.
   * @param {string} path Geometry path, for messages.
   * @returns {Tr2StaticEmitterMapping[]|null} The mappings, or null when a vertex element has an unusable type.
   */
  static CreateDeclarationMap(mesh, elements, path)
  {
    const channels = mesh.lods?.[0]?.vertex ?? mesh.vertex ?? {};
    const name = new Tr2ParticleElementDeclarationName();
    const mappings = [];
    for (const element of elements.values())
    {
      name.type = element.elementType;
      name.name = element.customName;
      const usage = name.GetD3DUsage();
      const usageIndex = element.elementType === Tr2ParticleElementDeclarationName.Type.CUSTOM ? element.usageIndex : 0;
      const item = (mesh.decl ?? []).find(entry => CarbonUsageFromCmf(entry.usage) === usage && (entry.usageIndex ?? 0) === usageIndex);
      const mapping = { channel: null, components: 0, buffer: element.bufferIndex, offset: element.startOffset, length: element.dimension, isEmpty: true };

      if (item)
      {
        if (item.type !== "Float32" && item.type !== "Float16")
        {
          CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "Incompatible type for particle elements \"%s\" in Tr2StaticEmitter geometry %s", name.GetName(), path);
          return null;
        }
        const channel = Tr2StaticEmitter.FindChannel(channels, usage, usageIndex);
        if (channel)
        {
          mapping.channel = channel;
          mapping.components = item.elementCount;
          mapping.isEmpty = false;
        }
      }
      if (mapping.isEmpty)
      {
        CcpLog.CCP_LOG_CH(CcpLog.GetModuleChannel("trinity"), "No data for particle elements \"%s\" in Tr2StaticEmitter geometry %s - filling with zeroes", name.GetName(), path);
      }
      mappings.push(mapping);
    }
    return mappings;
  }

  /**
   * The decoded channel carrying a vertex usage.
   *
   * @param {Object<string, ArrayLike<number>>} channels Decoded vertex channels by name.
   * @param {number} usage Carbon usage code.
   * @param {number} usageIndex Usage index.
   * @returns {ArrayLike<number>|null} The channel, or null.
   */
  static FindChannel(channels, usage, usageIndex)
  {
    for (const [ key, channel ] of Object.entries(channels))
    {
      const pair = CarbonUsageFromChannel(key);
      if (pair && pair.usage === usage && pair.usageIndex === usageIndex && channel?.length) return channel;
    }
    return null;
  }

  /**
   * The mesh's vertex count: its first declared element's channel length over
   * that element's components.
   *
   * @param {object} mesh Decoded mesh.
   * @returns {number} Vertices.
   */
  static GetVertexCount(mesh)
  {
    const channels = mesh.lods?.[0]?.vertex ?? mesh.vertex ?? {};
    for (const item of mesh.decl ?? [])
    {
      const channel = Tr2StaticEmitter.FindChannel(channels, CarbonUsageFromCmf(item.usage), item.usageIndex ?? 0);
      if (channel && item.elementCount > 0) return Math.floor(channel.length / item.elementCount);
    }
    return 0;
  }

  /**
   * Carbon's `BeResMan->GetResource( path, "raw", ... )`.
   *
   * @param {string} path Geometry path.
   * @returns {object|null} The TriGeometryRes, or null for an empty path.
   */
  static GetGeometry(path)
  {
    return path ? be.resMan.GetResource(path, { requirement: ResourceRequirement.GEOMETRY }) : null;
  }

}
