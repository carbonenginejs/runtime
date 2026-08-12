// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOF.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOF.cpp
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOF_Blue.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { TriBatchType } from "@carbonenginejs/runtime-utils/graphics";
import { CjsBlackFormat } from "@carbonenginejs/runtime-resource/formats/black";
import { EveSOFDataHullDecalSetItem } from "./hull/EveSOFDataHullDecalSetItem.js";
import { EveSOFDataHullBanner } from "./hull/EveSOFDataHullBanner.js";
import { EveSOFDataHullBannerSetItem } from "./hull/EveSOFDataHullBannerSetItem.js";
import { EveSOFDataHullHazeSet } from "./hull/EveSOFDataHullHazeSet.js";
import { EveSOFDataHullLightSetItem } from "./hull/EveSOFDataHullLightSetItem.js";
import { EveSOFDataHullPlaneSet } from "./hull/EveSOFDataHullPlaneSet.js";
import { EveSOFDataHull } from "./hull/EveSOFDataHull.js";
import { EveSOFDataArea } from "./shared/EveSOFDataArea.js";
import { EveSOFDataInstancedMesh } from "./shared/EveSOFDataInstancedMesh.js";
import { EveSOFUtilsParameterName } from "./shared/EveSOFUtilsParameterName.js";
import { CjsCarbonDocument } from "@carbonenginejs/runtime-utils/document";
import { EveSOFDNA } from "./EveSOFDNA.js";
import { EveSOFDataMgr } from "./EveSOFDataMgr.js";
import { planSofLayouts } from "./layoutPlanner.js";


const BUILD_CLASS_TYPES = Object.freeze({
  [EveSOFDataHull.BuildClass.BUILDCLASS_SHIP]: "EveShip2",
  [EveSOFDataHull.BuildClass.BUILDCLASS_MOBILE]: "EveMobile",
  [EveSOFDataHull.BuildClass.BUILDCLASS_STATIONARY]: "EveStation2",
  [EveSOFDataHull.BuildClass.BUILDCLASS_SWARM]: "EveSwarm",
  [EveSOFDataHull.BuildClass.BUILDCLASS_EXTENSION]: "EveMobile"
});

const DECAL_EFFECT_NAMES = Object.freeze([
  "decalv5.fx",
  "decalcounterv5.fx",
  "decalholev5.fx",
  "decalcylindricv5.fx",
  "decalglowcylindricv5.fx",
  "decalglowv5.fx",
  "decalv5.fx"
]);

const BANNER_EXTERNAL_PARAMETER_NAMES = Object.freeze([
  "AllianceLogoResPath",
  "CorpLogoResPath",
  "CeoPortraitResPath",
  "VerticalBannerResPath",
  "HorizontalBannerResPath",
  "TargetSystemAllianceLogoResPath",
  "TargetSystemVerticalBannerResPath",
  "TargetSystemHorizontalBannerResPath",
  "TargetSystemInfo0ResPath",
  "TargetSystemInfo1ResPath",
  "TargetSystemInfo2ResPath",
  "TargetSystemInfo3ResPath",
  "TargetSystemInfo4ResPath",
  "TargetSystemStatusResPath",
  "CurrentSystemAllianceLogoResPath",
  "CurrentSystemVerticalBannerResPath",
  "CurrentSystemHorizontalBannerResPath",
  "PublicityPosterResPath",
  "PublicityPortraitResPath",
  "RecruitmentInformation0ResPath",
  "RecruitmentInformation1ResPath",
  "RecruitmentInformation2ResPath",
  "RecruitmentInformation3ResPath",
  "RecruitmentInformation4ResPath"
]);

const MIN_MESH_SCREEN_SIZE = 2.5;

// Tr2Lod value stamped on distortion areas after fill (EveSOF.cpp:2149-2153);
// runtime-sof stays free of a runtime-trinity dependency, so the enum value
// from Tr2LodResource.h is mirrored here.
const TR2_LOD_HIGH = 2;

// Carbon validates every resolved resource root against the interface its
// role requires before attaching it: children must cast to EveTransform or
// IEveSpaceObjectChild (EveSOF.cpp:1786-1844,1949-2004), controllers load as
// ITr2Controller (2014-2033), and model curves load as ITriQuaternionFunction
// / ITriVectorFunction (1668-1691). The GPU-free builder has no class
// registry, so conformance comes from the descriptor's explicit `implements`
// claim or from these Carbon-source kind inventories.
const CHILD_TRANSFORM_KINDS = new Set([
  "EveTransform",
  "EveRootTransform",
  "EveMissileWarhead"
]);

const SPACE_OBJECT_CHILD_KINDS = new Set([
  "EveChildAudio",
  "EveChildBehaviorSystem",
  "EveChildBulletStorm",
  "EveChildCloud",
  "EveChildCloud2",
  "EveChildContainer",
  "EveChildEffectPropagator",
  "EveChildExplosion",
  "EveChildFogVolume",
  "EveChildInstanceContainer",
  "EveChildInstanceMeshRenderer",
  "EveChildInstancedMeshes",
  "EveChildLightingOverride",
  "EveChildLineSet",
  "EveChildLink",
  "EveChildMesh",
  "EveChildParticleSphere",
  "EveChildParticleSystem",
  "EveChildPlug",
  "EveChildPostProcessVolume",
  "EveChildProceduralContainer",
  "EveChildQuad",
  "EveChildRef",
  "EveChildSmartLightSet",
  "EveChildSocket",
  "EveChildSpherePin",
  "EveEllipseSet"
]);

const OBJECT_RESOURCE_ROLE_GATES = Object.freeze({
  controller: {
    interfaceName: "ITr2Controller",
    kinds: new Set([
      "Tr2Controller",
      "Tr2ControllerReference",
      "Tr2TimelineController"
    ])
  },
  modelRotationCurve: {
    interfaceName: "ITriQuaternionFunction",
    kinds: new Set([
      "Tr2CurveConstant",
      "Tr2CurveEulerRotation",
      "Tr2CurveEulerRotationExpression",
      "Tr2CurveQuaternion",
      "Tr2CurveRandomAxisRotation",
      "Tr2QuaternionLerpCurve",
      "Tr2RotationAdapter",
      "TriRigidOrientation"
    ])
  },
  modelTranslationCurve: {
    interfaceName: "ITriVectorFunction",
    kinds: new Set([
      "EveLocalPositionCurve",
      "EveRemotePositionCurve",
      "Tr2CurveCombiner",
      "Tr2CurveConstant",
      "Tr2CurveVector3",
      "Tr2CurveVector3Expression",
      "Tr2CurveVector3Lerp",
      "Tr2FollowCurve",
      "Tr2TranslationAdapter",
      "Tr2VectorFunctionModifier",
      "TriVectorSequencer"
    ])
  }
});

// Sentinel returned when a resolved child root fails Carbon's type gate; the
// callers mirror Carbon's early return rather than skipping one item.
const WRONG_TYPE_CHILD = Symbol("wrong-type-child");

function descriptorClaimsInterface(descriptor, interfaceName)
{
  return Array.isArray(descriptor.implements) && descriptor.implements.includes(interfaceName);
}
// EveChildInheritProperties field order (runtime-trinity is the authority for
// these names); dna.GetColorSet() is index-aligned with this Carbon color-slot
// order, so the authored color set projects onto named, persisted fields.
const INHERIT_COLOR_PROPERTIES = Object.freeze([
  "Primary",
  "Secondary",
  "Tertiary",
  "Black",
  "White",
  "Yellow",
  "Orange",
  "Red",
  "Blue",
  "Green",
  "Cyan",
  "Fire",
  "Hull",
  "Glass",
  "Reactor",
  "Darkhull",
  "Booster",
  "Killmark",
  "PrimaryLight",
  "SecondaryLight",
  "TertiaryLight",
  "WhiteLight",
  "PrimaryHologram",
  "SecondaryHologram",
  "TertiaryHologram",
  "State0",
  "State1",
  "State2",
  "State3",
  "StateVulnerable",
  "StateInvulnerable",
  "PrimaryForcefield",
  "SecondaryForcefield",
  "PrimaryBanner",
  "PrimaryFx",
  "SecondaryFx",
  "PrimarySpotlight",
  "SecondarySpotlight",
  "TertiarySpotlight",
  "PrimaryBillboard",
  "PrimaryWarpFx",
  "PrimaryAttackFx",
  "PrimarySiegeFx",
  "PrimaryDockedFx"
]);

const SWARM_BEHAVIOR_FIELD_NAMES = Object.freeze([
  "mass",
  "speedMultiplier",
  "speedMinimum",
  "maxDistance0",
  "maxDistance1",
  "maxTime",
  "timeMultiplier",
  "agility",
  "speed0",
  "speed1",
  "weightFormation",
  "weightCohesion",
  "weightSeparation",
  "weightAlign",
  "weightWander",
  "weightAnchor",
  "anchorRadius0",
  "anchorRadius1",
  "maxDeceleration",
  "separationDistance",
  "formationDistance",
  "wanderFluctuation",
  "wanderDistance",
  "wanderRadius"
]);

const SOF_INSTANCE_LAYOUT = Object.freeze([
  Object.freeze({ usage: "TEXCOORD", usageIndex: 0, type: "FLOAT32_4", name: "transform0" }),
  Object.freeze({ usage: "TEXCOORD", usageIndex: 1, type: "FLOAT32_4", name: "transform1" }),
  Object.freeze({ usage: "TEXCOORD", usageIndex: 2, type: "FLOAT32_4", name: "transform2" }),
  Object.freeze({ usage: "TEXCOORD", usageIndex: 3, type: "FLOAT32_4", name: "lastTransform0" }),
  Object.freeze({ usage: "TEXCOORD", usageIndex: 4, type: "FLOAT32_4", name: "lastTransform1" }),
  Object.freeze({ usage: "TEXCOORD", usageIndex: 5, type: "FLOAT32_4", name: "lastTransform2" }),
  Object.freeze({ usage: "TEXCOORD", usageIndex: 6, type: "BYTE_4", name: "boneIndex" })
]);

/** Carbon-first SOF builder with a GPU-free Trinity graph output boundary. */
@type.define({ className: "EveSOF", family: "eve" })
export class EveSOF extends CjsModel
{

  @io.readwrite
  @type.boolean
  allowFileCaching = true;

  // Carbon registers this as the global TRI setting "alphaCutoutShadowsEnabled"
  // (EveSOF.cpp:61-62, default false); decal (alpha-cutout) areas take their
  // castsShadows state from it. Injected here per builder instead of a global.
  @io.readwrite
  @type.boolean
  alphaCutoutShadowsEnabled = false;

  // Carbon registers this as the global TRI setting "volumetricTrailPath"
  // (EveSOF.cpp:64-65, default empty); the booster trail set takes its mesh
  // resource path from it. Injected here per builder instead of a global.
  @io.readwrite
  @type.string
  volumetricTrailPath = "";

  // Carbon initializes each light's startTime from the current frame time,
  // phase-offsetting noise flicker by when the object was built. Injected
  // here per builder (default 0 keeps builds deterministic); the engine
  // passes its clock when it wants Carbon's de-synced flicker.
  @io.readwrite
  @type.float64
  buildTime = 0;

  @io.read
  @type.objectRef("EveSOFDataMgr")
  dataMgr = new EveSOFDataMgr();

  @io.readwrite
  @type.boolean
  editorMode = false;

  #resourceExists = null;

  #childResourceResolver = null;

  #objectResourceResolver = null;

  #existingFilesCache = new Map();

  #asyncResources = Object.freeze({ getObject: null, exists: null });

  #dataPath = "";

  #dataLoadOperations = new Map();

  // Build-scope counterpart of Carbon's CCP_LOGERR sites: records in
  // layoutPlanner diagnostic shape ({ code, ...context }), reset by each
  // BuildFromDNA and readable through GetBuildDiagnostics().
  #buildDiagnostics = [];

  /** Add standalone SOF configuration or accept CjsLibrary topic forwarding. */
  Register(options = {})
  {
    if (!options || typeof options !== "object" || Array.isArray(options))
    {
      throw new TypeError("EveSOF.Register options must be an object");
    }

    if (Object.prototype.hasOwnProperty.call(options, "dataPath"))
    {
      this.#dataPath = normalizeSofResourcePath(options.dataPath);
    }
    if (Object.prototype.hasOwnProperty.call(options, "resources"))
    {
      const resources = options.resources ?? {};
      if (typeof resources !== "object" || Array.isArray(resources))
      {
        throw new TypeError("EveSOF resources must be an object or null");
      }
      if (resources.getObject !== undefined && resources.getObject !== null && typeof resources.getObject !== "function")
      {
        throw new TypeError("EveSOF resources.getObject must be a function or null");
      }
      if (resources.exists !== undefined && resources.exists !== null && typeof resources.exists !== "function")
      {
        throw new TypeError("EveSOF resources.exists must be a function or null");
      }
      const getObject = Object.hasOwn(resources, "getObject")
        ? resources.getObject ?? null
        : this.#asyncResources.getObject;
      const exists = Object.hasOwn(resources, "exists")
        ? resources.exists ?? null
        : this.#asyncResources.exists;
      if (exists !== this.#asyncResources.exists) this.#existingFilesCache.clear();
      this.#asyncResources = Object.freeze({
        getObject,
        exists
      });
    }
    if (Object.prototype.hasOwnProperty.call(options, "allowFileCaching"))
    {
      this.allowFileCaching = Boolean(options.allowFileCaching);
    }
    if (Object.prototype.hasOwnProperty.call(options, "alphaCutoutShadowsEnabled"))
    {
      this.alphaCutoutShadowsEnabled = Boolean(options.alphaCutoutShadowsEnabled);
    }
    if (Object.prototype.hasOwnProperty.call(options, "volumetricTrailPath"))
    {
      this.volumetricTrailPath = String(options.volumetricTrailPath ?? "");
    }
    if (Object.prototype.hasOwnProperty.call(options, "buildTime"))
    {
      this.buildTime = Number(options.buildTime ?? 0);
    }
    if (Object.prototype.hasOwnProperty.call(options, "resFileIndex"))
    {
      // The resfileindex is the synchronous existence oracle Carbon gets from
      // its file system: authored res paths either appear in the index or do
      // not. Texture resPathInsert selection needs only this membership test,
      // so providing the index keeps the sync build pure while matching
      // Carbon's existence-driven path rewriting. Accepts the tools-browser
      // CjsFileIndex surface (Has), a Set/Map, a predicate, or null to clear.
      const index = options.resFileIndex;
      if (index === null) this.SetResourceExistsResolver(null);
      else if (Array.isArray(index))
      {
        // The canonical shape: a plain list of res file names, from wherever
        // the caller got them. Existence is case-insensitive membership,
        // matching Carbon's file-system semantics.
        const names = new Set(index.map(name => String(name ?? "").toLowerCase()));
        this.SetResourceExistsResolver(path => names.has(String(path ?? "").toLowerCase()));
      }
      else if (typeof index === "function") this.SetResourceExistsResolver(path => Boolean(index(path)));
      else if (index instanceof Set || index instanceof Map) this.SetResourceExistsResolver(path => index.has(path));
      else if (typeof index?.Has === "function") this.SetResourceExistsResolver(path => Boolean(index.Has(path)));
      else if (typeof index?.has === "function") this.SetResourceExistsResolver(path => Boolean(index.has(path)));
      else throw new TypeError("EveSOF resFileIndex must be an array of file names, expose Has/has, be a predicate, a Set, a Map, or null");
    }
    if (Object.prototype.hasOwnProperty.call(options, "editorMode"))
    {
      this.editorMode = Boolean(options.editorMode);
    }
    return this;
  }

  /** Supplies the synchronous resource-existence probe used by texture inserts. */
  SetResourceExistsResolver(resolver)
  {
    if (resolver !== null && typeof resolver !== "function")
    {
      throw new TypeError("EveSOF resource existence resolver must be a function or null");
    }
    this.#resourceExists = resolver === null ? null : path =>
    {
      const result = resolver(path);
      if (result && typeof result.then === "function")
      {
        throw new TypeError("EveSOF resource existence resolver must be synchronous");
      }
      return result === true;
    };
    this.#existingFilesCache.clear();
    return this;
  }

  /**
   * Supplies Carbon's synchronous `.red` child-object boundary.
   *
   * The resolver receives `(redFilePath, context)` and returns either null, a
   * local `{ kind, target, fields, raw }` descriptor, or
   * `{ document, root?, target }` for a complete carbon.document fragment.
   * Target is `children` for an EveTransform root or `effectChildren` for an
   * IEveSpaceObjectChild root.
   */
  SetChildResourceResolver(resolver)
  {
    if (resolver !== null && typeof resolver !== "function")
    {
      throw new TypeError("EveSOF child resource resolver must be a function or null");
    }
    this.#childResourceResolver = resolver;
    return this;
  }

  /** Supplies synchronous controller and model-curve object documents. */
  SetObjectResourceResolver(resolver)
  {
    if (resolver !== null && typeof resolver !== "function")
    {
      throw new TypeError("EveSOF object resource resolver must be a function or null");
    }
    this.#objectResourceResolver = resolver;
    return this;
  }

  /** Routes Carbon's resource load call through the SOF data manager. */
  @carbon.method
  @impl.implemented
  LoadData(filePath)
  {
    return this.dataMgr.LoadData(filePath);
  }

  /** Load SOF data through the configured promise-capable object resolver. */
  async LoadDataAsync(filePath = this.#dataPath)
  {
    const path = normalizeSofResourcePath(filePath);
    if (!path) throw new TypeError("EveSOF.LoadDataAsync requires a data path");
    const getObject = this.#asyncResources.getObject;
    if (!getObject)
    {
      return this.dataMgr.LoadDataAsync(path);
    }

    const existing = this.#dataLoadOperations.get(path);
    if (existing) return existing;
    const operation = ResolveSofDependency(
      () => getObject(path, { role: "sofData", output: "runtime" }),
      path,
      "sofData",
      new Map()
    )
      .then(data => this.dataMgr.SetData(data));
    this.#dataLoadOperations.set(path, operation);
    const clear = () =>
    {
      if (this.#dataLoadOperations.get(path) === operation) this.#dataLoadOperations.delete(path);
    };
    operation.then(clear, clear);
    return operation;
  }

  /** Creates and resolves one DNA instance against the loaded SOF library. */
  @carbon.method
  @impl.implemented
  CreateDna(dnaString)
  {
    const dna = new EveSOFDNA();
    dna.Setup(dnaString, this.dataMgr);
    return dna.IsValid() ? dna : null;
  }

  /**
   * Reports the visibility groups one DNA resolves, without building a graph.
   *
   * Visibility groups are how a faction turns hull attachment sets on and off,
   * so this answers which groups the selected hulls author, which the faction
   * declares, and therefore which sets a build emits. Carbon keeps only the
   * FNV1 hashes at runtime (EveSOFDataMgr.cpp:1301-1310) and has no equivalent
   * query; the names come from the catalog projection.
   */
  @carbon.method
  @impl.adapted
  GetDnaVisibilityGroups(dnaString)
  {
    const dna = this.CreateDna(dnaString);
    if (dna === null) return null;

    const declared = [...new Set(dna.factionData?.visibilityGroups ?? [])];
    const declaredSet = new Set(declared);
    const sets = [];
    for (let hullIndex = 0; hullIndex < dna.GetMultiHullCount(); hullIndex++)
    {
      const hull = dna.hullDatas?.[hullIndex];
      if (!hull) continue;
      // A gated set is any hull collection whose records carry a visibility
      // group, so this follows the catalog rather than a second list of the
      // set kinds Carbon happens to gate today.
      for (const [field, values] of Object.entries(hull))
      {
        if (!Array.isArray(values)) continue;
        for (const value of values)
        {
          if (!value || value.visibilityGroupName === undefined) continue;
          const group = String(value.visibilityGroupName);
          sets.push({
            kind: field,
            // Carbon's projected sets keep the visibility hash, not the
            // authored set name, so name is present only where a projection
            // already carries one.
            name: String(value.name ?? ""),
            hullIndex,
            visibilityGroup: group,
            visible: declaredSet.has(group)
          });
        }
      }
    }

    const authored = [...new Set(sets.map(item => item.visibilityGroup))].sort();
    return Object.freeze({
      dna: String(dnaString),
      hulls: Object.freeze([...(dna.hullNames ?? [])]),
      faction: String(dna.factionName ?? ""),
      race: String(dna.raceName ?? ""),
      declared: Object.freeze(declared),
      authored: Object.freeze(authored),
      visible: Object.freeze(authored.filter(name => declaredSet.has(name))),
      hidden: Object.freeze(authored.filter(name => !declaredSet.has(name))),
      sets: Object.freeze(sets.map(item => Object.freeze(item)))
    });
  }

  /** Inspects one DNA selection without creating a graph or runtime values. */
  InspectDna(dnaString)
  {
    const dna = new EveSOFDNA();
    dna.Setup(dnaString, this.dataMgr);
    const buildable = dna.IsValid();
    const valid = buildable && dna.ValidateContent();
    return Object.freeze({
      buildable,
      valid,
      error: dna.GetParseError() ?? (valid ? null : "invalid-content")
    });
  }

  /** Performs Carbon's separate slow/offline DNA validation path. */
  @carbon.method
  @impl.implemented
  ValidateDNA(dnaString)
  {
    const dna = this.CreateDna(dnaString);
    return dna !== null && dna.ValidateContent();
  }

  /** Builds a DNA string from the three mandatory selections. */
  @carbon.method
  @impl.implemented
  Build(hullName, factionName, raceName)
  {
    return this.BuildFromDNA(`${hullName}:${factionName}:${raceName}`);
  }

  /** Promise-facing build entry point for standalone and CjsLibrary callers. */
  BuildAsync(hullName, factionName, raceName, options = {})
  {
    return this.BuildFromDNAAsync(`${hullName}:${factionName}:${raceName}`, options);
  }

  /** Returns the diagnostics recorded by the most recent BuildFromDNA call. */
  GetBuildDiagnostics()
  {
    return this.#buildDiagnostics.map(entry => ({ ...entry }));
  }

  /** Builds plain model values from the three mandatory selections. */
  BuildValues(hullName, factionName, raceName, options = {})
  {
    return this.BuildValuesFromDNA(`${hullName}:${factionName}:${raceName}`, options);
  }

  /** Promise-facing values entry point mirroring BuildAsync. */
  BuildValuesAsync(hullName, factionName, raceName, options = {})
  {
    return this.BuildValuesFromDNAAsync(`${hullName}:${factionName}:${raceName}`, options);
  }

  /**
   * Builds the plain model-values graph for a DNA string.
   *
   * The result is one nested, JSON-serializable root value carrying `_type` on
   * polymorphic nodes and `_id`/`_ref` only where topology demands shared
   * identity. There is no node table, `kind`/`fields` record, or `raw` payload.
   *
   * **No class registry is required, and none should be passed.** runtime-sof
   * must be Trinity-free — that requirement is why it is a separate package —
   * and JSON does not need the classes it names. Building this used to hydrate
   * a document into live runtime objects and re-export them, which made a
   * registry mandatory and relocated a runtime-trinity dependency onto every
   * caller rather than removing it. Anything that takes a registry here is the
   * round trip growing back.
   *
   * Constructing objects is the caller's option, performed on the result:
   * `RootClass.from(values)` against whatever classes that caller has. The
   * direction matters — objects are built *from* the values, never in order to
   * produce them.
   *
   * The output is sparse: it carries what SOF set, and class defaults belong to
   * whoever constructs. The audio emitter is ordinary declared data, an
   * `AudEmitter` node in `TriObserverLocal.observer`, so this is a complete
   * rebuild source.
   */
  BuildValuesFromDNA(dnaString, options = {})
  {
    const document = this.BuildFromDNA(dnaString, options);
    return document ? EveSOF.projectDocumentValues(document, options) : null;
  }

  /** Async values build mirroring BuildFromDNAAsync's dependency resolution. */
  async BuildValuesFromDNAAsync(dnaString, options = {})
  {
    const document = await this.BuildFromDNAAsync(dnaString, options);
    return document ? EveSOF.projectDocumentValues(document, options) : null;
  }

  /**
   * Canonical pure-data instantiation: the decoded (or raw black) sof catalog
   * plus a plain list of res file names.
   *
   * The catalog is mandatory - a factory without its data is useless. The
   * file list is the sole build-time resource dependency (resPathInsert
   * existence); without it every insert lookup reports missing and texture
   * paths fall back to their base values, with a one-time console warning.
   * The factory never fetches, never parses index formats, and never touches
   * the network: callers hand it bytes or data they acquired however they
   * chose.
   *
   * (`Create`, not `from` - CjsModel.from is the schema hydration contract
   * and keeps its signature.)
   */
  static Create({ black, resFileIndex } = {})
  {
    if (black === undefined || black === null)
    {
      throw new TypeError("EveSOF.Create requires the sof catalog: data.black bytes or its decoded data");
    }
    const sof = new EveSOF();
    const data = (black instanceof ArrayBuffer || ArrayBuffer.isView(black))
      ? CjsBlackFormat.readPayload(
        ArrayBuffer.isView(black)
          ? black.buffer.slice(black.byteOffset, black.byteOffset + black.byteLength)
          : black,
        {}
      ).object
      : black;
    if (!sof.dataMgr.SetData(data))
    {
      throw new TypeError("EveSOF.Create could not ingest the sof catalog");
    }
    if (resFileIndex === undefined || resFileIndex === null)
    {
      console.warn("EveSOF.Create: no resFileIndex file list provided; resPathInsert existence checks will report missing and texture paths fall back to their base values.");
    }
    else
    {
      sof.Register({ resFileIndex });
    }
    return sof;
  }

  /**
   * Projects a built carbon.document into plain model values.
   *
   * Both forms are JSON describing one graph, so this is a structural rewrite
   * and nothing more: a node table becomes a tree, `kind` becomes `_type`, and
   * `{ $ref }` becomes a `{ _ref }` back-reference paired with an `_id` on the
   * first occurrence. `fields` and `raw` are envelopes, so their contents move
   * onto the node itself.
   *
   * **No class library is involved, by requirement.** runtime-sof must be
   * Trinity-free — that is why it is a separate package — and it emits JSON, so
   * it never needs the classes that JSON names. The previous implementation
   * hydrated the document into live runtime objects and called `GetValues` on
   * the root, which made a class registry mandatory and pushed a runtime-trinity
   * dependency onto every caller. Constructing objects to serialize a graph we
   * already hold is a round trip; building objects from these values is a thing
   * a caller may choose to do afterwards, with `RootClass.from(values)`.
   *
   * The output is therefore sparse: it carries what SOF actually set, and class
   * defaults are applied by whoever constructs. Hydration used to fill them in,
   * which is why the projected graph used to be larger than the document it
   * came from.
   */
  static projectDocumentValues(document, options = {})
  {
    const normalized = CjsCarbonDocument.normalize(document);
    const nodeById = new Map(normalized.nodes.map(node => [Number(node.id), node]));
    const rootRef = normalized.roots?.[0]?.ref;

    if (!CjsCarbonDocument.isRef(rootRef))
    {
      throw new TypeError("EveSOF values projection requires a document with one root reference.");
    }

    // A node reachable more than once is shared topology and needs an identity;
    // one reachable once is ordinary nesting and needs none. Counting first
    // keeps `_id` off the great majority of nodes.
    const visits = new Map();
    CountDocumentVisits(rootRef, nodeById, visits);

    return ProjectDocumentNode(rootRef, nodeById, visits, new Map(), { nextId: 1 });
  }

  /**
   * Resolve selected child/object dependencies without converting the
   * deterministic synchronous builder into an async state machine.
   *
   * A collection build records only dependencies selected by the normal SOF
   * filters. They are fetched concurrently, then the unchanged builder runs a
   * second time against synchronous per-call caches.
   */
  async BuildFromDNAAsync(dnaString, options = {})
  {
    const getObject = this.#asyncResources.getObject;
    const exists = this.#asyncResources.exists;
    if (!getObject && !exists) return this.BuildFromDNA(dnaString, options);

    const documentRequests = new Map();
    const existenceRequests = new Map();
    const collectionPrevious = {
      child: this.#childResourceResolver,
      object: this.#objectResourceResolver,
      exists: this.#resourceExists,
      allowFileCaching: this.allowFileCaching
    };

    try
    {
      if (getObject)
      {
        this.#childResourceResolver = (path, context) =>
        {
          CollectSofRequest(documentRequests, path, "carbon.document", "child", context);
          return null;
        };
        this.#objectResourceResolver = (path, context) =>
        {
          CollectSofRequest(documentRequests, path, "carbon.document", context?.role || "object", context);
          return null;
        };
      }
      if (exists)
      {
        this.allowFileCaching = false;
        this.#resourceExists = path =>
        {
          CollectSofRequest(existenceRequests, path, "boolean", "exists");
          return false;
        };
      }
      this.BuildFromDNA(dnaString, options);
    }
    finally
    {
      this.#childResourceResolver = collectionPrevious.child;
      this.#objectResourceResolver = collectionPrevious.object;
      this.#resourceExists = collectionPrevious.exists;
      this.allowFileCaching = collectionPrevious.allowFileCaching;
    }

    const documentResults = new Map();
    const existenceResults = new Map();
    await Promise.all([
      ...[ ...documentRequests.values() ].map(request => ResolveSofDependency(
        () => getObject(request.path, { ...request.context, role: request.role, output: request.output }),
        request.path,
        request.role,
        documentResults,
        request.key
      )),
      ...[ ...existenceRequests.values() ].map(request => ResolveSofDependency(
        () => exists(request.path, { role: request.role, output: request.output }),
        request.path,
        request.role,
        existenceResults,
        request.key
      ))
    ]);

    const projectionPrevious = {
      child: this.#childResourceResolver,
      object: this.#objectResourceResolver,
      exists: this.#resourceExists,
      allowFileCaching: this.allowFileCaching
    };
    try
    {
      if (getObject)
      {
        this.#childResourceResolver = path => documentResults.get(SofRequestKey(path, "carbon.document")) ?? null;
        this.#objectResourceResolver = path => documentResults.get(SofRequestKey(path, "carbon.document")) ?? null;
      }
      if (exists)
      {
        this.allowFileCaching = false;
        this.#resourceExists = path => existenceResults.get(SofRequestKey(path, "boolean")) === true;
      }
      return this.BuildFromDNA(dnaString, options);
    }
    finally
    {
      this.#childResourceResolver = projectionPrevious.child;
      this.#objectResourceResolver = projectionPrevious.object;
      this.#resourceExists = projectionPrevious.exists;
      this.allowFileCaching = projectionPrevious.allowFileCaching;
    }
  }

  /** Returns Carbon's layout selection and transform work as a detached CPU plan. */
  @carbon.method
  @impl.adapted
  PlanLayoutFromDNA(dnaString, options = {})
  {
    const dna = this.CreateDna(dnaString);
    return dna ? planSofLayouts(dna, options ?? {}) : null;
  }

  /**
   * Emits the maintained GPU-free SOF graph, including deterministic layouts.
   * Layout options may be passed directly or under an `options.layout` object.
   */
  @carbon.method
  @impl.implemented
  BuildFromDNA(dnaString, options = {})
  {
    this.#buildDiagnostics = [];
    const dna = this.CreateDna(dnaString);
    if (!dna) return null;

    const buildClass = dna.GetBuildClass();
    const typeName = BUILD_CLASS_TYPES[buildClass];
    if (!typeName) return null;
    const hull = dna.hullDatas[0];
    const sphere = dna.GetHullBoundingSphere() ?? [0, 0, 0, -1];
    const document = new SofDocumentBuilder();
    const isExtension = buildClass === EveSOFDataHull.BuildClass.BUILDCLASS_EXTENSION;
    const hasShipInterface = typeName === "EveShip2" || typeName === "EveSwarm";
    const swarmBehavior = typeName === "EveSwarm"
      ? createSwarmBehaviorFields(dna.GetGenericSwarmProperties())
      : null;
    const mesh = isExtension ? document.AddNode("Tr2Mesh", {}) : this.CreateMesh(dna, document);
    if (!mesh) return null;
    const rootFields = {
      dna: dna.GetDnaString(),
      boundingSphereCenter: Array.from(sphere).slice(0, 3),
      boundingSphereRadius: Number(sphere[3] ?? -1),
      shapeEllipsoidCenter: isExtension ? [0, 0, 0] : arrayValue(hull.shapeEllipsoidCenter, [0, 0, 0]),
      shapeEllipsoidRadius: isExtension ? [-1, -1, -1] : arrayValue(hull.shapeEllipsoidRadius, [-1, -1, -1]),
      dynamicBoundingSphereEnabled: isExtension ? false : dna.DynamicBoundingSphereEnabled(),
      castShadow: isExtension ? false : dna.CastShadow(),
      isAnimated: isExtension ? false : dna.IsHullAnimated(),
      reflectionMode: isExtension ? 3 : dna.GetReflectionMode(),
      mesh,
      effectChildren: [],
      children: [],
      curveSets: [],
      modelRotationCurve: null,
      modelTranslationCurve: null,
      attachments: [],
      decals: [],
      impactOverlay: null,
      customMasks: [],
      lights: [],
      externalParameters: [],
      controllers: [],
      observers: [],
      locators: [],
      locatorSets: []
    };
    if (hasShipInterface) rootFields.boosters = null;
    if (swarmBehavior) Object.assign(rootFields, swarmBehavior);
    if (isExtension)
    {
      if (!this.SetupExtensionBuild(document, rootFields, dna, options?.layout ?? options ?? {})) return null;
      rootFields.inheritProperties = createInheritProperties(document, dna);
      const root = document.AddNode(typeName, rootFields);
      document.AddRoot("default", root);
      return document.ToJSON();
    }
    this.SetupCustomMask(document, rootFields, dna);
    this.SetupDecalSets(document, rootFields, dna);
    this.SetupLocators(document, rootFields, dna);
    this.SetupLocatorSets(document, rootFields, dna, [identityMatrix()]);
    this.SetupAttachments(document, rootFields, dna);
    this.SetupImpactEffects(document, rootFields, dna);
    this.SetupEffects(document, rootFields, rootFields, dna, [identityMatrix()], EveSOFDataHull.BuildFilter.STANDALONE);
    this.SetupAudio(document, rootFields, dna, identityMatrix());
    this.SetupControllers(document, rootFields, dna, EveSOFDataHull.BuildFilter.STANDALONE);
    this.SetupModelCurves(document, rootFields, dna);
    this.SetupInstancedMeshes(document, rootFields, dna, [identityMatrix()]);
    this.SetupLayout(document, rootFields, dna, options?.layout ?? options ?? {});
    if (hasShipInterface) this.SetupBoosters(document, rootFields, dna);
    rootFields.inheritProperties = createInheritProperties(document, dna);
    const root = document.AddNode(typeName, rootFields);
    document.AddRoot("default", root);
    return document.ToJSON();
  }

  /** Emits Carbon's special extension-root path through a fake solo placement. */
  @carbon.method
  @impl.adapted
  SetupExtensionBuild(document, rootFields, dna, layoutOptions = {})
  {
    const extensionFields = {
      ...createLayoutContainerFields("Extension Container"),
      alwaysOn: true,
      origin: 1
    };
    const needsPlacementContainer = dna.IsHullAnimated() || dna.GetHullControllers().length !== 0;
    const placementFields = needsPlacementContainer
      ? createLayoutContainerFields("Solo Placement")
      : extensionFields;
    const childFields = {
      name: "Hull",
      mesh: this.CreateMesh(dna, document),
      castShadow: dna.CastShadow(),
      reflectionMode: dna.GetReflectionMode(),
      minScreenSize: MIN_MESH_SCREEN_SIZE,
      lowestLodVisible: 0,
      staticTransform: true,
      decals: [],
      attachments: [],
      lights: [],
      animationUpdater: dna.IsHullAnimated()
        ? document.AddNode("Tr2GrannyAnimation", {})
        : null
    };
    if (!childFields.mesh) return null;
    this.SetupDecalSets(document, childFields, dna);
    this.SetupAttachments(document, childFields, dna, [identityMatrix()], false);
    const child = document.AddNode("EveChildMesh", childFields);
    placementFields.objects.push(child);

    if (needsPlacementContainer)
    {
      this.SetupControllers(
        document,
        placementFields,
        dna,
        EveSOFDataHull.BuildFilter.NON_INSTANCED_PLACEMENT
      );
    }
    this.SetupAudio(document, placementFields, dna, identityMatrix());
    const hasChildEffects = dna.UsingSof6()
      ? dna.GetHullChildSets().length !== 0
      : dna.GetHullChildren().length !== 0;
    if (hasChildEffects)
    {
      const fakeFields = {
        effectChildren: [],
      };
      this.SetupEffects(
        document,
        rootFields,
        fakeFields,
        dna,
        [identityMatrix()],
        EveSOFDataHull.BuildFilter.NON_INSTANCED_PLACEMENT
      );
      if (needsPlacementContainer) placementFields.objects.push(...fakeFields.effectChildren);
    }
    if (needsPlacementContainer)
    {
      placementFields.animationOwner = dna.IsHullAnimated() ? child : null;
      extensionFields.objects.push(document.AddNode("EveChildContainer", placementFields));
    }

    this.SetupInstancedMeshes(document, rootFields, dna, [identityMatrix()]);
    this.SetupLocatorSets(document, rootFields, dna, [identityMatrix()]);
    this.SetupLayout(document, rootFields, dna, layoutOptions, extensionFields);
    extensionFields.isPlacementRoot = true;
    rootFields.effectChildren.push(document.AddNode("EveChildContainer", extensionFields));
    return child;
  }

  /** Creates the base Tr2Mesh graph and populates its SOF shader areas. */
  @carbon.method
  @impl.implemented
  CreateMesh(dna, document)
  {
    const fields = {
      geometryResPath: dna.GetHullGeometryResPath(),
      opaqueAreas: [],
      transparentAreas: [],
      additiveAreas: [],
      distortionAreas: [],
      depthAreas: []
    };
    const transparent = [];
    // Carbon's CreateMesh never fails: missing shader records degrade to
    // partially filled area vectors with a build diagnostic (EveSOF.cpp:500-515).
    this.SetupShaders(dna, document, fields, transparent);
    this.GenerateDepthFromAreaVector(document, fields.depthAreas, transparent, dna);
    return document.AddNode("Tr2Mesh", fields);
  }

  /** Populates all five Carbon hull-area categories in source order. */
  @carbon.method
  @impl.implemented
  SetupShaders(dna, document, meshFields, transparent)
  {
    let meshIndexOffset = 0;
    for (let hullIndex = 0; hullIndex < dna.GetMultiHullCount(); hullIndex++)
    {
      let count = 0;
      const fills = [
        [meshFields.opaqueAreas, TriBatchType.TRIBATCHTYPE_OPAQUE],
        [meshFields.opaqueAreas, TriBatchType.TRIBATCHTYPE_DECAL],
        [meshFields.transparentAreas, TriBatchType.TRIBATCHTYPE_TRANSPARENT],
        [meshFields.additiveAreas, TriBatchType.TRIBATCHTYPE_ADDITIVE],
        [meshFields.distortionAreas, TriBatchType.TRIBATCHTYPE_DISTORTION]
      ];
      for (const [target, batchType] of fills)
      {
        const result = this.FillMeshAreaVector(target, batchType, dna, hullIndex, meshIndexOffset, document);
        count += result.count;
        if (batchType === TriBatchType.TRIBATCHTYPE_TRANSPARENT) transparent.push(...result.areas);
      }
      meshIndexOffset += count;
    }
    return true;
  }

  /** Converts one Carbon HullAreas vector into Tr2MeshArea/effect graph nodes. */
  @carbon.method
  @impl.implemented
  FillMeshAreaVector(target, batchType, dna, hullIndex, meshIndexOffset, document)
  {
    // A missing source vector cannot occur in Carbon (hull area vectors always
    // exist for a valid hull index); treat it as empty rather than diagnosing.
    const source = dna.GetHullMeshAreas(batchType, hullIndex);
    if (!source) return { count: 0, areas: [] };
    const pending = [];
    for (const area of source)
    {
      const shaderData = dna.GetGenericAreaShaderData(area.shader);
      if (!shaderData)
      {
        // Carbon logs and returns zero for this source, keeping the areas it
        // already appended and continuing with the remaining batches and
        // hulls (EveSOF.cpp:564-569); the build itself never aborts.
        this.#buildDiagnostics.push({
          code: "missing-generic-shader",
          batchType,
          hullIndex,
          shader: String(area.shader ?? ""),
          area: String(area.name ?? "")
        });
        target.push(...pending.map(item => item.ref));
        return { count: 0, areas: pending };
      }
      const built = buildMeshArea(
        document,
        dna,
        area,
        shaderData,
        batchType,
        meshIndexOffset,
        path => dna.ModifyTextureResPath(
          path,
          this.#resourceExists,
          this.allowFileCaching ? this.#existingFilesCache : null,
        ),
        this.alphaCutoutShadowsEnabled,
      );
      pending.push(built);
    }
    target.push(...pending.map(item => item.ref));
    return { count: source.length, areas: pending };
  }

  /** Emits depth clones for transparent areas requesting Carbon depth generation. */
  @carbon.method
  @impl.implemented
  GenerateDepthFromAreaVector(document, depthAreas, transparentAreas, dna)
  {
    const depthShader = dna.GetGenericAreaShaderData("depthonlyv5.fx");
    for (const source of transparentAreas)
    {
      if (!source.generateDepthArea) continue;
      const sourceEffect = document.GetNode(source.effect.$ref);
      let effectFields = cloneFields(sourceEffect.fields);
      if (depthShader)
      {
        const resource = source.resourceRefs.get(depthShader.transparencyTextureName);
        effectFields = {
          ...effectFields,
          effectFilePath: dna.GetCompleteShaderPath("depthonlyv5.fx"),
          constParameters: [],
          parameters: [],
          resources: resource ? [resource] : []
        };
      }
      const effect = document.AddNode("Tr2Effect", effectFields);
      const areaFields = { ...source.fields, effect };
      depthAreas.push(document.AddNode("Tr2MeshArea", areaFields));
    }
  }

  /** Emits enabled pattern projections as EveCustomMask graph nodes. */
  @carbon.method
  @impl.adapted
  SetupCustomMask(document, rootFields, dna)
  {
    const application = dna.GetPatternApplicationData();
    if (!application) return;
    const layerCount = dna.GetPatternLayerCount();
    for (let layerIndex = 0; layerIndex < layerCount; layerIndex++)
    {
      const projection = dna.GetPatternProjectionData(application, layerIndex);
      if (!projection?.enabled) continue;
      const layer = dna.GetPatternLayerData(application, layerIndex);
      const targetMaterials = dna.GetMaterialTargets(layer);
      if (!layer || !targetMaterials) continue;
      rootFields.customMasks.push(document.AddNode("EveCustomMask", {
        position: arrayValue(projection.position, [0, 0, 0]),
        scaling: arrayValue(projection.scaling, [1, 1, 1]),
        rotation: arrayValue(projection.rotation, [0, 0, 0, 1]),
        isMirrored: projection.isMirrored === true,
        clampU: layer.projectionAddressModeU === 3,
        clampV: layer.projectionAddressModeV === 3,
        materialIndex: Number(layer.materialSourceID ?? 0),
        targetMaterials: arrayValue(targetMaterials, [0, 0, 0, 0])
      }));
    }
  }

  /** Emits Carbon decal sets and records private static indices for SOF hydration. */
  @carbon.method
  @impl.adapted
  SetupDecalSets(document, rootFields, dna)
  {
    const hullOffset = [0, 0, 0];
    const combinedGeometryPath = dna.GetHullGeometryResPath().toLowerCase();
    for (let hullIndex = 0; hullIndex < dna.GetMultiHullCount(); hullIndex++)
    {
      for (const decalSet of dna.GetHullDecalSets(hullIndex))
      {
        if (!dna.IsInVisibilityData(decalSet.visibilityGroup)) continue;
        for (const item of decalSet.items)
        {
          const usage = Number(item.usage);
          const effectName = DECAL_EFFECT_NAMES[usage];
          if (!effectName) continue;
          if (usage === EveSOFDataHullDecalSetItem.Usage.USAGE_LOGO && !dna.HasLogoSet(item.logoType)) continue;

          const constParameters = [];
          const parameterNames = new Set();
          if (usage !== EveSOFDataHullDecalSetItem.Usage.USAGE_STANDARD && usage !== EveSOFDataHullDecalSetItem.Usage.USAGE_LOGO)
          {
            const color = dna.GetColorSet()[item.glowColorType];
            if (color)
            {
              parameterNames.add("DecalGlowColor");
              constParameters.push(document.AddNode("Tr2ConstantEffectParameter", {
                name: "DecalGlowColor",
                value: Array.from(color)
              }));
            }
          }
          for (const name of sortedKeys(item.parameters))
          {
            if (parameterNames.has(name)) continue;
            parameterNames.add(name);
            constParameters.push(document.AddNode("Tr2ConstantEffectParameter", {
              name,
              value: Array.from(item.parameters.get(name))
            }));
          }

          const resources = [];
          const resourceNames = new Set();
          const addResource = (name, resourcePath) => {
            if (resourceNames.has(name)) return;
            resourceNames.add(name);
            resources.push(document.AddNode("TriTextureParameter", { name, resourcePath }));
          };
          for (const name of sortedKeys(item.textures)) addResource(name, item.textures.get(name).resFilePath);

          const shaderData = dna.GetGenericDecalShaderData(effectName);
          if (shaderData)
          {
            for (const name of sortedKeys(shaderData.defaultTextures))
            {
              addResource(name, shaderData.defaultTextures.get(name).resFilePath);
            }
            if (item.meshIndex !== -1)
            {
              for (const name of shaderData.parentTextures)
              {
                const resourcePath = dna.GetHullTextureWithMeshIndex(
                  name,
                  item.meshIndex,
                  hullIndex,
                  this.#resourceExists,
                  this.allowFileCaching ? this.#existingFilesCache : null
                );
                if (resourcePath !== null) addResource(name, resourcePath);
              }
            }
          }
          if (usage === EveSOFDataHullDecalSetItem.Usage.USAGE_LOGO)
          {
            const logo = dna.GetLogo(item.logoType);
            for (const name of sortedKeys(logo.textures)) addResource(name, logo.textures.get(name).resFilePath);
          }

          const effect = document.AddNode("Tr2Effect", {
            effectFilePath: `${dna.GetDecalShaderLocationResPath()}/${dna.GetShaderPrefix(false)}${effectName}`,
            constParameters,
            parameters: [],
            resources
          });
          const position = arrayValue(item.position, [0, 0, 0]);
          addOffset(position, hullOffset);
          const indexBuffers = selectDecalIndexBuffers(item, dna.GetMultiHullCount(), combinedGeometryPath);
          rootFields.decals.push(document.AddNode("EveSpaceObjectDecal", {
            position,
            rotation: arrayValue(item.rotation, [0, 0, 0, 1]),
            scaling: arrayValue(item.scaling, [1, 1, 1]),
            parentBoneIndex: item.boneIndex,
            minScreenSize: 10,
            decalEffect: effect,
            staticIndexBuffers: indexBuffers
          }));
        }
      }
      addOffset(hullOffset, dna.GetHullNextSubsystemOffset(hullIndex));
    }
  }

  /** Emits Carbon's CPU-side armor, hull, flicker, and shield impact graph. */
  @carbon.method
  @impl.adapted
  SetupImpactEffects(document, rootFields, dna)
  {
    const impactType = dna.GetImpactEffectType();
    if (impactType === EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_NONE) return;
    const damage = dna.GetGenericDamageData();
    const hullDamage = dna.GetGenericHullDamageData();
    const raceDamage = dna.GetRaceDamageData();
    if (!damage || !raceDamage) return;

    let shieldMesh = null;
    if (impactType === EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_ELLIPSOID)
    {
      const shieldEffect = document.AddNode("Tr2Effect", {
        effectFilePath: `${dna.GetAreaShaderLocationResPath()}/${dna.GetImpactShieldShader()}`,
        constParameters: effectParameters(document, raceDamage.shieldDamageParameters),
        parameters: [],
        resources: effectResources(document, raceDamage.shieldDamageTextures)
      });
      const shieldArea = document.AddNode("Tr2MeshArea", { effect: shieldEffect });
      shieldMesh = document.AddNode("Tr2Mesh", {
        geometryResPath: damage.shieldGeometryResFilePath,
        additiveAreas: [shieldArea]
      });
    }

    const armorDamageShader = document.AddNode("Tr2Effect", {
      effectFilePath: dna.GetCompleteShaderPath(damage.armorShader),
      constParameters: effectParameters(document, raceDamage.armorDamageParameters),
      parameters: [],
      resources: effectResources(document, raceDamage.armorDamageTextures)
    });
    const armorImpactEmitter = createImpactEmitter(document, {
      rate: damage.armorParticleRate,
      angle: damage.armorParticleAngle,
      innerAngle: 0,
      minMaxSpeed: damage.armorParticleMinMaxSpeed,
      minMaxLifeTime: damage.armorParticleMinMaxLifeTime,
      sizes: damage.armorParticleSizes,
      colors: damage.armorParticleColors,
      textureIndex: damage.armorParticleTextureIndex,
      velocityStretchRotation: damage.armorParticleVelocityStretchRotation,
      drag: damage.armorParticleDrag,
      turbulenceAmplitude: damage.armorParticleTurbulenceAmplitude,
      turbulenceFrequency: damage.armorParticleTurbulenceFrequency,
      colorMidpoint: damage.armorParticleColorMidPoint
    });
    const hullImpactEmitter = hullDamage ? createImpactEmitter(document, {
      rate: hullDamage.hullParticleRate,
      angle: hullDamage.hullParticleAngle,
      innerAngle: hullDamage.hullParticleInnerAngle,
      minMaxSpeed: hullDamage.hullParticleMinMaxSpeed,
      minMaxLifeTime: hullDamage.hullParticleMinMaxLifeTime,
      sizes: hullDamage.hullParticleSizes,
      colors: hullDamage.hullParticleColors,
      textureIndex: hullDamage.hullParticleTextureIndex,
      velocityStretchRotation: hullDamage.hullParticleVelocityStretchRotation,
      drag: hullDamage.hullParticleDrag,
      turbulenceAmplitude: hullDamage.hullParticleTurbulenceAmplitude,
      turbulenceFrequency: hullDamage.hullParticleTurbulenceFrequency,
      colorMidpoint: hullDamage.hullParticleColorMidpoint
    }) : null;
    const flickerCurve = document.AddNode("TriPerlinCurve", {
      alpha: damage.flickerPerlinAlpha,
      beta: damage.flickerPerlinBeta,
      N: damage.flickerPerlinN,
      speed: damage.flickerPerlinSpeed,
      offset: 1,
      scale: 0
    });
    const shieldIsEllipsoid = impactType === EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_ELLIPSOID;
    rootFields.impactOverlay = document.AddNode("EveImpactOverlay", {
      mesh: shieldMesh,
      shieldIsEllipsoid,
      armorDamageShader,
      armorImpactEmitter,
      hullDamageFlickerCurve: flickerCurve,
      hullImpactEmitter
    });
  }

  /** Selects Carbon's legacy or SOF6 effect-child path. */
  @carbon.method
  @impl.adapted
  SetupEffects(document, objectFields, childOwnerFields, dna, offsets = [identityMatrix()], buildFlags = EveSOFDataHull.BuildFilter.STANDALONE)
  {
    if (dna.UsingSof6())
    {
      this.SetupEffectChildren(document, objectFields, childOwnerFields, dna, offsets, buildFlags);
    }
    else
    {
      this.SetupChildrenAndAnimations(document, objectFields, childOwnerFields, dna, offsets, buildFlags);
    }
  }

  /** Emits legacy path-resolved children and Carbon's authored animation graph. */
  @carbon.method
  @impl.adapted
  SetupChildrenAndAnimations(document, objectFields, childOwnerFields, dna, offsets = [identityMatrix()], buildFlags = EveSOFDataHull.BuildFilter.STANDALONE)
  {
    const emitterTargetsById = new Map();
    for (const child of dna.GetHullChildren())
    {
      if (((Number(child.buildFilter) >>> 0) & (Number(buildFlags) >>> 0)) === 0) continue;
      const factionChild = dna.GetFactionChildData(child.groupIndex);
      if (factionChild && !factionChild.isVisible) continue;
      const descriptor = this.#resolveChildResource(child.redFilePath, child, false);
      // Carbon returns from SetupChildrenAndAnimations on a wrong-type child,
      // skipping the remaining children AND the animation pass (EveSOF.cpp:
      // 1840-1844); an unresolvable resource only skips the one child (1779-1783).
      if (descriptor === WRONG_TYPE_CHILD) return;
      if (!descriptor) continue;
      // Emitter rate bindings reach INTO the loaded child's graph; a deferred
      // EveChildRef has no graph to bind yet, so the binding is recorded as a
      // diagnostic instead of silently dropped. Embedding resolvers keep the
      // full Carbon binding behavior.
      if (descriptor.reference && Number(child.id ?? -1) !== -1)
      {
        this.#buildDiagnostics.push({
          code: "deferred-child-animation-binding",
          path: String(child.redFilePath ?? ""),
          id: Number(child.id)
        });
      }
      for (const offset of offsets)
      {
        const animationId = Number(child.id ?? -1);
        const ref = this.#addResolvedChild(document, objectFields, childOwnerFields, descriptor, child, offset);
        if (animationId !== -1)
        {
          if (!emitterTargetsById.has(animationId)) emitterTargetsById.set(animationId, []);
          emitterTargetsById.get(animationId).push(...collectDynamicEmitterRefs(document, ref, descriptor.target));
        }
      }
    }

    for (const animation of dna.GetHullAnimations())
    {
      const curves = [];
      const bindings = [];
      if (Number(animation.id) !== -1 && Number(animation.startRate) !== -1)
      {
        const scalar = document.AddNode("Tr2CurveScalar", {
          keys: [
            scalarKey(0, animation.startRate),
            scalarKey(1, animation.endRate)
          ]
        });
        for (const emitter of emitterTargetsById.get(Number(animation.id)) ?? [])
        {
          bindings.push(document.AddNode("TriValueBinding", {
            sourceAttribute: "currentValue",
            sourceObject: scalar,
            destinationAttribute: "rate",
            destinationObject: emitter
          }));
        }
        curves.push(scalar);
      }
      if (Number(animation.startRotationTime) !== -1)
      {
        const curve = document.AddNode("Tr2CurveQuaternion", {
          keys: [
            quaternionKey(animation.startRotationTime, animation.startRotationValue),
            quaternionKey(animation.endRotationTime, animation.endRotationValue)
          ]
        });
        curves.push(curve);
        if (!objectFields.modelRotationCurve)
        {
          objectFields.modelRotationCurve = document.AddNode("Tr2RotationAdapter", {});
        }
        bindings.push(document.AddNode("TriValueBinding", {
          sourceAttribute: "currentValue",
          sourceObject: curve,
          destinationAttribute: "value",
          destinationObject: objectFields.modelRotationCurve
        }));
      }
      objectFields.curveSets.push(document.AddNode("TriCurveSet", {
        name: String(animation.name ?? ""),
        curves,
        bindings
      }));
      // Carbon also leaves authored translation animation as a TODO.
    }
  }

  /** Emits SOF6 child sets after visibility and build-filter selection. */
  @carbon.method
  @impl.adapted
  SetupEffectChildren(document, objectFields, childOwnerFields, dna, offsets = [identityMatrix()], buildFlags = EveSOFDataHull.BuildFilter.STANDALONE)
  {
    for (const childSet of dna.GetHullChildSets())
    {
      if (!dna.IsInVisibilityData(childSet.visibilityGroup)) continue;
      for (const child of childSet.items)
      {
        if (((Number(child.buildFilter) >>> 0) & (Number(buildFlags) >>> 0)) === 0) continue;
        const descriptor = this.#resolveChildResource(child.redFilePath, child, true);
        // Carbon returns from SetupEffectChildren entirely on a wrong-type
        // child, skipping the remaining child sets (EveSOF.cpp:2000-2004).
        if (descriptor === WRONG_TYPE_CHILD) return;
        if (!descriptor) continue;
        for (const offset of offsets)
        {
          this.#addResolvedChild(document, objectFields, childOwnerFields, descriptor, child, offset);
        }
      }
    }
  }

  #resolveChildResource(redFilePath, child, sof6)
  {
    // Without a resolver the build stays complete AS DATA through Carbon's
    // own deferred-loading node: EveChildRef persists resPath, placement, and
    // loadChildAutomatically, and the runtime loads and attaches the child
    // when it pleases (EveChildRef_Blue.cpp:22-34). The type-based
    // children/effectChildren routing then happens at load time, where the
    // real root type is known. A configured resolver instead embeds the
    // child inline (the resolver supplies the type Carbon's cast would see).
    if (!this.#childResourceResolver)
    {
      return {
        kind: "EveChildRef",
        target: "effectChildren",
        reference: true,
        fields: {
          resPath: String(redFilePath ?? ""),
          loadChildAutomatically: true
        },
        raw: {},
        fragment: null,
        rootRef: null
      };
    }
    let descriptor = this.#childResourceResolver(String(redFilePath ?? ""), { child, sof6 });
    if (descriptor && typeof descriptor.then === "function")
    {
      throw new TypeError("EveSOF child resource resolver must be synchronous");
    }
    if (descriptor === null || descriptor === undefined)
    {
      // Carbon: CCP_LOGERR("resource file %s is invalid!") and the child is
      // skipped (EveSOF.cpp:1779-1783,1942-1946).
      this.#buildDiagnostics.push({
        code: "unresolved-child-resource",
        reason: "not-resolved",
        path: String(redFilePath ?? "")
      });
      return null;
    }
    if (!descriptor || typeof descriptor !== "object")
    {
      throw new TypeError("EveSOF child resource resolver must return a child descriptor or null");
    }
    if (IsCarbonDocument(descriptor)) descriptor = { document: descriptor };
    let kind = descriptor.kind;
    let fragment = null;
    let rootRef = null;
    if (descriptor.document)
    {
      fragment = descriptor.document;
      rootRef = descriptor.root ?? fragment.roots?.[0]?.ref ?? null;
      if (!rootRef || !Number.isInteger(Number(rootRef.$ref)))
      {
        throw new TypeError("EveSOF child document descriptor requires a valid root ref");
      }
      kind = fragment.nodes?.find(node => Number(node.id) === Number(rootRef.$ref))?.kind;
    }
    if (typeof kind !== "string" || kind.length === 0)
    {
      throw new TypeError("EveSOF child resource descriptor requires a root kind");
    }
    const isTransform = CHILD_TRANSFORM_KINDS.has(kind)
      || descriptorClaimsInterface(descriptor, "EveTransform");
    const isSpaceObjectChild = SPACE_OBJECT_CHILD_KINDS.has(kind)
      || descriptorClaimsInterface(descriptor, "IEveSpaceObjectChild");
    const target = descriptor.target ?? (isTransform ? "children" : "effectChildren");
    if (target !== "children" && target !== "effectChildren")
    {
      throw new TypeError("EveSOF child resource target must be children or effectChildren");
    }
    // Carbon casts the loaded root: EveTransform joins the children list,
    // IEveSpaceObjectChild joins the effect children, and anything else logs
    // "not of correct type" and aborts the surrounding setup pass
    // (EveSOF.cpp:1786-1844,1949-2004).
    if (target === "children" ? !isTransform : !isSpaceObjectChild)
    {
      this.#buildDiagnostics.push({
        code: "child-resource-wrong-type",
        path: String(redFilePath ?? ""),
        kind,
        target
      });
      return WRONG_TYPE_CHILD;
    }
    return {
      kind,
      target,
      fields: descriptor.fields && typeof descriptor.fields === "object" ? descriptor.fields : {},
      raw: descriptor.raw && typeof descriptor.raw === "object" ? descriptor.raw : {},
      fragment,
      rootRef
    };
  }

  #addResolvedChild(document, objectFields, childOwnerFields, descriptor, child, offset)
  {
    const placement = composeChildPlacement(child, offset);
    // "children"-target hosts accept only the SRT placement; effect children
    // additionally receive Carbon's LOD gate and placement origin.
    const placementFields = descriptor.target === "children"
      ? {
        scaling: placement.scaling,
        rotation: placement.rotation,
        translation: placement.translation
      }
      : placement;
    let ref;
    if (descriptor.fragment)
    {
      ref = document.ImportRoot(descriptor.fragment, descriptor.rootRef);
      const node = document.GetNode(ref.$ref);
      if (descriptor.raw) node.raw = { ...(node.raw ?? {}), ...cloneValue(descriptor.raw) };
      Object.assign(node.fields, cloneValue(placementFields));
    }
    else
    {
      ref = document.AddNode(
        descriptor.kind,
        { ...cloneFields(descriptor.fields), ...cloneValue(placementFields) },
        descriptor.raw ? cloneValue(descriptor.raw) : null
      );
    }
    const ownerFields = descriptor.target === "children" ? objectFields : childOwnerFields;
    ownerFields[descriptor.target].push(ref);
    return ref;
  }

  /** Emits local observers while retaining audio-backend construction intent. */
  @carbon.method
  @impl.adapted
  SetupAudio(document, rootFields, dna, parentOffset = identityMatrix())
  {
    const ignoredScale = vec3.create();
    const parentRotation = quat.create();
    const ignoredTranslation = vec3.create();
    decomposeCarbonMatrix(
      arrayValue(parentOffset, identityMatrix()),
      parentRotation,
      ignoredTranslation,
      ignoredScale
    );
    for (const emitter of dna.GetHullSoundEmitters())
    {
      const position = vec3.transformMat4(
        vec3.create(),
        arrayValue(emitter.position, [0, 0, 0]),
        arrayValue(parentOffset, identityMatrix())
      );
      const rotation = quat.multiply(
        quat.create(),
        parentRotation,
        arrayValue(emitter.rotation, [0, 0, 0, 1])
      );
      const front = vec3.transformQuat(vec3.create(), [0, 0, 1], rotation);
      // The emitter is a declared node in the observer's own `observer` slot,
      // not a descriptor hidden beside it. TriObserverLocal exists to hold "an
      // audio or placement observer" and forwards placement to it through
      // `observer.UpdatePlacement`, so this is the field the class was written
      // for; leaving it null and stashing a class name in `raw` described the
      // graph instead of being it.
      //
      // This emits a declarative identity and constructs nothing. Building the
      // live emitter remains runtime-audio's alone, which is what
      // ../docs/architecture/class-ownership.md permits a producer to carry.
      // The node also keeps runtime-sof standalone: no audio import is needed
      // to name a node any more than to name a Trinity one.
      rootFields.observers.push(document.AddNode("TriObserverLocal", {
        name: String(emitter.name ?? ""),
        position: Array.from(position),
        front: Array.from(front),
        observer: document.AddNode("AudEmitter", {
          name: String(emitter.name ?? ""),
          eventPrefix: String(emitter.prefix ?? ""),
          position: Array.from(position),
          scalingFactor: Number(emitter.attenuationScalingFactor ?? 1)
        })
      }));
    }
  }

  /** Loads filtered controller graph resources through the CPU document seam. */
  @carbon.method
  @impl.adapted
  SetupControllers(document, rootFields, dna, buildFlags = EveSOFDataHull.BuildFilter.STANDALONE)
  {
    for (const controller of dna.GetHullControllers())
    {
      if (((Number(controller.buildFilter) >>> 0) & (Number(buildFlags) >>> 0)) === 0) continue;
      const descriptor = this.#resolveObjectResource(controller.path, "controller");
      if (descriptor) rootFields.controllers.push(this.#addObjectResource(document, descriptor));
    }
  }

  /** Loads authored model curve resources after legacy animation bindings. */
  @carbon.method
  @impl.adapted
  SetupModelCurves(document, rootFields, dna)
  {
    const rotationPath = dna.GetModelRotationCurvePath();
    if (rotationPath)
    {
      const descriptor = this.#resolveObjectResource(rotationPath, "modelRotationCurve");
      if (descriptor) rootFields.modelRotationCurve = this.#addObjectResource(document, descriptor);
    }
    const translationPath = dna.GetModelTranslationCurvePath();
    if (translationPath)
    {
      const descriptor = this.#resolveObjectResource(translationPath, "modelTranslationCurve");
      if (descriptor) rootFields.modelTranslationCurve = this.#addObjectResource(document, descriptor);
    }
  }

  /** Emits Carbon's first-hull instanced attachment container and child meshes. */
  @carbon.method
  @impl.adapted
  SetupInstancedMeshes(document, rootFields, dna, offsets = [identityMatrix()])
  {
    const hullInstanced = dna.GetHullInstancedMeshes();
    if (hullInstanced.length === 0) return null;

    let meshContainer = null;
    for (const ref of rootFields.effectChildren)
    {
      const node = document.GetNode(ref?.$ref);
      if (node?.kind === "EveChildContainer" && node.fields?.name === "Instanced Meshes")
      {
        meshContainer = ref;
        break;
      }
    }
    if (!meshContainer)
    {
      meshContainer = document.AddNode("EveChildContainer", {
        name: "Instanced Meshes",
        objects: []
      });
      rootFields.effectChildren.push(meshContainer);
    }
    const containerFields = document.GetNode(meshContainer.$ref).fields;
    if (!Array.isArray(containerFields.objects)) containerFields.objects = [];

    for (const source of hullInstanced)
    {
      if (!Array.isArray(source.instances) || source.instances.length === 0) continue;
      const propagated = propagateInstancedMeshInstances(source.instances, offsets);
      const built = this.CreateInstancedMesh(document, propagated.instances, source.geometryResPath);
      if (!built) continue;

      const shaderData = dna.GetGenericAreaShaderData(source.shader);
      if (shaderData)
      {
        built.opaqueAreas.push(createInstancedMeshArea(
          document,
          dna,
          source,
          shaderData,
          path => dna.ModifyTextureResPath(
            path,
            this.#resourceExists,
            this.allowFileCaching ? this.#existingFilesCache : null,
          ),
        ));
      }

      const child = document.AddNode("EveChildMesh", {
        name: "",
        mesh: built.ref,
        castShadow: dna.CastShadow(),
        minScreenSize: MIN_MESH_SCREEN_SIZE,
        lowestLodVisible: Number(source.lowestLodVisible ?? 0),
        instanceTransforms: propagated.instanceTransforms
      });

      if (Number(source.displayModifier) !== EveSOFDataInstancedMesh.DisplayQualityModifier.SHADER_ALL)
      {
        containerFields.objects.push(document.AddNode("EveChildContainer", {
          name: "Shader Quality Controlled Instanced Mesh",
          displayFilter: Number(source.displayModifier ?? 0),
          objects: [child]
        }));
      }
      else
      {
        containerFields.objects.push(child);
      }
    }
    return meshContainer;
  }

  /** Creates the CPU-document half of Carbon's Tr2InstancedMesh pair. */
  @carbon.method
  @impl.adapted
  CreateInstancedMesh(document, instances, resourcePath)
  {
    if (!Array.isArray(instances) || instances.length === 0) return null;
    const bounds = translationBounds(instances);
    const maxScale = maximumInstanceScale(instances);
    const instanceData = document.AddNode("Tr2RuntimeInstanceData", {
      name: "",
      particleSystem: null,
      layout: SOF_INSTANCE_LAYOUT.map(value => ({ ...value })),
      rows: cloneValue(instances),
      explicitBoundingBox: true,
      aabbMin: bounds.min,
      aabbMax: bounds.max
    });
    const opaqueAreas = [];
    const ref = document.AddNode("Tr2InstancedMesh", {
      geometryResPath: String(resourcePath ?? ""),
      opaqueAreas,
      boundsMethod: 2,
      instanceGeometryResPath: String(resourcePath ?? ""),
      instanceGeometryResource: instanceData,
      instanceMeshIndex: 0,
      minBounds: [0, 0, 0],
      maxBounds: [0, 0, 0],
      maxInstanceSize: maxScale
    });
    return { ref, instanceData, opaqueAreas, bounds, maxScale };
  }

  /** Emits Carbon layout placement batches from the deterministic CPU plan. */
  @carbon.method
  @impl.adapted
  SetupLayout(document, rootFields, dna, options = {}, targetFields = null)
  {
    const plan = planSofLayouts(dna, options ?? {});
    if (plan.placements.length === 0) return plan;

    const layoutFields = targetFields ?? {
      name: "layouts",
      objects: [],
      curveSets: [],
      attachments: [],
      observers: [],
      lights: [],
      controllers: [],
      alwaysOn: true,
      origin: 1
    };
    const batches = groupLayoutPlacements(plan.placements);
    let sharedRef = null;
    let sharedMeshes = null;

    for (const occurrences of batches)
    {
      const first = occurrences[0];
      const extensionDna = this.CreateDna(first.dna);
      if (!extensionDna) continue;
      if (first.isInstanced) extensionDna.DisableAnimation();
      const transforms = occurrences.map(value => arrayValue(value.transform, identityMatrix()));
      updateLayoutBounds(rootFields, extensionDna, occurrences);
      const needsPlacementContainer = extensionDna.IsHullAnimated()
        || extensionDna.GetHullControllers().length !== 0;
      const placementFields = needsPlacementContainer
        ? occurrences.map(() => createLayoutContainerFields(first.name))
        : [];
      const placementAnimationOwners = needsPlacementContainer
        ? occurrences.map(() => null)
        : [];

      if (first.isInstanced && first.isShared)
      {
        const areas = this.CreateSharedLayoutAreas(document, extensionDna);
        if (areas.length !== 0)
        {
          if (!sharedRef)
          {
            sharedMeshes = [];
            sharedRef = document.AddNode("EveChildInstancedMeshes", {
              name: "SharedInstancedMeshes",
              meshes: sharedMeshes
            });
            rootFields.effectChildren.push(sharedRef);
          }
          const instances = transforms.map((transform, sphereIndex) => document.AddNode(
            "EveChildInstancedMeshInstance",
            { transform, sphereIndex }
          ));
          sharedMeshes.push(document.AddNode("EveChildInstancedMesh", {
            geometryPath: extensionDna.GetHullGeometryResPath(),
            castsShadow: extensionDna.CastShadow(),
            reflectionMode: extensionDna.GetReflectionMode(),
            meshIndex: 0,
            areas,
            instances,
            sofHullName: this.editorMode ? dna.GetHullNames()[0] : "",
            sofLocatorSetName: this.editorMode ? first.locatorSetName : "",
            display: true
          }));
        }
      }
      else if (first.isInstanced)
      {
        const instances = occurrences.map(value => packInstanceMatrix(value.transform, value.locator?.boneIndex));
        const built = this.CreateLayoutInstancedMesh(document, extensionDna, instances);
        if (built)
        {
          const childFields = {
            name: "Instanced Hull",
            mesh: built.ref,
            castShadow: extensionDna.CastShadow(),
            reflectionMode: extensionDna.GetReflectionMode(),
            minScreenSize: MIN_MESH_SCREEN_SIZE,
            decals: [],
            attachments: [],
            lights: []
          };
          this.SetupDecalSets(document, childFields, extensionDna);
          addChildMeshShaderOption(
            document,
            childFields,
            "SPACE_OBJECT_INSTANCED_ATTACHMENT",
            "SOIA_ENABLED"
          );
          childFields.instanceTransforms = transforms;
          childFields.sofDna = this.editorMode ? extensionDna.GetDnaString() : "";
          childFields.sofParentHullName = this.editorMode ? dna.GetHullNames()[0] : "";
          childFields.sofLocatorSetName = this.editorMode ? first.locatorSetName : "";
          layoutFields.objects.push(document.AddNode("EveChildMesh", childFields));
        }
      }
      else
      {
        for (let occurrenceIndex = 0; occurrenceIndex < occurrences.length; occurrenceIndex++)
        {
          const occurrence = occurrences[occurrenceIndex];
          const rotation = quat.create();
          const translation = vec3.create();
          const ignoredScale = vec3.create();
          decomposeCarbonMatrix(occurrence.transform, rotation, translation, ignoredScale);
          const childFields = {
            name: "Hull",
            mesh: this.CreateMesh(extensionDna, document),
            castShadow: extensionDna.CastShadow(),
            reflectionMode: extensionDna.GetReflectionMode(),
            minScreenSize: MIN_MESH_SCREEN_SIZE,
            lowestLodVisible: 0,
            staticTransform: true,
            decals: [],
            attachments: [],
            lights: [],
            animationUpdater: extensionDna.IsHullAnimated()
              ? document.AddNode("Tr2GrannyAnimation", {})
              : null
          };
          if (!childFields.mesh) continue;
          this.SetupDecalSets(document, childFields, extensionDna);
          this.SetupAttachments(document, childFields, extensionDna, [identityMatrix()], false);
          childFields.scaling = arrayValue(occurrence.randomizedScaling, [1, 1, 1]);
          childFields.rotation = Array.from(rotation);
          childFields.translation = Array.from(translation);
          childFields.sofDna = this.editorMode ? extensionDna.GetDnaString() : "";
          childFields.sofParentHullName = this.editorMode ? dna.GetHullNames()[0] : "";
          childFields.sofLocatorSetName = this.editorMode ? first.locatorSetName : "";
          childFields.sofLocatorIndex = this.editorMode ? String(occurrence.locatorIndex) : "";
          const child = document.AddNode("EveChildMesh", childFields);
          if (needsPlacementContainer)
          {
            placementFields[occurrenceIndex].objects.push(child);
            if (extensionDna.IsHullAnimated()) placementAnimationOwners[occurrenceIndex] = child;
          }
          else
          {
            layoutFields.objects.push(child);
          }
        }
      }

      if (first.isInstanced)
      {
        this.SetupAttachments(document, layoutFields, extensionDna, transforms, true);
      }
      for (let index = 0; index < occurrences.length; index++)
      {
        const target = needsPlacementContainer ? placementFields[index] : layoutFields;
        if (needsPlacementContainer)
        {
          this.SetupControllers(document, target, extensionDna, first.buildFlags);
        }
        this.SetupAudio(document, target, extensionDna, transforms[index]);
      }
      const hasChildEffects = extensionDna.UsingSof6()
        ? extensionDna.GetHullChildSets().length !== 0
        : extensionDna.GetHullChildren().length !== 0;
      if (hasChildEffects)
      {
        const fakeFields = {
          effectChildren: [],
        };
        this.SetupEffects(document, rootFields, fakeFields, extensionDna, transforms, first.buildFlags);
        if (needsPlacementContainer)
        {
          fakeFields.effectChildren.forEach((ref, index) => {
            placementFields[index % placementFields.length].objects.push(ref);
          });
        }
      }
      if (needsPlacementContainer)
      {
        for (let index = 0; index < placementFields.length; index++)
        {
          const fields = placementFields[index];
          if (!layoutContainerIsEmpty(fields))
          {
            const owner = placementAnimationOwners[index];
            if (owner) fields.animationOwner = owner;
            layoutFields.objects.push(document.AddNode("EveChildContainer", fields));
          }
        }
      }
      this.SetupInstancedMeshes(document, rootFields, extensionDna, transforms);
      this.SetupLocatorSets(document, rootFields, extensionDna, transforms);
    }

    if (!targetFields && layoutFields.objects.length !== 0)
    {
      layoutFields.origin = 1;
      layoutFields.isPlacementRoot = true;
      rootFields.effectChildren.push(document.AddNode("EveChildContainer", layoutFields));
    }
    return plan;
  }

  /** Creates typed effect-area records for EveChildInstancedMeshes.meshes. */
  @carbon.method
  @impl.adapted
  CreateSharedLayoutAreas(document, dna)
  {
    const result = [];
    const types = [
      TriBatchType.TRIBATCHTYPE_OPAQUE,
      TriBatchType.TRIBATCHTYPE_DECAL,
      TriBatchType.TRIBATCHTYPE_TRANSPARENT,
      TriBatchType.TRIBATCHTYPE_ADDITIVE,
      TriBatchType.TRIBATCHTYPE_DISTORTION
    ];
    for (const batchType of types)
    {
      const source = dna.GetHullMeshAreas(batchType, 0);
      if (!source) continue;
      for (const area of source)
      {
        const shaderData = dna.GetGenericAreaShaderData(area.shader);
        if (!shaderData) continue;
        const built = buildMeshArea(
          document,
          dna,
          area,
          shaderData,
          batchType,
          0,
          path => dna.ModifyTextureResPath(
            path,
            this.#resourceExists,
            this.allowFileCaching ? this.#existingFilesCache : null,
          ),
          this.alphaCutoutShadowsEnabled,
          false
        );
        addEffectShaderOption(document, built.effect, "SPACE_OBJECT_INSTANCED_ATTACHMENT", "SOIA_SHARED");
        result.push(document.AddNode("EveChildInstancedMeshArea", {
          effect: built.effect,
          batchType: batchType === TriBatchType.TRIBATCHTYPE_DECAL
            ? TriBatchType.TRIBATCHTYPE_OPAQUE
            : batchType,
          areaIndex: Number(built.fields.index) >>> 0,
          areaCount: Number(built.fields.count) >>> 0
        }));
      }
    }
    return result;
  }

  /** Converts a placement transform batch into Carbon's non-shared instanced mesh graph. */
  @carbon.method
  @impl.adapted
  CreateLayoutInstancedMesh(document, dna, instances)
  {
    if (!instances.length) return null;
    const ref = this.CreateMesh(dna, document);
    if (!ref) return null;
    const node = document.GetNode(ref.$ref);
    const bounds = translationBounds(instances);
    const instanceData = document.AddNode("Tr2RuntimeInstanceData", {
      name: "",
      particleSystem: null,
      layout: SOF_INSTANCE_LAYOUT.map(value => ({ ...value })),
      rows: cloneValue(instances),
      explicitBoundingBox: true,
      aabbMin: bounds.min,
      aabbMax: bounds.max
    });
    node.kind = "Tr2InstancedMesh";
    Object.assign(node.fields, {
      boundsMethod: 2,
      instanceGeometryResPath: String(node.fields.geometryResPath ?? ""),
      instanceGeometryResource: instanceData,
      instanceMeshIndex: 0,
      minBounds: [0, 0, 0],
      maxBounds: [0, 0, 0],
      maxInstanceSize: maximumInstanceScale(instances)
    });
    return { ref, instanceData, bounds };
  }

  /** Emits Carbon's ship-only booster graph and booster locator records. */
  @carbon.method
  @impl.adapted
  SetupBoosters(document, rootFields, dna)
  {
    if (dna.GetHullBoosterCount() === 0) return null;
    const race = dna.GetRaceBoosterData();
    if (!race) return null;

    let alwaysOn = false;
    let hasTrails = false;
    let locatorIndex = 0;
    const items = [];
    const boosterLocatorRefs = [];
    const hullOffset = [0, 0, 0];
    for (let hullIndex = 0; hullIndex < dna.GetMultiHullCount(); hullIndex++)
    {
      const hull = dna.GetHullBoosterData(hullIndex) ?? { alwaysOn: false, hasTrails: true, items: [] };
      alwaysOn = hull.alwaysOn === true;
      hasTrails ||= hull.hasTrails === true;
      for (const item of hull.items ?? [])
      {
        const transform = arrayValue(item.transform, identityMatrix());
        transform[12] += hullOffset[0];
        transform[13] += hullOffset[1];
        transform[14] += hullOffset[2];
        rootFields.locators.push(document.AddNode("EveLocator2", {
          name: `locator_booster_${++locatorIndex}`,
          transform
        }));

        const ignoredScale = vec3.create();
        const rotation = quat.create();
        const position = vec3.create();
        decomposeCarbonMatrix(
          arrayValue(item.transform, identityMatrix()),
          rotation,
          position,
          ignoredScale
        );
        position[0] += hullOffset[0];
        position[1] += hullOffset[1];
        position[2] += hullOffset[2];
        boosterLocatorRefs.push(document.AddNode("Locator", {
          position: Array.from(position),
          direction: Array.from(rotation),
          scale: [0, 0, 0],
          boneIndex: -1
        }));
        items.push(document.AddNode("EveBoosterSet2Item", {
          transform,
          functionality: arrayValue(item.functionality, [0, 1, 1, 1]),
          hasTrail: item.hasTrail !== false,
          atlasIndex0: Number(item.atlasIndex0 ?? 0) >>> 0,
          atlasIndex1: Number(item.atlasIndex1 ?? 0) >>> 0,
          lightScale: Number(item.lightScale ?? 1)
        }));
      }
      addOffset(hullOffset, dna.GetHullNextSubsystemOffset(hullIndex));
    }
    mergeDocumentLocatorSet(document, rootFields, "boosters", boosterLocatorRefs);

    const effect = createBoosterEffect(document, race, "BOOSTER_LOD_HIGH");
    const effectFar = createBoosterEffect(document, race, "BOOSTER_LOD_LOW");
    const glowEffect = document.AddNode("Tr2Effect", {
      effectFilePath: "res:/Graphics/Effect/Managed/Space/Booster/BoosterGlowAnimated.fx",
      options: [],
      constParameters: [],
      parameters: [],
      resources: [
        document.AddNode("TriTextureParameter", {
          name: "NoiseMap",
          resourcePath: "res:/Texture/global/noise.dds"
        }),
        document.AddNode("TriTextureParameter", {
          name: "DiffuseMap",
          resourcePath: "res:/Texture/Particle/whitesharp.dds"
        })
      ],
      samplerOverrides: []
    });
    const glows = document.AddNode("EveSpriteSet", {
      sprites: [],
      effect: glowEffect
    });

    let trails = null;
    if (hasTrails)
    {
      const trailEffect = document.AddNode("Tr2Effect", {
        effectFilePath: "res:/Graphics/Effect/Managed/Space/Booster/VolumetricTrails.fx",
        options: [],
        constParameters: [
          document.AddNode("Tr2ConstantEffectParameter", {
            name: "TrailSize",
            value: arrayValue(race.trailSize, [0, 0, 0, 0])
          }),
          document.AddNode("Tr2ConstantEffectParameter", {
            name: "TrailColor",
            value: arrayValue(race.trailColor, [0, 0, 0, 0])
          })
        ],
        parameters: [],
        resources: [],
        samplerOverrides: []
      });
      trails = document.AddNode("EveTrailsSet", {
        // Carbon: trail->SetMeshResPath(g_volumetricTrailPath) (EveSOF.cpp:2720).
        geometryResPath: this.volumetricTrailPath,
        effect: trailEffect
      });
    }

    rootFields.boosters = document.AddNode("EveBoosterSet2", {
      glowScale: Number(race.glowScale ?? 1),
      glowColor: arrayValue(race.glowColor, [0, 0, 0, 0]),
      warpGlowColor: arrayValue(race.warpGlowColor, [0, 0, 0, 0]),
      symHaloScale: Number(race.symHaloScale ?? 1),
      haloScaleX: Number(race.haloScaleX ?? 1),
      haloScaleY: Number(race.haloScaleY ?? 1),
      haloColor: arrayValue(race.haloColor, [0, 0, 0, 0]),
      warpHaloColor: arrayValue(race.warpHaloColor, [0, 0, 0, 0]),
      alwaysOn,
      lightOffset: Number(race.lightOffset ?? 0),
      lightFlickerAmplitude: Number(race.lightFlickerAmplitude ?? 0),
      lightFlickerFrequency: Number(race.lightFlickerFrequency ?? 0),
      lightRadius: Number(race.lightRadius ?? 0),
      lightColor: arrayValue(race.lightColor, [0, 0, 0, 0]),
      lightWarpRadius: Number(race.lightWarpRadius ?? 0),
      lightWarpColor: arrayValue(race.lightWarpColor, [0, 0, 0, 0]),
      effect,
      effectFar,
      glows,
      trails,
      items
    });
    return rootFields.boosters;
  }

  #resolveObjectResource(path, role)
  {
    if (!this.#objectResourceResolver)
    {
      // Controllers have Carbon's own deferred node: Tr2ControllerReference
      // persists the path and loads the controller at runtime
      // (Tr2ControllerReference_Blue.cpp:16-23).
      if (role === "controller")
      {
        return {
          kind: "Tr2ControllerReference",
          reference: true,
          fields: { path: String(path ?? "") },
          raw: {},
          fragment: null,
          rootRef: null
        };
      }
      // Model curves have no Carbon reference node - Carbon inline-loads
      // them only because its blocking BeResMan made that free; nothing
      // about the loaded curve feeds back into composition. They defer
      // through the CarbonEngineJS-original CjsExternalRef, carrying the
      // interface gate for the loader to enforce at splice time.
      const gate = OBJECT_RESOURCE_ROLE_GATES[role];
      return {
        kind: "CjsExternalRef",
        reference: true,
        fields: {
          resPath: String(path ?? ""),
          expects: gate ? gate.interfaceName : ""
        },
        raw: {},
        fragment: null,
        rootRef: null
      };
    }
    let descriptor = this.#objectResourceResolver(String(path ?? ""), { role });
    if (descriptor && typeof descriptor.then === "function")
    {
      throw new TypeError("EveSOF object resource resolver must be synchronous");
    }
    if (descriptor === null || descriptor === undefined)
    {
      // Carbon: controllers log "controller resource file %s is invalid!"
      // (EveSOF.cpp:2028-2031); model curves skip silently (1672-1690).
      this.#buildDiagnostics.push({
        code: "unresolved-object-resource",
        reason: "not-resolved",
        role,
        path: String(path ?? "")
      });
      return null;
    }
    if (!descriptor || typeof descriptor !== "object")
    {
      throw new TypeError("EveSOF object resource resolver must return an object descriptor or null");
    }
    if (IsCarbonDocument(descriptor)) descriptor = { document: descriptor };
    let kind = descriptor.kind;
    let fragment = null;
    let rootRef = null;
    if (descriptor.document)
    {
      fragment = descriptor.document;
      rootRef = descriptor.root ?? fragment.roots?.[0]?.ref ?? null;
      if (!rootRef || !Number.isInteger(Number(rootRef.$ref)))
      {
        throw new TypeError("EveSOF object document descriptor requires a valid root ref");
      }
      kind = fragment.nodes?.find(node => Number(node.id) === Number(rootRef.$ref))?.kind;
    }
    if (typeof kind !== "string" || kind.length === 0)
    {
      throw new TypeError("EveSOF object resource descriptor requires a root kind");
    }
    // Carbon loads these roles through typed LoadObject calls, so a root that
    // does not implement the role's interface never attaches: controllers log
    // and skip (EveSOF.cpp:2024-2031); model curves skip (1672-1690).
    const gate = OBJECT_RESOURCE_ROLE_GATES[role];
    if (gate && !gate.kinds.has(kind) && !descriptorClaimsInterface(descriptor, gate.interfaceName))
    {
      this.#buildDiagnostics.push({
        code: "object-resource-wrong-type",
        role,
        path: String(path ?? ""),
        kind,
        expected: gate.interfaceName
      });
      return null;
    }
    return {
      kind,
      fields: descriptor.fields && typeof descriptor.fields === "object" ? descriptor.fields : {},
      raw: descriptor.raw && typeof descriptor.raw === "object" ? descriptor.raw : {},
      fragment,
      rootRef
    };
  }

  #addObjectResource(document, descriptor)
  {
    if (descriptor.fragment) return document.ImportRoot(descriptor.fragment, descriptor.rootRef);
    return document.AddNode(descriptor.kind, cloneFields(descriptor.fields), cloneValue(descriptor.raw));
  }

  /** Emits the currently maintained Carbon attachment stages in source order. */
  @carbon.method
  @impl.adapted
  SetupAttachments(document, rootFields, dna, offsets = [identityMatrix()], isInstancedPlacement = false)
  {
    // Carbon caches this effect on the EveSOF instance. Document-local sharing
    // avoids cross-build graph identity; do not widen it without an operational
    // consumer that requires mutable identity across builds.
    const sharedSpriteEffect = { ref: null };
    this.SetupSpriteSets(document, rootFields, dna, offsets, isInstancedPlacement, sharedSpriteEffect);
    this.SetupSpotlightSets(document, rootFields, dna, offsets, isInstancedPlacement);
    this.SetupPlaneSets(document, rootFields, dna, offsets, isInstancedPlacement);
    this.SetupSpriteLineSets(document, rootFields, dna, offsets, isInstancedPlacement, sharedSpriteEffect);
    this.SetupHazeSets(document, rootFields, dna, offsets, isInstancedPlacement);
    // Carbon gates banners on the owner's root object casting to EveSpaceObject2;
    // only space-object roots carry the externalParameters banner surface.
    if (Array.isArray(rootFields.externalParameters))
    {
      if (dna.UsingSof6()) this.SetupBannerSets(document, rootFields, dna, offsets);
      else this.SetupBanners(document, rootFields, dna, offsets);
    }
    this.SetupLights(document, rootFields, dna, offsets);
  }

  /** Emits visible EveSpriteSet attachments and their SOF6 lights. */
  @carbon.method
  @impl.adapted
  SetupSpriteSets(document, rootFields, dna, offsets = [identityMatrix()], isInstancedPlacement = false, sharedEffect = { ref: null })
  {
    const hullOffset = [0, 0, 0];
    for (let hullIndex = 0; hullIndex < dna.GetMultiHullCount(); hullIndex++)
    {
      for (const set of dna.GetHullSpriteSets(hullIndex))
      {
        if (!dna.IsInVisibilityData(set.visibilityGroup)) continue;
        if (!sharedEffect.ref)
        {
          sharedEffect.ref = document.AddNode("Tr2Effect", {
            effectFilePath: "res:/graphics/effect/managed/space/spaceobject/fx/blinkinglightspool.fx",
            constParameters: [],
            parameters: [],
            resources: []
          });
        }

        const sprites = [];
        const lights = [];
        let index = 0;
        for (const offset of offsets)
        {
          for (const item of set.items)
          {
            const sourceColor = dna.GetColorSet()[item.colorType];
            if (!sourceColor) continue;
            let color = Array.from(sourceColor, value => Number(value) * Number(item.intensity ?? 1));
            const position = vec3.transformMat4(
              vec3.create(),
              [
                Number(item.position?.[0] ?? 0) + hullOffset[0],
                Number(item.position?.[1] ?? 0) + hullOffset[1],
                Number(item.position?.[2] ?? 0) + hullOffset[2]
              ],
              arrayValue(offset, identityMatrix())
            );
            if (dna.UsingSof6()) color = saturateColor(color, item.saturation);

            sprites.push(document.AddNode("EveSpriteSetItem", {
              blinkPhase: Number(item.blinkPhase ?? 0),
              blinkRate: Number(item.blinkRate ?? 0.1),
              boneIndex: Number(item.boneIndex ?? 0),
              falloff: Number(item.falloff ?? 0),
              maxScale: Number(item.maxScale ?? 10),
              minScale: Number(item.minScale ?? 1),
              position: Array.from(position),
              color
            }));

            if (dna.UsingSof6())
            {
              if (item.light)
              {
                const lightColor = saturateColor(color, item.light.saturation);
                lights.push(document.AddNode("EveSpriteLight", {
                  lightData: {
                    position: [
                      Number(item.light.translation?.[0] ?? 0) + position[0],
                      Number(item.light.translation?.[1] ?? 0) + position[1],
                      Number(item.light.translation?.[2] ?? 0) + position[2]
                    ],
                    rotation: arrayValue(item.light.rotation, [0, 0, 0, 1]),
                    color: lightColor,
                    radius: Number(item.light.outerScaleMultiplier ?? 2),
                    innerRadius: Number(item.light.innerScaleMultiplier ?? 1),
                    brightness: Number(item.light.intensity ?? 1),
                    noiseAmplitude: Number(item.light.noiseAmplitude ?? 0),
                    noiseFrequency: Number(item.light.noiseFrequency ?? 1),
                    noiseOctaves: Number(item.light.noiseOctaves ?? 1),
                    boneIndex: Number(item.boneIndex ?? 0),
                    flags: 1,
                    startTime: this.buildTime,
                    castsShadows: 0,
                    isVolumetric: false
                  },
                  blinkPhase: Number(item.blinkPhase ?? 0),
                  blinkRate: Number(item.blinkRate ?? 0.1),
                  minScale: Number(item.minScale ?? 1),
                  maxScale: Number(item.maxScale ?? 10),
                  index,
                  lightProfilePath: String(item.light.lightProfilePath ?? "")
                }));
              }
              index++;
            }
          }
        }
        rootFields.attachments.push(document.AddNode("EveSpriteSet", {
          effect: sharedEffect.ref,
          skinned: set.skinned === true && !isInstancedPlacement,
          sprites,
          lights
        }));
      }
      addOffset(hullOffset, dna.GetHullNextSubsystemOffset(hullIndex));
    }
  }

  /** Emits Carbon spotlight geometry, effects, and authored SOF6 light descriptors. */
  @carbon.method
  @impl.adapted
  SetupSpotlightSets(document, rootFields, dna, offsets = [identityMatrix()], isInstancedPlacement = false)
  {
    const hullOffset = [0, 0, 0];
    for (let hullIndex = 0; hullIndex < dna.GetMultiHullCount(); hullIndex++)
    {
      for (const set of dna.GetHullSpotlightSets(hullIndex))
      {
        if (dna.UsingSof6() && !dna.IsInVisibilityData(set.visibilityGroup)) continue;

        const coneEffect = document.AddNode("Tr2Effect", {
          effectFilePath: "res:/graphics/effect/managed/space/spaceobject/fx/spotlightconepool.fx",
          constParameters: [document.AddNode("Tr2ConstantEffectParameter", {
            name: "zOffset",
            value: Array(4).fill(Number(set.zOffset ?? 0))
          })],
          parameters: [],
          resources: [document.AddNode("TriTextureParameter", {
            name: "TextureMap",
            resourcePath: String(set.coneTextureResPath ?? "")
          })]
        });
        const glowEffect = document.AddNode("Tr2Effect", {
          effectFilePath: "res:/graphics/effect/managed/space/spaceobject/fx/spotlightglowpool.fx",
          constParameters: [],
          parameters: [],
          resources: [document.AddNode("TriTextureParameter", {
            name: "TextureMap",
            resourcePath: String(set.glowTextureResPath ?? "")
          })]
        });
        const spotlightItems = [];
        const lights = [];
        let index = 0;

        for (const offset of offsets)
        {
          for (const item of set.items)
          {
            let coneColor;
            let flareColor;
            let spriteColor;
            let lightColor;
            if (dna.UsingSof6())
            {
              lightColor = dna.GetColorSet()[item.colorType];
              if (!lightColor) continue;
              coneColor = multiplyColor(modifyColor(lightColor, item.saturation * 0.75, 0.5), item.coneIntensity);
              flareColor = multiplyColor(modifyColor(lightColor, item.saturation, 1), item.flareIntensity);
              spriteColor = multiplyColor(modifyColor(lightColor, item.saturation * 0.9, 0.75), item.spriteIntensity);
            }
            else
            {
              const faction = dna.GetFactionSpotlightSetData(item.groupIndex);
              if (!faction) continue;
              coneColor = multiplyColor(faction.coneColor, item.coneIntensity);
              flareColor = multiplyColor(faction.flareColor, item.flareIntensity);
              spriteColor = multiplyColor(faction.spriteColor, item.spriteIntensity);
              lightColor = faction.coneColor;
            }

            const transform = arrayValue(item.transform, identityMatrix());
            mat4.multiply(
              transform,
              mat4.fromTranslation(mat4.create(), hullOffset),
              transform
            );
            mat4.multiply(transform, arrayValue(offset, identityMatrix()), transform);
            transform[12] += hullOffset[0];
            transform[13] += hullOffset[1];
            transform[14] += hullOffset[2];

            spotlightItems.push(document.AddNode("EveSpotlightSetItem", {
              boneIndex: Number(item.boneIndex ?? 0),
              boosterGainInfluence: item.boosterGainInfluence === true,
              coneColor,
              flareColor,
              spriteColor,
              spriteScale: arrayValue(item.spriteScale, [1, 1, 1]),
              transform
            }));

            if (dna.UsingSof6())
            {
              if (item.light)
              {
                const position = vec3.create();
                const rotation = quat.create();
                const scaling = vec3.create();
                decomposeCarbonMatrix(transform, rotation, position, scaling);
                const scale = Array.from(scaling, Math.abs);
                const angle = scale[2] > 0
                  ? Math.atan(Math.max(scale[0], scale[1]) / (2 * scale[2])) * 180 / Math.PI
                  : 0;
                const localPosition = vec3.transformQuat(
                  vec3.create(),
                  arrayValue(item.light.translation, [0, 0, 0]),
                  rotation
                );
                vec3.add(localPosition, localPosition, position);
                lights.push(document.AddNode("EveSpotlightLight", {
                  lightData: {
                    position: Array.from(localPosition),
                    rotation: Array.from(rotation),
                    color: saturateColor(lightColor, item.saturation * item.light.saturation),
                    innerAngle: Number(item.light.innerAngleMultiplier ?? 0.5) * angle,
                    outerAngle: Number(item.light.outerAngleMultiplier ?? 1) * angle,
                    innerRadius: Number(item.light.innerScaleMultiplier ?? 1) * scale[2],
                    radius: Number(item.light.outerScaleMultiplier ?? 1) * scale[2],
                    brightness: Number(item.light.intensity ?? 1) * Number(item.coneIntensity ?? 0),
                    noiseAmplitude: Number(item.light.noiseAmplitude ?? 0),
                    noiseFrequency: Number(item.light.noiseFrequency ?? 1),
                    noiseOctaves: Number(item.light.noiseOctaves ?? 1),
                    texturePath: String(item.light.lightProfilePath ?? ""),
                    boneIndex: Number(item.boneIndex ?? 0),
                    flags: 1,
                    startTime: this.buildTime,
                    castsShadows: 0,
                    isVolumetric: false
                  },
                  index,
                  lightProfilePath: String(item.light.lightProfilePath ?? ""),
                  boosterGainInfluence: item.boosterGainInfluence === true
                }));
              }
              index++;
            }
          }
        }

        rootFields.attachments.push(document.AddNode("EveSpotlightSet", {
          coneEffect,
          glowEffect,
          lights,
          skinned: set.skinned === true && !isInstancedPlacement,
          spotlightItems
        }));
      }
      addOffset(hullOffset, dna.GetHullNextSubsystemOffset(hullIndex));
    }
  }

  /** Emits Carbon plane-set effects, items, and authored SOF6 lights. */
  @carbon.method
  @impl.adapted
  SetupPlaneSets(document, rootFields, dna, offsets = [identityMatrix()], isInstancedPlacement = false)
  {
    const hullOffset = [0, 0, 0];
    for (let hullIndex = 0; hullIndex < dna.GetMultiHullCount(); hullIndex++)
    {
      for (const set of dna.GetHullPlaneSets(hullIndex))
      {
        if (dna.UsingSof6() && !dna.IsInVisibilityData(set.visibilityGroup)) continue;
        const skinned = set.skinned === true && !isInstancedPlacement;
        const resources = [];
        let imageMap = null;
        let pickBufferID = 0;
        if (set.usage === EveSOFDataHullPlaneSet.Usage.USAGE_SPACE_VIDEO)
        {
          imageMap = document.AddNode("TriTextureParameter", {
            name: "ImageMap",
            resourcePath: "dynamic:/inspacevideos"
          });
          resources.push(imageMap);
        }
        else if (set.usage === EveSOFDataHullPlaneSet.Usage.USAGE_HANGAR_VIDEO)
        {
          imageMap = document.AddNode("TriTextureParameter", {
            name: "ImageMap",
            resourcePath: "dynamic:/hangarvideos"
          });
          resources.push(imageMap);
          pickBufferID = 100;
        }
        const layerMap1 = document.AddNode("TriTextureParameter", {
          name: "Layer1Map",
          resourcePath: String(set.layer1MapResPath ?? "")
        });
        const layerMap2 = document.AddNode("TriTextureParameter", {
          name: "Layer2Map",
          resourcePath: String(set.layer2MapResPath ?? "")
        });
        const maskMap = document.AddNode("TriTextureParameter", {
          name: "MaskMap",
          resourcePath: String(set.maskMapResPath ?? "")
        });
        resources.push(layerMap1, layerMap2, maskMap);
        const planeData = [
          set.usage === EveSOFDataHullPlaneSet.Usage.USAGE_HAZE ? 1 : 0,
          Number(set.atlasSize ?? 1),
          Math.floor(Number(set.atlasAspectRatio?.[0] ?? 1)),
          Math.floor(Number(set.atlasAspectRatio?.[1] ?? 1))
        ];
        const effect = document.AddNode("Tr2Effect", {
          effectFilePath: getPlaneSetEffectPath(set.usage, skinned),
          constParameters: [document.AddNode("Tr2ConstantEffectParameter", {
            name: "PlaneData",
            value: planeData
          })],
          parameters: [],
          resources
        });

        const planes = [];
        const lights = [];
        let usesLightParameters = false;
        let index = 0;
        for (const offset of offsets)
        {
          for (const item of set.items)
          {
            const transform = mat4.fromRotationTranslationScale(
              mat4.create(),
              arrayValue(item.rotation, [0, 0, 0, 1]),
              [
                Number(item.position?.[0] ?? 0) + hullOffset[0],
                Number(item.position?.[1] ?? 0) + hullOffset[1],
                Number(item.position?.[2] ?? 0) + hullOffset[2]
              ],
              [1, 1, 1]
            );
            mat4.multiply(transform, arrayValue(offset, identityMatrix()), transform);
            const position = vec3.create();
            const rotation = quat.create();
            const ignoredScale = vec3.create();
            decomposeCarbonMatrix(transform, rotation, position, ignoredScale);

            let color;
            if (dna.UsingSof6())
            {
              const sourceColor = dna.GetColorSet()[item.colorType];
              if (!sourceColor) continue;
              color = saturateColor(multiplyColor(sourceColor, item.intensity), item.saturation);
            }
            else
            {
              color = arrayValue(item.color, [1, 1, 1, 1]);
              const faction = dna.GetFactionPlaneSetData(item.groupIndex);
              if (faction) color = arrayValue(faction.color, [0, 0, 0, 0]);
            }

            const blinkData = [
              Number(item.rate ?? 1),
              Number(item.phase ?? 0),
              Number(item.dutyCycle ?? 1),
              Number(item.blinkMode ?? 0)
            ];
            planes.push(document.AddNode("EvePlaneSetItem", {
              boneIndex: Number(item.boneIndex ?? -1),
              color,
              layer1Scroll: arrayValue(item.layer1Scroll, [0, 0, 0, 0]),
              layer1Transform: arrayValue(item.layer1Transform, [0, 0, 0, 0]),
              layer2Scroll: arrayValue(item.layer2Scroll, [0, 0, 0, 0]),
              layer2Transform: arrayValue(item.layer2Transform, [0, 0, 0, 0]),
              maskAtlasID: Number(item.maskMapAtlasIndex ?? 0) >>> 0,
              position: Array.from(position),
              rotation: Array.from(rotation),
              scaling: arrayValue(item.scaling, [1, 1, 1]),
              blinkData
            }));

            if (dna.UsingSof6())
            {
              if (item.lights.length) usesLightParameters = true;
              for (const light of item.lights)
              {
                const maxScale = Math.max(...arrayValue(item.scaling, [1, 1, 1]));
                const lightRotation = quat.normalize(
                  quat.create(),
                  quat.multiply(
                    quat.create(),
                    rotation,
                    arrayValue(light.rotation, [0, 0, 0, 1])
                  )
                );
                const lightPosition = vec3.transformQuat(
                  vec3.create(),
                  arrayValue(light.translation, [0, 0, 0]),
                  rotation
                );
                vec3.add(lightPosition, lightPosition, position);
                lights.push(document.AddNode("EvePlaneLight", {
                  lightData: {
                    position: Array.from(lightPosition),
                    rotation: Array.from(lightRotation),
                    color: saturateColor(color, light.saturation),
                    radius: Number(light.outerScaleMultiplier ?? 2) * maxScale,
                    innerRadius: Number(light.innerScaleMultiplier ?? 1) * maxScale,
                    brightness: Number(light.intensity ?? 1),
                    noiseAmplitude: Number(light.noiseAmplitude ?? 0),
                    noiseFrequency: Number(light.noiseFrequency ?? 1),
                    noiseOctaves: Number(light.noiseOctaves ?? 1),
                    boneIndex: Number(item.boneIndex ?? -1),
                    flags: 1,
                    startTime: this.buildTime,
                    castsShadows: 0,
                    isVolumetric: false
                  },
                  saturation: Number(light.saturation ?? 1),
                  index,
                  lightProfilePath: String(light.lightProfilePath ?? ""),
                  fadeType: Number(item.blinkMode ?? 0),
                  blinkPhase: Number(item.phase ?? 0),
                  blinkRate: Number(item.rate ?? 1)
                }));
              }
              index++;
            }
          }
        }
        rootFields.attachments.push(document.AddNode("EvePlaneSet", {
          effect,
          lights,
          pickBufferID,
          planes,
          skinned,
          imageMapParameter: usesLightParameters ? imageMap : null,
          layerMap1Parameter: usesLightParameters ? layerMap1 : null,
          layerMap2Parameter: usesLightParameters ? layerMap2 : null,
          maskMapParameter: usesLightParameters ? maskMap : null
        }));
      }
      addOffset(hullOffset, dna.GetHullNextSubsystemOffset(hullIndex));
    }
  }

  /** Emits Carbon sprite-line geometry and authored SOF6 per-sprite lights. */
  @carbon.method
  @impl.adapted
  SetupSpriteLineSets(document, rootFields, dna, offsets = [identityMatrix()], isInstancedPlacement = false, sharedEffect = { ref: null })
  {
    const hullOffset = [0, 0, 0];
    for (let hullIndex = 0; hullIndex < dna.GetMultiHullCount(); hullIndex++)
    {
      for (const set of dna.GetHullSpriteLineSets(hullIndex))
      {
        if (!dna.IsInVisibilityData(set.visibilityGroup)) continue;
        if (!sharedEffect.ref)
        {
          sharedEffect.ref = document.AddNode("Tr2Effect", {
            effectFilePath: "res:/graphics/effect/managed/space/spaceobject/fx/blinkinglightspool.fx",
            constParameters: [],
            parameters: [],
            resources: []
          });
        }

        const spriteLines = [];
        const lights = [];
        let index = 0;
        for (const offset of offsets)
        {
          for (const item of set.items)
          {
            const sourceColor = dna.GetColorSet()[item.colorType];
            if (!sourceColor) continue;
            let color = multiplyColor(sourceColor, item.intensity);
            if (dna.UsingSof6()) color = saturateColor(color, item.saturation);

            const transform = mat4.fromRotationTranslationScale(
              mat4.create(),
              arrayValue(item.rotation, [0, 0, 0, 1]),
              [
                Number(item.position?.[0] ?? 0) + hullOffset[0],
                Number(item.position?.[1] ?? 0) + hullOffset[1],
                Number(item.position?.[2] ?? 0) + hullOffset[2]
              ],
              [1, 1, 1]
            );
            mat4.multiply(transform, arrayValue(offset, identityMatrix()), transform);
            const position = vec3.create();
            const rotation = quat.create();
            const ignoredScale = vec3.create();
            decomposeCarbonMatrix(transform, rotation, position, ignoredScale);
            const line = {
              blinkPhase: Number(item.blinkPhase ?? 0),
              blinkPhaseShift: Number(item.blinkPhaseShift ?? 0),
              blinkRate: Number(item.blinkRate ?? 0.1),
              boneIndex: Number(item.boneIndex ?? 0),
              color,
              falloff: Number(item.falloff ?? 0),
              isCircle: item.isCircle === true,
              maxScale: Number(item.maxScale ?? 10),
              minScale: Number(item.minScale ?? 1),
              position: Array.from(position),
              rotation: Array.from(rotation),
              scaling: arrayValue(item.scaling, [1, 1, 1]),
              spacing: Number(item.spacing ?? 1)
            };
            spriteLines.push(document.AddNode("EveSpriteLineSetItem", line));

            if (dna.UsingSof6())
            {
              if (item.light)
              {
                const lightColor = saturateColor(color, item.light.saturation);
                let lightRotation = arrayValue(item.light.rotation, [0, 0, 0, 1]);
                const positions = getSpriteLinePositions(line);
                for (let spriteIndex = 0; spriteIndex < positions.length; spriteIndex++)
                {
                  lightRotation = Array.from(quat.normalize(
                    quat.create(),
                    quat.multiply(quat.create(), line.rotation, lightRotation)
                  ));
                  lights.push(document.AddNode("EveSpriteLight", {
                    lightData: {
                      position: [
                        Number(item.light.translation?.[0] ?? 0) + positions[spriteIndex][0] + line.position[0],
                        Number(item.light.translation?.[1] ?? 0) + positions[spriteIndex][1] + line.position[1],
                        Number(item.light.translation?.[2] ?? 0) + positions[spriteIndex][2] + line.position[2]
                      ],
                      rotation: lightRotation,
                      color: lightColor,
                      radius: Number(item.light.outerScaleMultiplier ?? 2),
                      innerRadius: Number(item.light.innerScaleMultiplier ?? 1),
                      brightness: Number(item.light.intensity ?? 1),
                      noiseAmplitude: Number(item.light.noiseAmplitude ?? 0),
                      noiseFrequency: Number(item.light.noiseFrequency ?? 1),
                      noiseOctaves: Number(item.light.noiseOctaves ?? 1),
                      boneIndex: Number(item.boneIndex ?? 0),
                      flags: 1,
                      startTime: this.buildTime,
                      castsShadows: 0,
                      isVolumetric: false
                    },
                    blinkPhase: Number(item.blinkPhase ?? 0) + Number(item.blinkPhaseShift ?? 0) * spriteIndex,
                    blinkRate: Number(item.blinkRate ?? 0.1),
                    minScale: Number(item.minScale ?? 1),
                    maxScale: Number(item.maxScale ?? 10),
                    index,
                    lightProfilePath: String(item.light.lightProfilePath ?? "")
                  }));
                }
              }
              index++;
            }
          }
        }
        rootFields.attachments.push(document.AddNode("EveSpriteLineSet", {
          effect: sharedEffect.ref,
          lights,
          skinned: set.skinned === true && !isInstancedPlacement,
          spriteLines
        }));
      }
      addOffset(hullOffset, dna.GetHullNextSubsystemOffset(hullIndex));
    }
  }

  /** Emits Carbon haze geometry and authored SOF6 point-light descriptors. */
  @carbon.method
  @impl.adapted
  SetupHazeSets(document, rootFields, dna, offsets = [identityMatrix()], isInstancedPlacement = false)
  {
    const hullOffset = [0, 0, 0];
    // Carbon keeps three haze effects on the EveSOF instance. The document
    // contract shares by path only inside this build, matching its identity
    // boundary while the effects remain immutable.
    const effects = new Map();
    const getEffect = (path) =>
    {
      if (!path) return null;
      if (!effects.has(path))
      {
        effects.set(path, document.AddNode("Tr2Effect", {
          effectFilePath: path,
          constParameters: [],
          parameters: [],
          resources: []
        }));
      }
      return effects.get(path);
    };

    for (let hullIndex = 0; hullIndex < dna.GetMultiHullCount(); hullIndex++)
    {
      for (const set of dna.GetHullHazeSets(hullIndex))
      {
        if (!dna.IsInVisibilityData(set.visibilityGroup)) continue;
        let effectPath = "";
        if (set.hazeType === EveSOFDataHullHazeSet.HazeType.TYPE_SPHERICAL)
        {
          effectPath = set.skinned === true && !isInstancedPlacement
            ? "res:/graphics/effect/managed/space/spaceobject/fx/skinned_hazespherical.fx"
            : "res:/graphics/effect/managed/space/spaceobject/fx/hazespherical.fx";
        }
        else if (set.hazeType === EveSOFDataHullHazeSet.HazeType.TYPE_HALFSPHERICAL)
        {
          effectPath = "res:/graphics/effect/managed/space/spaceobject/fx/hazehalfspherical.fx";
        }

        const hazes = [];
        const lights = [];
        let index = 0;
        for (const offset of offsets)
        {
          for (const item of set.items)
          {
            const sourceColor = dna.GetColorSet()[item.colorType];
            if (!sourceColor) continue;
            let color = multiplyColor(sourceColor, item.hazeBrightness);
            const transform = mat4.fromRotationTranslationScale(
              mat4.create(),
              arrayValue(item.rotation, [0, 0, 0, 1]),
              [
                Number(item.position?.[0] ?? 0) + hullOffset[0],
                Number(item.position?.[1] ?? 0) + hullOffset[1],
                Number(item.position?.[2] ?? 0) + hullOffset[2]
              ],
              [1, 1, 1]
            );
            mat4.multiply(transform, arrayValue(offset, identityMatrix()), transform);
            const position = vec3.create();
            const rotation = quat.create();
            const ignoredScale = vec3.create();
            decomposeCarbonMatrix(transform, rotation, position, ignoredScale);
            if (dna.UsingSof6()) color = saturateColor(color, item.saturation);

            hazes.push(document.AddNode("EveHazeSetItem", {
              color,
              rotation: Array.from(rotation),
              scaling: arrayValue(item.scaling, [1, 1, 1]),
              boneIndex: Number(item.boneIndex ?? -1),
              position: Array.from(position),
              hazeData: [
                Number(item.hazeFalloff ?? 6),
                Number(item.sourceSize ?? 0.2),
                Number(item.sourceBrightness ?? 2),
                item.boosterGainInfluence === true ? 1 : 0
              ]
            }));

            if (dna.UsingSof6())
            {
              const scaling = arrayValue(item.scaling, [1, 1, 1]);
              const maxScale = Math.max(scaling[0], scaling[1], scaling[2]);
              for (const light of item.lights)
              {
                const lightPosition = vec3.transformQuat(
                  vec3.create(),
                  arrayValue(light.translation, [0, 0, 0]),
                  rotation
                );
                vec3.add(lightPosition, lightPosition, position);
                const lightRotation = quat.normalize(
                  quat.create(),
                  quat.multiply(
                    quat.create(),
                    rotation,
                    arrayValue(light.rotation, [0, 0, 0, 1])
                  )
                );
                lights.push(document.AddNode("EveHazeSetLight", {
                  lightData: {
                    position: Array.from(lightPosition),
                    rotation: Array.from(lightRotation),
                    color: saturateColor(sourceColor, light.saturation),
                    radius: Number(light.outerScaleMultiplier ?? 2) * maxScale,
                    innerRadius: Number(light.innerScaleMultiplier ?? 1) * maxScale,
                    brightness: Number(light.intensity ?? 1),
                    noiseAmplitude: Number(light.noiseAmplitude ?? 0),
                    noiseFrequency: Number(light.noiseFrequency ?? 1),
                    noiseOctaves: Number(light.noiseOctaves ?? 1),
                    boneIndex: Number(item.boneIndex ?? -1),
                    flags: 1,
                    startTime: this.buildTime,
                    castsShadows: 0,
                    isVolumetric: false
                  },
                  index,
                  boosterGainInfluence: item.boosterGainInfluence === true,
                  boneMatrix: identityMatrix(),
                  lightProfilePath: String(light.lightProfilePath ?? "")
                }));
              }
            }
            index++;
          }
        }

        rootFields.attachments.push(document.AddNode("EveHazeSet", {
          effect: getEffect(effectPath),
          display: true,
          hazes,
          lights
        }));
      }
      addOffset(hullOffset, dna.GetHullNextSubsystemOffset(hullIndex));
    }
  }

  /** Emits Carbon's legacy per-item-visible banner groups. */
  @carbon.method
  @impl.adapted
  SetupBanners(document, rootFields, dna, offsets = [identityMatrix()])
  {
    const hullOffset = [0, 0, 0];
    for (let hullIndex = 0; hullIndex < dna.GetMultiHullCount(); hullIndex++)
    {
      for (const set of dna.GetHullBanners(hullIndex))
      {
        const banners = [];
        const lights = [];
        let index = 0;
        for (const value of set.items)
        {
          if (!dna.IsInVisibilityData(value.visibilityGroup)) continue;
          for (const offset of offsets)
          {
            const item = addBannerItem(document, value.item, hullOffset, offset);
            banners.push(item.ref);
            const light = value.bannerLight;
            const scaling = arrayValue(value.item.scaling, [1, 1, 1]);
            const radius = Number(light.radiusMultiplier ?? 1) * Math.max(scaling[0], scaling[1], scaling[2]);
            lights.push(document.AddNode("EveBannerLight", {
              lightData: {
                position: item.position,
                rotation: [0, 0, 0, 1],
                color: [0, 0, 0, 0],
                radius,
                innerRadius: radius * Number(light.innerRadiusMultiplier ?? 0.3),
                brightness: Number(light.brightness ?? 1),
                noiseAmplitude: Number(light.noiseAmplitude ?? 0),
                noiseFrequency: Number(light.noiseFrequency ?? 1),
                noiseOctaves: Number(light.noiseOctaves ?? 1),
                boneIndex: -1,
                flags: 1,
                startTime: this.buildTime,
                castsShadows: 0,
                isVolumetric: false
              },
              saturation: Number(light.saturation ?? 1),
              index: index++,
              boneMatrix: identityMatrix(),
              lightProfilePath: ""
            }));
          }
        }
        if (banners.length)
        {
          addBannerSet(document, rootFields, dna, Number(set.usage), banners, lights, EveSOFDataHullBanner.Usage._USAGE_COUNT);
        }
      }
      addOffset(hullOffset, dna.GetHullNextSubsystemOffset(hullIndex));
    }
  }

  /** Emits Carbon's SOF6 visibility-grouped banner sets. */
  @carbon.method
  @impl.adapted
  SetupBannerSets(document, rootFields, dna, offsets = [identityMatrix()])
  {
    const hullOffset = [0, 0, 0];
    for (let hullIndex = 0; hullIndex < dna.GetMultiHullCount(); hullIndex++)
    {
      for (const set of dna.GetHullBannerSets(hullIndex))
      {
        if (!dna.IsInVisibilityData(set.visibilityGroup) || set.bannerTypes.size === 0) continue;
        for (const [usage, values] of set.bannerTypes)
        {
          const banners = [];
          const lights = [];
          let index = 0;
          for (const value of values)
          {
            for (const offset of offsets)
            {
              const item = addBannerItem(document, value.item, hullOffset, offset);
              banners.push(item.ref);
              const light = value.light;
              if (light)
              {
                const scaling = arrayValue(value.item.scaling, [1, 1, 1]);
                const maxScale = Math.max(scaling[0], scaling[1], scaling[2]);
                const lightPosition = vec3.transformQuat(
                  vec3.create(),
                  arrayValue(light.translation, [0, 0, 0]),
                  item.rotation
                );
                vec3.add(lightPosition, lightPosition, item.position);
                const lightRotation = quat.normalize(
                  quat.create(),
                  quat.multiply(
                    quat.create(),
                    item.rotation,
                    arrayValue(light.rotation, [0, 0, 0, 1])
                  )
                );
                lights.push(document.AddNode("EveBannerLight", {
                  lightData: {
                    position: Array.from(lightPosition),
                    rotation: Array.from(lightRotation),
                    color: [0, 0, 0, 0],
                    radius: Number(light.outerScaleMultiplier ?? 2) * maxScale,
                    innerRadius: Number(light.innerScaleMultiplier ?? 1) * maxScale,
                    brightness: Number(light.intensity ?? 1),
                    noiseAmplitude: Number(light.noiseAmplitude ?? 0),
                    noiseFrequency: Number(light.noiseFrequency ?? 1),
                    noiseOctaves: Number(light.noiseOctaves ?? 1),
                    boneIndex: -1,
                    flags: 1,
                    startTime: this.buildTime,
                    castsShadows: 0,
                    isVolumetric: false
                  },
                  saturation: Number(light.saturation ?? 1),
                  index,
                  boneMatrix: identityMatrix(),
                  lightProfilePath: String(light.lightProfilePath ?? "")
                }));
              }
            }
            index++;
          }
          if (banners.length)
          {
            addBannerSet(document, rootFields, dna, Number(usage), banners, lights, EveSOFDataHullBannerSetItem.Usage._USAGE_COUNT);
          }
        }
      }
      addOffset(hullOffset, dna.GetHullNextSubsystemOffset(hullIndex));
    }
  }

  /** Emits Carbon hull lights with faction visibility, color, and multi-hull transforms. */
  @carbon.method
  @impl.adapted
  SetupLights(document, rootFields, dna, offsets = [identityMatrix()])
  {
    const hullOffset = [0, 0, 0];
    for (let hullIndex = 0; hullIndex < dna.GetMultiHullCount(); hullIndex++)
    {
      for (const lightSet of dna.GetHullLightSets(hullIndex))
      {
        if (!dna.IsInVisibilityData(lightSet.visibilityGroup)) continue;
        for (const item of lightSet.items)
        {
          const lightKind = getLightKind(item.type);
          const color = dna.GetColorSet()[item.lightColor];
          if (!lightKind || !color) continue;

          for (const offset of offsets)
          {
            const transform = mat4.fromRotationTranslationScale(
              mat4.create(),
              arrayValue(item.rotation, [0, 0, 0, 1]),
              [
                Number(item.position?.[0] ?? 0) + hullOffset[0],
                Number(item.position?.[1] ?? 0) + hullOffset[1],
                Number(item.position?.[2] ?? 0) + hullOffset[2]
              ],
              [1, 1, 1]
            );
            mat4.multiply(transform, arrayValue(offset, identityMatrix()), transform);
            const position = vec3.create();
            const rotation = quat.create();
            const ignoredScale = vec3.create();
            decomposeCarbonMatrix(transform, rotation, position, ignoredScale);

            // Flattened emission (2026-07-23 LightData flatten decision): the
            // Tr2 light classes persist the Blue-mapped LightData members as
            // flat fields, so hull lights emit Carbon's flat Blue shape. The
            // packed-set light items above still emit nested lightData bags
            // until their classes migrate. startTime carries the injected
            // buildTime, matching Carbon's GetCurrentTime() stamp at build.
            const lightFields = {
              startTime: this.buildTime,
              flags: Number(item.flags ?? 1),
              position: Array.from(position),
              rotation: Array.from(rotation),
              boneIndex: Number(item.boneIndex ?? -1),
              radius: Number(item.radius ?? 0),
              innerRadius: Number(item.innerRadius ?? 0),
              color: Array.from(color),
              brightness: Number(item.brightness ?? 0),
              noiseAmplitude: Number(item.noiseAmplitude ?? 0),
              noiseFrequency: Number(item.noiseFrequency ?? 1),
              noiseOctaves: Number(item.noiseOctaves ?? 1),
              castsShadows: 0,
              isVolumetric: false
            };
            if (lightKind.className === "Tr2SpotLight")
            {
              lightFields.innerAngle = Number(item.innerAngle ?? 0);
              lightFields.outerAngle = Number(item.outerAngle ?? 0);
            }
            if (lightKind.className === "Tr2TexturedPointLight")
            {
              lightFields.texturePath = String(item.texturePath ?? "");
            }
            rootFields.lights.push(document.AddNode(lightKind.className, {
              ...lightFields,
              type: lightKind.type,
              ...(lightKind.isDynamic ? { isDynamic: true } : {})
            }));
          }
        }
      }
      addOffset(hullOffset, dna.GetHullNextSubsystemOffset(hullIndex));
    }
  }

  /** Adds turret and last-hull audio locators with Carbon multi-hull offsets. */
  @carbon.method
  @impl.implemented
  SetupLocators(document, rootFields, dna)
  {
    const hullOffset = [0, 0, 0];
    for (let hullIndex = 0; hullIndex < dna.GetMultiHullCount(); hullIndex++)
    {
      for (const locator of dna.GetHullTurretLocators(hullIndex))
      {
        const transform = arrayValue(locator.transform, identityMatrix());
        transform[12] += hullOffset[0];
        transform[13] += hullOffset[1];
        transform[14] += hullOffset[2];
        rootFields.locators.push(document.AddNode("EveLocator2", {
          name: locator.name,
          transform
        }));
      }
      const audioPosition = dna.GetHullAudioPosition(hullIndex);
      if (audioPosition)
      {
        const transform = identityMatrix();
        transform[12] = Number(audioPosition[0] ?? 0) + hullOffset[0];
        transform[13] = Number(audioPosition[1] ?? 0) + hullOffset[1];
        transform[14] = Number(audioPosition[2] ?? 0) + hullOffset[2];
        rootFields.locators.push(document.AddNode("EveLocator2", {
          name: "locator_audio_booster",
          transform
        }));
      }
      addOffset(hullOffset, dna.GetHullNextSubsystemOffset(hullIndex));
    }
  }

  /** Merges same-name locator sets across all hulls in Carbon map order. */
  @carbon.method
  @impl.implemented
  SetupLocatorSets(document, rootFields, dna, offsets = [identityMatrix()])
  {
    const transforms = Array.isArray(offsets) && offsets.length !== 0
      ? offsets
      : [identityMatrix()];
    const hullOffset = [0, 0, 0];
    for (let hullIndex = 0; hullIndex < dna.GetMultiHullCount(); hullIndex++)
    {
      for (const name of dna.GetHullLocatorSetNames(hullIndex))
      {
        const locators = dna.GetHullLocators(name, hullIndex) ?? [];
        const locatorRefs = [];
        for (const offset of transforms)
        {
          for (const locator of locators)
          {
            const transform = mat4.fromRotationTranslationScale(
              mat4.create(),
              arrayValue(locator.rotation, [0, 0, 0, 1]),
              [
                Number(locator.position?.[0] ?? 0) + hullOffset[0],
                Number(locator.position?.[1] ?? 0) + hullOffset[1],
                Number(locator.position?.[2] ?? 0) + hullOffset[2]
              ],
              [1, 1, 1]
            );
            const composed = mat4.multiply(
              mat4.create(),
              arrayValue(offset, identityMatrix()),
              transform
            );
            const position = vec3.create();
            const rotation = quat.create();
            const ignoredScale = vec3.create();
            decomposeCarbonMatrix(composed, rotation, position, ignoredScale);
            locatorRefs.push(document.AddNode("Locator", {
              position: Array.from(position),
              direction: Array.from(rotation),
              scale: arrayValue(locator.scaling, [1, 1, 1]),
              boneIndex: Number(locator.boneIndex ?? -1)
            }));
          }
        }
        mergeDocumentLocatorSet(document, rootFields, name, locatorRefs);
      }
      addOffset(hullOffset, dna.GetHullNextSubsystemOffset(hullIndex));
    }
  }

  @carbon.method
  @impl.implemented
  SetupTurretMaterialFromFaction(turretSet, factionName)
  {
    const factionData = this.dataMgr.GetFactionData(factionName);
    if (!factionData) return;
    const genericData = this.dataMgr.GetGenericData();
    updateTurretEffect(turretSet, parameterName => findTurretFactionParameter(
      this.dataMgr,
      genericData,
      factionData,
      parameterName
    ));
  }

  @carbon.method
  @impl.implemented
  SetupTurretMaterialFromDNA(turretSet, dnaString)
  {
    const dna = this.CreateDna(dnaString);
    if (!dna?.IsValid()) return;
    updateTurretEffect(turretSet, parameterName => dna.GetFactionTurretParameters(parameterName));
  }

}

function updateTurretEffect(turretSet, resolveParameter)
{
  const effect = turretSet?.GetShader?.() ?? turretSet?.turretEffect ?? null;
  if (!effect) return;

  const constParameters = Array.isArray(effect.constParameters) ? effect.constParameters : [];
  if (constParameters.length)
  {
    effect.StartUpdate?.();
    try
    {
      for (const parameter of constParameters)
      {
        const value = resolveParameter(parameter?.name ?? "");
        if (value) copyTurretParameterValue(parameter, value);
      }
    }
    finally
    {
      effect.EndUpdate?.();
    }
    return;
  }

  for (const parameter of Array.isArray(effect.parameters) ? effect.parameters : [])
  {
    if (typeof parameter?.SetValue !== "function") continue;
    const parameterName = parameter.GetParameterName?.() ?? parameter.name ?? "";
    const value = resolveParameter(parameterName);
    if (value) parameter.SetValue(value);
  }
}

function findTurretFactionParameter(dataMgr, genericData, factionData, parameterName)
{
  const prefixes = genericData?.materialPrefixes ?? [];
  const info = new EveSOFUtilsParameterName(prefixes, parameterName);
  if (info.IsMaterialIdxValid())
  {
    const materialIndex = info.GetMaterialIdx();
    const usageIndex = Number(
      factionData.materialUsageList?.[materialIndex] ?? materialIndex
    );
    info.ChangeMaterialIdx(genericData, usageIndex);
  }
  return findTurretAreaParameter(
    dataMgr,
    factionData.colorData?.colors ?? [],
    factionData.areaMaterials,
    EveSOFDataArea.AreaType.TYPE_PRIMARY,
    info
  );
}

function findTurretAreaParameter(dataMgr, colors, areaMaterials, areaType, info)
{
  if (!areaMaterials) return null;
  if (info.IsMaterialIdxValid())
  {
    const materialName = areaMaterials.materialNames?.get(
      `${areaType}:${info.GetMaterialIdx()}`
    );
    const value = dataMgr.GetMaterialData(materialName)?.parameters?.get(info.GetShortName());
    if (value) return value;
  }
  else
  {
    const colorType = areaMaterials.glowColor?.get(`${areaType}:${info.GetFullName()}`);
    if (colorType !== undefined) return colors[colorType] ?? null;
  }
  return null;
}

function copyTurretParameterValue(parameter, value)
{
  if (parameter.value && typeof parameter.value.length === "number")
  {
    for (let index = 0; index < Math.min(4, parameter.value.length, value.length); index++)
    {
      parameter.value[index] = Number(value[index]);
    }
  }
  else
  {
    parameter.value = Array.from(value);
  }
}

function arrayValue(value, fallback)
{
  return value ? Array.from(value) : fallback.slice();
}

function composeChildPlacement(source, offset)
{
  const transform = mat4.fromRotationTranslationScale(
    mat4.create(),
    arrayValue(source.rotation, [0, 0, 0, 1]),
    arrayValue(source.translation, [0, 0, 0]),
    [1, 1, 1]
  );
  mat4.multiply(transform, arrayValue(offset, identityMatrix()), transform);
  const position = vec3.create();
  const rotation = quat.create();
  const ignoredScale = vec3.create();
  decomposeCarbonMatrix(transform, rotation, position, ignoredScale);
  return {
    translation: Array.from(position),
    rotation: Array.from(rotation),
    scaling: arrayValue(source.scaling, [1, 1, 1]),
    lowestLodVisible: Number(source.lowestLodVisible ?? 0),
    origin: 1
  };
}

function createInheritProperties(document, dna)
{
  const colorSet = dna.GetColorSet();
  const fields = {};
  for (let index = 0; index < INHERIT_COLOR_PROPERTIES.length; index++)
  {
    fields[INHERIT_COLOR_PROPERTIES[index]] = arrayValue(colorSet?.[index], [0, 0, 0, 0]);
  }
  return document.AddNode("EveChildInheritProperties", fields);
}

function collectDynamicEmitterRefs(document, rootRef, target)
{
  const result = [];
  const seen = new Set();
  const addEmitters = node =>
  {
    for (const ref of Array.isArray(node?.fields?.particleEmitters) ? node.fields.particleEmitters : [])
    {
      const emitter = document.GetNode(Number(ref?.$ref));
      if (emitter?.kind === "Tr2DynamicEmitter" && !seen.has(emitter.id))
      {
        seen.add(emitter.id);
        result.push({ $ref: emitter.id });
      }
    }
  };
  const visitTransform = ref =>
  {
    const node = document.GetNode(Number(ref?.$ref));
    if (!node || seen.has(`transform:${node.id}`)) return;
    seen.add(`transform:${node.id}`);
    addEmitters(node);
    for (const childRef of Array.isArray(node.fields?.children) ? node.fields.children : [])
    {
      const child = document.GetNode(Number(childRef?.$ref));
      if (child?.kind === "EveTransform") visitTransform(childRef);
    }
  };
  const visitEffectChild = ref =>
  {
    const node = document.GetNode(Number(ref?.$ref));
    if (!node || seen.has(`effect:${node.id}`)) return;
    seen.add(`effect:${node.id}`);
    if (node.kind === "EveChildParticleSystem")
    {
      addEmitters(node);
    }
    else if (node.kind === "EveChildContainer")
    {
      for (const childRef of Array.isArray(node.fields?.objects) ? node.fields.objects : [])
      {
        visitEffectChild(childRef);
      }
    }
  };
  if (target === "children") visitTransform(rootRef);
  else visitEffectChild(rootRef);
  return result;
}

function scalarKey(time, value)
{
  return {
    time: Number(time),
    value: Number(value),
    leftTangent: 0,
    rightTangent: 0,
    id: 0,
    interpolation: 1,
    tangentType: 1
  };
}

function quaternionKey(time, value)
{
  return {
    time: Number(time),
    value: arrayValue(value, [0, 0, 0, 1]),
    id: 0,
    interpolation: 1
  };
}

function identityMatrix()
{
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
}

function decomposeCarbonMatrix(matrix, rotation, translation, scaling)
{
  const scaleX = Math.hypot(matrix[0], matrix[1], matrix[2]);
  const scaleY = Math.hypot(matrix[4], matrix[5], matrix[6]);
  const scaleZ = Math.hypot(matrix[8], matrix[9], matrix[10]);
  scaling[0] = scaleX;
  scaling[1] = scaleY;
  scaling[2] = scaleZ;
  translation[0] = matrix[12];
  translation[1] = matrix[13];
  translation[2] = matrix[14];

  if (scaleX === 0 || scaleY === 0 || scaleZ === 0)
  {
    rotation[0] = 0;
    rotation[1] = 0;
    rotation[2] = 0;
    rotation[3] = 1;
    return matrix;
  }

  const normalized = mat4.create();
  normalized[0] = matrix[0] / scaleX;
  normalized[1] = matrix[1] / scaleX;
  normalized[2] = matrix[2] / scaleX;
  normalized[4] = matrix[4] / scaleY;
  normalized[5] = matrix[5] / scaleY;
  normalized[6] = matrix[6] / scaleY;
  normalized[8] = matrix[8] / scaleZ;
  normalized[9] = matrix[9] / scaleZ;
  normalized[10] = matrix[10] / scaleZ;
  mat4.getRotation(rotation, normalized);
  return matrix;
}

function addOffset(target, value)
{
  if (!value) return;
  target[0] += Number(value[0] ?? 0);
  target[1] += Number(value[1] ?? 0);
  target[2] += Number(value[2] ?? 0);
}

function getLightKind(value)
{
  switch (Number(value))
  {
    case EveSOFDataHullLightSetItem.LightType.POINT_LIGHT:
      return { className: "Tr2PointLight", type: 1, isDynamic: false };
    case EveSOFDataHullLightSetItem.LightType.TEXTURED_POINT_LIGHT:
      return { className: "Tr2TexturedPointLight", type: 1, isDynamic: true };
    case EveSOFDataHullLightSetItem.LightType.SPOT_LIGHT:
      return { className: "Tr2SpotLight", type: 2, isDynamic: false };
    default:
      return null;
  }
}

function saturateColor(value, saturation)
{
  const source = arrayValue(value, [0, 0, 0, 0]);
  if (Number(saturation) === 1) return source;
  const intensity = source[0] * 0.299 + source[1] * 0.587 + source[2] * 0.114;
  const factor = Math.max(0, Number(saturation));
  return [
    intensity + (source[0] - intensity) * factor,
    intensity + (source[1] - intensity) * factor,
    intensity + (source[2] - intensity) * factor,
    source[3]
  ];
}

function multiplyColor(value, multiplier)
{
  return arrayValue(value, [0, 0, 0, 0]).map(component => component * Number(multiplier ?? 0));
}

function modifyColor(value, saturation, brightness)
{
  const source = arrayValue(value, [0, 0, 0, 0]);
  const divisor = Math.max(source[0], source[1], source[2], 1);
  const red = source[0] / divisor;
  const green = source[1] / divisor;
  const blue = source[2] / divisor;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  let hue = 0;
  let hsvSaturation = 0;
  if (delta !== 0)
  {
    hsvSaturation = maximum !== 0 ? delta / maximum : 0;
    if (red === maximum) hue = (green - blue) / delta;
    else if (green === maximum) hue = 2 + (blue - red) / delta;
    else hue = 4 + (red - green) / delta;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  hsvSaturation *= Number(saturation);
  const hsvValue = maximum * Number(brightness);
  return [...hsvToRgb(hue, hsvSaturation, hsvValue), source[3]];
}

function hsvToRgb(hue, saturation, value)
{
  const nextSaturation = saturation === 0 ? 1e-9 : saturation;
  const sector = hue / 60;
  const index = Math.floor(sector);
  const fraction = sector - index;
  const p = value * (1 - nextSaturation);
  const q = value * (1 - nextSaturation * fraction);
  const t = value * (1 - nextSaturation * (1 - fraction));
  switch (index)
  {
    case 0: return [value, t, p];
    case 1: return [q, value, p];
    case 2: return [p, value, t];
    case 3: return [p, q, value];
    case 4: return [t, p, value];
    default: return [value, p, q];
  }
}

function getPlaneSetEffectPath(usage, skinned)
{
  switch (Number(usage))
  {
    case EveSOFDataHullPlaneSet.Usage.USAGE_STANDARD:
    case EveSOFDataHullPlaneSet.Usage.USAGE_HAZE:
      return skinned
        ? "res:/graphics/effect/managed/space/spaceobject/fx/skinned_planeglow.fx"
        : "res:/graphics/effect/managed/space/spaceobject/fx/planeglow.fx";
    case EveSOFDataHullPlaneSet.Usage.USAGE_SPACE_VIDEO:
    case EveSOFDataHullPlaneSet.Usage.USAGE_HANGAR_VIDEO:
      return skinned
        ? "res:/graphics/effect/managed/space/spaceobject/fx/skinned_planehologram.fx"
        : "res:/graphics/effect/managed/space/spaceobject/fx/planehologram.fx";
    default:
      return "";
  }
}

function getSpriteLinePositions(item)
{
  const result = [];
  const position = arrayValue(item.position, [0, 0, 0]);
  const rotation = arrayValue(item.rotation, [0, 0, 0, 1]);
  const scaling = arrayValue(item.scaling, [1, 1, 1]);
  if (item.isCircle)
  {
    const count = Math.max(0, Math.trunc(Number(item.spacing ?? 1)));
    for (let index = 0; index < count; index++)
    {
      const angle = index * Math.PI * 2 / Number(item.spacing);
      const point = vec3.transformQuat(
        vec3.create(),
        [scaling[0] * Math.sin(angle), 0, scaling[1] * Math.cos(angle)],
        rotation
      );
      vec3.add(point, point, position);
      result.push(Array.from(point));
    }
  }
  else
  {
    const count = Math.max(0, Math.trunc(Number(scaling[0] ?? 0)));
    const direction = vec3.transformQuat(vec3.create(), [1, 0, 0], rotation);
    const point = position.slice();
    for (let index = 0; index < count; index++)
    {
      result.push(point.slice());
      point[0] += Number(item.spacing ?? 1) * direction[0];
      point[1] += Number(item.spacing ?? 1) * direction[1];
      point[2] += Number(item.spacing ?? 1) * direction[2];
    }
  }
  return result;
}

function addBannerItem(document, source, hullOffset, offset)
{
  const transform = mat4.fromRotationTranslationScale(
    mat4.create(),
    arrayValue(source.rotation, [0, 0, 0, 1]),
    [
      Number(source.position?.[0] ?? 0) + hullOffset[0],
      Number(source.position?.[1] ?? 0) + hullOffset[1],
      Number(source.position?.[2] ?? 0) + hullOffset[2]
    ],
    [1, 1, 1]
  );
  mat4.multiply(transform, arrayValue(offset, identityMatrix()), transform);
  const position = vec3.create();
  const rotation = quat.create();
  const ignoredScale = vec3.create();
  decomposeCarbonMatrix(transform, rotation, position, ignoredScale);
  return {
    ref: document.AddNode("EveBannerItem", {
      bone: Number(source.bone ?? -1),
      position: Array.from(position),
      rotation: Array.from(rotation),
      scaling: arrayValue(source.scaling, [1, 1, 1]),
      angleX: Number(source.angleX ?? 0),
      angleY: Number(source.angleY ?? 0),
      reference: Number(source.reference ?? 0) | 0
    }),
    position: Array.from(position),
    rotation: Array.from(rotation)
  };
}

function addBannerSet(document, rootFields, dna, usage, banners, lights, usageCount)
{
  const shader = dna.GetGenericBannerShaderData() ?? {
    shader: "",
    defaultParameters: new Map(),
    defaultTextures: new Map()
  };
  const constParameters = sortedKeys(shader.defaultParameters).map(name => document.AddNode("Tr2ConstantEffectParameter", {
    name,
    value: arrayValue(shader.defaultParameters.get(name), [0, 0, 0, 0])
  }));
  const resources = sortedKeys(shader.defaultTextures).map(name => document.AddNode("TriTextureParameter", {
    name,
    resourcePath: String(shader.defaultTextures.get(name)?.resFilePath ?? "")
  }));
  const imageMap = document.AddNode("TriTextureParameter", {
    name: "ImageMap",
    resourcePath: ""
  });
  resources.push(imageMap);
  const effect = document.AddNode("Tr2Effect", {
    effectFilePath: String(shader.shader ?? ""),
    constParameters,
    parameters: [],
    resources
  });
  rootFields.attachments.push(document.AddNode("EveBannerSet", {
    banners,
    effect,
    isPickable: false,
    display: true,
    key: usage,
    lights,
    primaryTextureParameter: imageMap
  }));
  rootFields.externalParameters.push(document.AddNode("Tr2ExternalParameter", {
    name: usage >= 0 && usage < usageCount ? BANNER_EXTERNAL_PARAMETER_NAMES[usage] : "",
    destinationObject: imageMap,
    destinationAttribute: "resourcePath"
  }));
}

function buildMeshArea(document, dna, area, shaderData, batchType, meshIndexOffset, resolveTexturePath, alphaCutoutShadowsEnabled = false, emitArea = true)
{
  // FillMeshAreaVector's runtime state (EveSOF.cpp:576-592,668-672): opaque
  // areas cast shadows, decal areas follow the alpha-cutout setting, all other
  // batch types do not; depth generation comes from the generic shader data.
  let castsShadows = false;
  if (batchType === TriBatchType.TRIBATCHTYPE_OPAQUE) castsShadows = true;
  else if (batchType === TriBatchType.TRIBATCHTYPE_DECAL) castsShadows = alphaCutoutShadowsEnabled;
  const options = [];
  if (batchType === TriBatchType.TRIBATCHTYPE_DECAL)
  {
    options.push(document.AddNode("Tr2ShaderOption", {
      name: "SPACE_OBJECT_TRANSPARENCY",
      value: "SOT_CLIP"
    }));
  }
  else if (batchType === TriBatchType.TRIBATCHTYPE_TRANSPARENT)
  {
    options.push(document.AddNode("Tr2ShaderOption", {
      name: "SPACE_OBJECT_TRANSPARENCY",
      value: "SOT_TRANSPARENT"
    }));
  }
  else if (batchType === TriBatchType.TRIBATCHTYPE_OPAQUE)
  {
    options.push(document.AddNode("Tr2ShaderOption", {
      name: "SPACE_OBJECT_TRANSPARENCY",
      value: "SOT_OPAQUE"
    }));
  }

  const patternLayerCount = dna.GetPatternLayerCount();
  options.push(document.AddNode("Tr2ShaderOption", {
    name: "SPACE_OBJECT_PPT_ENABLED",
    value: patternLayerCount > 0 ? "SOPPT_ENABLED" : "SOPPT_DISABLED"
  }));

  const constParameters = [];
  const parameterNames = new Set();
  for (const name of shaderData.parameters)
  {
    const value = dna.GetMeshAreaParameter(area.areaType, name, area.parameters, area.blockedMaterials);
    if (value)
    {
      constParameters.push(document.AddNode("Tr2ConstantEffectParameter", {
        name,
        value: Array.from(value)
      }));
      parameterNames.add(name);
    }
  }
  for (const name of sortedKeys(shaderData.defaultParameters))
  {
    if (parameterNames.has(name)) continue;
    constParameters.push(document.AddNode("Tr2ConstantEffectParameter", {
      name,
      value: Array.from(shaderData.defaultParameters.get(name))
    }));
  }

  const resources = [];
  const resourceRefs = new Map();
  for (const name of sortedKeys(area.textures))
  {
    const ref = document.AddNode("TriTextureParameter", {
      name,
      resourcePath: resolveTexturePath(area.textures.get(name).resFilePath)
    });
    resourceRefs.set(name, ref);
    resources.push(ref);
  }
  const samplerOverrides = [];
  const samplerNames = new Set();
  const pattern = patternLayerCount > 0 ? dna.GetPatternApplicationData() : null;
  for (let layerIndex = 0; layerIndex < patternLayerCount; layerIndex++)
  {
    const layer = dna.GetPatternLayerData(pattern, layerIndex);
    if (!dna.IsPatternLayerApplicableToArea(layer, area.areaType)) continue;
    if (!resourceRefs.has(layer.textureName))
    {
      const ref = document.AddNode("TriTextureParameter", {
        name: layer.textureName,
        resourcePath: layer.textureResFilePath
      });
      resourceRefs.set(layer.textureName, ref);
      resources.push(ref);
    }
    const samplerName = `${layer.textureName}Sampler`;
    if (!samplerNames.has(samplerName))
    {
      samplerNames.add(samplerName);
      samplerOverrides.push(document.AddNode("Tr2SamplerOverride", {
        name: samplerName,
        addressU: layer.projectionAddressModeU,
        addressV: layer.projectionAddressModeV,
        addressW: 1,
        filter: 3,
        mipFilter: 2,
        lodBias: 0,
        maxMipLevel: 0,
        maxAnisotropy: 4
      }));
    }
  }
  for (const name of sortedKeys(shaderData.defaultTextures))
  {
    if (resourceRefs.has(name)) continue;
    const ref = document.AddNode("TriTextureParameter", {
      name,
      resourcePath: shaderData.defaultTextures.get(name).resFilePath
    });
    resourceRefs.set(name, ref);
    resources.push(ref);
  }

  const effect = document.AddNode("Tr2Effect", {
    name: area.name,
    effectFilePath: dna.GetCompleteShaderPath(area.shader),
    options,
    constParameters,
    parameters: [],
    resources,
    samplerOverrides
  });
  const fields = {
    name: area.name,
    index: area.index + meshIndexOffset,
    count: area.count,
    reversed: false,
    useSHLighting: false,
    castsShadows,
    generateDepthArea: Boolean(shaderData.doGenerateDepthArea),
    // Carbon limits distortion areas to high LOD after fill (EveSOF.cpp:2149-2153).
    minLod: batchType === TriBatchType.TRIBATCHTYPE_DISTORTION ? TR2_LOD_HIGH : -1,
    effect
  };
  return {
    ref: emitArea ? document.AddNode("Tr2MeshArea", fields) : null,
    fields,
    effect,
    generateDepthArea: shaderData.doGenerateDepthArea,
    resourceRefs
  };
}

function createLayoutContainerFields(name)
{
  return {
    name: String(name ?? ""),
    objects: [],
    curveSets: [],
    attachments: [],
    observers: [],
    lights: [],
    controllers: []
  };
}

function layoutContainerIsEmpty(fields)
{
  return ["objects", "curveSets", "attachments", "observers", "lights", "controllers"]
    .every(name => !Array.isArray(fields[name]) || fields[name].length === 0);
}

function updateLayoutBounds(rootFields, dna, occurrences)
{
  let sphere = [
    ...arrayValue(rootFields.boundingSphereCenter, [0, 0, 0]),
    Number(rootFields.boundingSphereRadius ?? -1)
  ];
  let ellipsoidBounds = ellipsoidToBounds(
    rootFields.shapeEllipsoidCenter,
    rootFields.shapeEllipsoidRadius
  );
  const sourceSphere = dna.GetHullBoundingSphere();
  const sourceEllipsoid = dna.GetHullShapeEllipsoid();
  for (const occurrence of occurrences)
  {
    const transform = arrayValue(occurrence.transform, identityMatrix());
    const transformedSphere = transformLayoutSphere(sourceSphere, transform);
    if (occurrence.extendsBoundingSphere)
    {
      sphere = includeLayoutSphere(sphere, transformedSphere);
    }
    if (occurrence.extendsShieldEllipsoid)
    {
      const bounds = transformLayoutEllipsoid(sourceEllipsoid, transformedSphere, transform);
      ellipsoidBounds = includeBounds(ellipsoidBounds, bounds);
    }
  }
  rootFields.boundingSphereCenter = sphere.slice(0, 3);
  rootFields.boundingSphereRadius = sphere[3];
  if (ellipsoidBounds)
  {
    rootFields.shapeEllipsoidCenter = ellipsoidBounds.min.map((value, index) => (
      (value + ellipsoidBounds.max[index]) * 0.5
    ));
    rootFields.shapeEllipsoidRadius = ellipsoidBounds.min.map((value, index) => (
      (ellipsoidBounds.max[index] - value) * 0.5
    ));
  }
}

function transformLayoutSphere(source, transform)
{
  if (!source || Number(source[3]) < 0) return null;
  const center = vec3.transformMat4(vec3.create(), source, transform);
  const scale = mat4.getScaling(vec3.create(), transform);
  const maxScale = Math.max(Math.abs(scale[0]), Math.abs(scale[1]), Math.abs(scale[2]));
  return [center[0], center[1], center[2], Number(source[3]) * maxScale];
}

function includeLayoutSphere(current, next)
{
  if (!next || next[3] < 0) return current;
  if (!current || current[3] < 0) return next.slice();
  const dx = next[0] - current[0];
  const dy = next[1] - current[1];
  const dz = next[2] - current[2];
  const distance = Math.hypot(dx, dy, dz);
  if (current[3] >= distance + next[3]) return current;
  if (next[3] >= distance + current[3]) return next.slice();
  const radius = (distance + current[3] + next[3]) * 0.5;
  if (distance === 0) return [current[0], current[1], current[2], radius];
  const factor = (radius - current[3]) / distance;
  return [
    current[0] + dx * factor,
    current[1] + dy * factor,
    current[2] + dz * factor,
    radius
  ];
}

function ellipsoidToBounds(centerValue, radiusValue)
{
  const center = arrayValue(centerValue, [0, 0, 0]);
  const radius = arrayValue(radiusValue, [-1, -1, -1]);
  if (radius.some(value => value < 0)) return null;
  return {
    min: center.map((value, index) => value - radius[index]),
    max: center.map((value, index) => value + radius[index])
  };
}

function transformLayoutEllipsoid(source, fallbackSphere, transform)
{
  const sourceBounds = ellipsoidToBounds(source?.center, source?.radius);
  if (!sourceBounds)
  {
    if (!fallbackSphere) return null;
    return {
      min: fallbackSphere.slice(0, 3).map(value => value - fallbackSphere[3]),
      max: fallbackSphere.slice(0, 3).map(value => value + fallbackSphere[3])
    };
  }
  let result = null;
  for (const x of [sourceBounds.min[0], sourceBounds.max[0]])
  {
    for (const y of [sourceBounds.min[1], sourceBounds.max[1]])
    {
      for (const z of [sourceBounds.min[2], sourceBounds.max[2]])
      {
        const point = vec3.transformMat4(vec3.create(), [x, y, z], transform);
        result = includeBounds(result, { min: Array.from(point), max: Array.from(point) });
      }
    }
  }
  return result;
}

function includeBounds(current, next)
{
  if (!next) return current;
  if (!current) return { min: next.min.slice(), max: next.max.slice() };
  for (let axis = 0; axis < 3; axis++)
  {
    current.min[axis] = Math.min(current.min[axis], next.min[axis]);
    current.max[axis] = Math.max(current.max[axis], next.max[axis]);
  }
  return current;
}

function groupLayoutPlacements(placements)
{
  const groups = new Map();
  for (const placement of placements)
  {
    if (!groups.has(placement.batchKey)) groups.set(placement.batchKey, []);
    groups.get(placement.batchKey).push(placement);
  }
  return groups.values();
}

function addEffectShaderOption(document, effectRef, name, value)
{
  const effect = document.GetNode(effectRef?.$ref);
  if (!effect) return;
  if (!Array.isArray(effect.fields.options)) effect.fields.options = [];
  const duplicate = effect.fields.options.some(ref => {
    const option = document.GetNode(ref?.$ref);
    return option?.fields?.name === name;
  });
  if (!duplicate)
  {
    effect.fields.options.push(document.AddNode("Tr2ShaderOption", { name, value }));
  }
}

function addMeshShaderOption(document, meshFields, name, value)
{
  for (const field of ["opaqueAreas", "transparentAreas", "additiveAreas", "distortionAreas", "depthAreas"])
  {
    for (const areaRef of meshFields[field] ?? [])
    {
      const area = document.GetNode(areaRef?.$ref);
      addEffectShaderOption(document, area?.fields?.effect, name, value);
    }
  }
}

function addChildMeshShaderOption(document, childFields, name, value)
{
  const mesh = document.GetNode(childFields.mesh?.$ref);
  if (mesh) addMeshShaderOption(document, mesh.fields, name, value);
  for (const decalRef of childFields.decals ?? [])
  {
    const decal = document.GetNode(decalRef?.$ref);
    addEffectShaderOption(document, decal?.fields?.decalEffect, name, value);
  }
}

function propagateInstancedMeshInstances(sourceInstances, requestedOffsets)
{
  const offsets = Array.isArray(requestedOffsets) && requestedOffsets.length
    ? requestedOffsets.map(value => arrayValue(value, identityMatrix()))
    : [identityMatrix()];
  const identityFastPath = offsets.length === 1 && isIdentityMatrix(offsets[0]);
  const instances = [];
  const instanceTransforms = [];
  if (identityFastPath)
  {
    for (const source of sourceInstances)
    {
      instances.push(clonePackedInstance(source));
      instanceTransforms.push(Array.from(unpackInstanceMatrix(source)));
    }
    return { instances, instanceTransforms };
  }

  for (const offset of offsets)
  {
    for (const source of sourceInstances)
    {
      const combined = mat4.multiply(
        mat4.create(),
        offset,
        unpackInstanceMatrix(source)
      );
      instances.push(packInstanceMatrix(combined, source.boneIndex));
      // Carbon retains the transposed product in this auxiliary list on the
      // general path, unlike its ordinary-matrix identity fast path.
      instanceTransforms.push(Array.from(mat4.transpose(mat4.create(), combined)));
    }
  }
  return { instances, instanceTransforms };
}

function clonePackedInstance(source)
{
  return {
    transform0: arrayValue(source.transform0, [1, 0, 0, 0]),
    transform1: arrayValue(source.transform1, [0, 1, 0, 0]),
    transform2: arrayValue(source.transform2, [0, 0, 1, 0]),
    lastTransform0: arrayValue(source.lastTransform0, source.transform0 ?? [1, 0, 0, 0]),
    lastTransform1: arrayValue(source.lastTransform1, source.transform1 ?? [0, 1, 0, 0]),
    lastTransform2: arrayValue(source.lastTransform2, source.transform2 ?? [0, 0, 1, 0]),
    boneIndex: Number(source.boneIndex ?? 0) | 0
  };
}

function unpackInstanceMatrix(source)
{
  const t0 = arrayValue(source.transform0, [1, 0, 0, 0]);
  const t1 = arrayValue(source.transform1, [0, 1, 0, 0]);
  const t2 = arrayValue(source.transform2, [0, 0, 1, 0]);
  return new Float32Array([
    t0[0], t1[0], t2[0], 0,
    t0[1], t1[1], t2[1], 0,
    t0[2], t1[2], t2[2], 0,
    t0[3], t1[3], t2[3], 1
  ]);
}

function packInstanceMatrix(matrix, boneIndex)
{
  const transform0 = [matrix[0], matrix[4], matrix[8], matrix[12]];
  const transform1 = [matrix[1], matrix[5], matrix[9], matrix[13]];
  const transform2 = [matrix[2], matrix[6], matrix[10], matrix[14]];
  return {
    transform0,
    transform1,
    transform2,
    lastTransform0: transform0.slice(),
    lastTransform1: transform1.slice(),
    lastTransform2: transform2.slice(),
    boneIndex: Number(boneIndex ?? 0) | 0
  };
}

function isIdentityMatrix(value)
{
  const identity = identityMatrix();
  return identity.every((item, index) => Number(value[index]) === item);
}

function translationBounds(instances)
{
  const min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (const instance of instances)
  {
    const point = [
      Number(instance.transform0?.[3] ?? 0),
      Number(instance.transform1?.[3] ?? 0),
      Number(instance.transform2?.[3] ?? 0)
    ];
    for (let axis = 0; axis < 3; axis++)
    {
      min[axis] = Math.min(min[axis], point[axis]);
      max[axis] = Math.max(max[axis], point[axis]);
    }
  }
  return { min, max };
}

function maximumInstanceScale(instances)
{
  let maxLengthSquared = 0;
  for (const instance of instances)
  {
    for (const row of [instance.transform0, instance.transform1, instance.transform2])
    {
      const value = arrayValue(row, [0, 0, 0, 0]);
      maxLengthSquared = Math.max(
        maxLengthSquared,
        value[0] * value[0] + value[1] * value[1] + value[2] * value[2]
      );
    }
  }
  return Math.sqrt(maxLengthSquared);
}

function createInstancedMeshArea(document, dna, source, shaderData, resolveTexturePath)
{
  const constParameters = [];
  const parameterNames = new Set();
  for (const name of shaderData.parameters)
  {
    const value = dna.GetMeshAreaParameter(EveSOFDataArea.AreaType.TYPE_PRIMARY, name);
    if (!value || parameterNames.has(name)) continue;
    parameterNames.add(name);
    constParameters.push(document.AddNode("Tr2ConstantEffectParameter", {
      name,
      value: Array.from(value)
    }));
  }
  for (const name of sortedKeys(shaderData.defaultParameters))
  {
    if (parameterNames.has(name)) continue;
    parameterNames.add(name);
    constParameters.push(document.AddNode("Tr2ConstantEffectParameter", {
      name,
      value: Array.from(shaderData.defaultParameters.get(name))
    }));
  }

  const resources = [];
  const resourceNames = new Set();
  for (const name of sortedKeys(source.textures))
  {
    if (resourceNames.has(name)) continue;
    resourceNames.add(name);
    resources.push(document.AddNode("TriTextureParameter", {
      name,
      resourcePath: resolveTexturePath(source.textures.get(name).resFilePath)
    }));
  }
  for (const name of sortedKeys(shaderData.defaultTextures))
  {
    if (resourceNames.has(name)) continue;
    resourceNames.add(name);
    resources.push(document.AddNode("TriTextureParameter", {
      name,
      resourcePath: shaderData.defaultTextures.get(name).resFilePath
    }));
  }

  const option = document.AddNode("Tr2ShaderOption", {
    name: "SPACE_OBJECT_INSTANCED_ATTACHMENT",
    value: "SOIA_ENABLED"
  });
  const effect = document.AddNode("Tr2Effect", {
    effectFilePath: dna.GetCompleteShaderPath(source.shader),
    options: [option],
    constParameters,
    parameters: [],
    resources,
    samplerOverrides: []
  });
  return document.AddNode("Tr2MeshArea", {
    name: "hull",
    index: 0,
    count: 1,
    reversed: false,
    useSHLighting: false,
    effect
  });
}

function createBoosterEffect(document, race, lodOption)
{
  const constParameters = [];
  const add = (name, value) => {
    const vector = Array.isArray(value) || ArrayBuffer.isView(value)
      ? arrayValue(value, [0, 0, 0, 0])
      : [Number(value ?? 0), Number(value ?? 0), Number(value ?? 0), Number(value ?? 0)];
    constParameters.push(document.AddNode("Tr2ConstantEffectParameter", { name, value: vector }));
  };
  add("NoiseSpeed0", race.shape0.noiseSpeed);
  add("NoiseAmplitudeStart0", race.shape0.noiseAmplitureStart);
  add("NoiseAmplitudeEnd0", race.shape0.noiseAmplitureEnd);
  add("NoiseFrequency0", race.shape0.noiseFrequency);
  add("Color0", race.shape0.color);
  add("NoiseSpeed1", race.shape1.noiseSpeed);
  add("NoiseAmplitudeStart1", race.shape1.noiseAmplitureStart);
  add("NoiseAmplitudeEnd1", race.shape1.noiseAmplitureEnd);
  add("Color1", race.shape1.color);
  add("WarpNoiseSpeed0", race.warpShape0.noiseSpeed);
  add("WarpNoiseAmplitudeStart0", race.warpShape0.noiseAmplitureStart);
  add("WarpNoiseAmplitudeEnd0", race.warpShape0.noiseAmplitureEnd);
  add("WarpNoiseFrequency0", race.warpShape0.noiseFrequency);
  add("WarpColor0", race.warpShape0.color);
  add("WarpNoiseSpeed1", race.warpShape1.noiseSpeed);
  add("WarpNoiseAmplitudeStart1", race.warpShape1.noiseAmplitureStart);
  add("WarpNoiseAmplitudeEnd1", race.warpShape1.noiseAmplitureEnd);
  add("WarpColor1", race.warpShape1.color);
  add("ShapeAtlasSize", [race.shapeAtlasHeight, race.shapeAtlasCount, 0, 0]);
  add("BoosterScale", race.scale);

  return document.AddNode("Tr2Effect", {
    effectFilePath: "res:/Graphics/Effect/Managed/Space/Booster/BoosterVolumetric.fx",
    options: [document.AddNode("Tr2ShaderOption", {
      name: "BOOSTER_LOD",
      value: lodOption
    })],
    constParameters,
    parameters: [],
    resources: [
      document.AddNode("TriTextureParameter", {
        name: "ShapeMap",
        resourcePath: String(race.shapeAtlasResPath ?? "")
      }),
      document.AddNode("TriTextureParameter", {
        name: "GradientMap0",
        resourcePath: String(race.gradient0ResPath ?? "")
      }),
      document.AddNode("TriTextureParameter", {
        name: "GradientMap1",
        resourcePath: String(race.gradient1ResPath ?? "")
      }),
      document.AddNode("TriTextureParameter", {
        name: "NoiseMap",
        resourcePath: "res:/Texture/Global/noise32cube_volume.dds"
      })
    ],
    samplerOverrides: []
  });
}

function mergeDocumentLocatorSet(document, rootFields, name, locatorRefs)
{
  if (locatorRefs.length === 0) return null;
  for (const ref of rootFields.locatorSets)
  {
    const node = document.GetNode(ref?.$ref);
    if (node?.kind === "EveLocatorSets" && node.fields?.name === name)
    {
      node.fields.locators.push(...locatorRefs);
      return ref;
    }
  }
  const ref = document.AddNode("EveLocatorSets", { name, locators: locatorRefs });
  rootFields.locatorSets.push(ref);
  return ref;
}

function sortedKeys(map)
{
  return [...map.keys()].sort((a, b) => a.localeCompare(b));
}

function selectDecalIndexBuffers(item, hullCount, combinedGeometryPath)
{
  if (hullCount === 1) return item.indexBuffers.map(indices => indices.slice());
  for (const entry of item.multiHullIndexBuffers)
  {
    if (entry.combinedGeometryResPath === combinedGeometryPath)
    {
      return entry.indexBuffers.map(indices => indices.slice());
    }
  }
  return [];
}

function effectParameters(document, parameters)
{
  return sortedKeys(parameters).map(name => document.AddNode("Tr2ConstantEffectParameter", {
    name,
    value: Array.from(parameters.get(name))
  }));
}

function effectResources(document, textures)
{
  return sortedKeys(textures).map(name => document.AddNode("TriTextureParameter", {
    name,
    resourcePath: textures.get(name).resFilePath
  }));
}

function createImpactEmitter(document, values)
{
  const emitterData = {
    angle: Number(values.angle ?? 0),
    innerAngle: Number(values.innerAngle ?? 0),
    minSpeed: Number(values.minMaxSpeed?.[0] ?? 0),
    maxSpeed: Number(values.minMaxSpeed?.[1] ?? 0)
  };
  const paramsData = {
    minLifeTime: Number(values.minMaxLifeTime?.[0] ?? 0),
    maxLifeTime: Number(values.minMaxLifeTime?.[1] ?? 0),
    sizes: [
      Number(values.sizes?.[0] ?? 0),
      Number(values.sizes?.[1] ?? 0),
      Number(values.sizes?.[2] ?? 0)
    ],
    sizeVariance: Number(values.sizes?.[3] ?? 0),
    colors: [0, 1, 2, 3].map(index => arrayValue(values.colors?.[index], [0, 0, 0, 0])),
    textureIndex: Number(values.textureIndex ?? 0) >>> 0,
    velocityStretchRotation: Number(values.velocityStretchRotation ?? 0),
    drag: Number(values.drag ?? 0),
    turbulenceAmplitude: Number(values.turbulenceAmplitude ?? 0),
    turbulenceFrequency: Number(values.turbulenceFrequency ?? 0) >>> 0,
    colorMidpoint: Number(values.colorMidpoint ?? 0)
  };
  return document.AddNode("Tr2GpuUniqueEmitter", {
    rate: Number(values.rate ?? 0),
    angle: emitterData.angle,
    innerAngle: emitterData.innerAngle,
    minSpeed: emitterData.minSpeed,
    maxSpeed: emitterData.maxSpeed,
    minLifeTime: paramsData.minLifeTime,
    maxLifeTime: paramsData.maxLifeTime,
    sizes: paramsData.sizes,
    sizeVariance: paramsData.sizeVariance,
    color0: paramsData.colors[0],
    color1: paramsData.colors[1],
    color2: paramsData.colors[2],
    color3: paramsData.colors[3],
    textureIndex: paramsData.textureIndex,
    colorMidpoint: paramsData.colorMidpoint,
    velocityStretchRotation: paramsData.velocityStretchRotation,
    drag: paramsData.drag,
    turbulenceAmplitude: paramsData.turbulenceAmplitude,
    turbulenceFrequency: paramsData.turbulenceFrequency
  });
}

/**
 * Counts how many times each node is reached from a starting reference.
 *
 * Recursion stops at a node already seen, so a cycle terminates and every node
 * on it still records more than one visit — which is exactly the condition for
 * giving it an identity.
 */
function CountDocumentVisits(value, nodeById, visits)
{
  if (CjsCarbonDocument.isRef(value))
  {
    const id = Number(value.$ref);
    const seen = visits.get(id) ?? 0;
    visits.set(id, seen + 1);
    if (seen) return;

    const node = nodeById.get(id);
    if (!node) return;

    CountDocumentVisits(node.fields ?? {}, nodeById, visits);
    CountDocumentVisits(node.raw ?? {}, nodeById, visits);

    return;
  }

  if (Array.isArray(value))
  {
    for (const item of value) CountDocumentVisits(item, nodeById, visits);

    return;
  }

  if (value && typeof value === "object")
  {
    for (const item of Object.values(value)) CountDocumentVisits(item, nodeById, visits);
  }
}

/**
 * Rewrites one document value into its plain-values form.
 *
 * `emitted` maps a node id to the `_id` it was given on first emission, so a
 * later occurrence becomes `{ _ref }`. Ids are allocated in emission order
 * rather than reusing document ids, so the output does not carry the node
 * table's numbering as a hidden dependency.
 */
function ProjectDocumentNode(value, nodeById, visits, emitted, state)
{
  if (CjsCarbonDocument.isRef(value))
  {
    const id = Number(value.$ref);

    if (emitted.has(id)) return { _ref: emitted.get(id) };

    const node = nodeById.get(id);
    if (!node) throw new TypeError(`EveSOF values projection found no node for ref ${id}.`);

    const projected = { _type: node.kind };

    if ((visits.get(id) ?? 0) > 1)
    {
      const valueId = state.nextId++;
      emitted.set(id, valueId);
      projected._id = valueId;
    }

    // `fields` and `raw` are transport envelopes rather than data: the reader
    // of a values graph sees one object whose properties are the node's.
    for (const [key, item] of Object.entries({ ...node.fields, ...node.raw }))
    {
      projected[key] = ProjectDocumentNode(item, nodeById, visits, emitted, state);
    }

    return projected;
  }

  if (Array.isArray(value))
  {
    return value.map(item => ProjectDocumentNode(item, nodeById, visits, emitted, state));
  }

  if (value && typeof value === "object")
  {
    return Object.fromEntries(Object.entries(value)
      .map(([key, item]) => [key, ProjectDocumentNode(item, nodeById, visits, emitted, state)]));
  }

  return value;
}

function cloneFields(fields)
{
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, cloneValue(value)]));
}

function cloneValue(value)
{
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!value || typeof value !== "object") return value;
  return { ...value };
}

class SofDocumentBuilder
{

  #nodes = [];

  #roots = [];

  AddNode(kind, fields, raw = null)
  {
    const node = { id: this.#nodes.length + 1, kind, fields };
    if (raw && Object.keys(raw).length) node.raw = raw;
    this.#nodes.push(node);
    return { $ref: node.id };
  }

  /** Imports and remaps one complete carbon.document graph fragment. */
  ImportRoot(fragment, rootRef = fragment?.roots?.[0]?.ref)
  {
    if (!fragment || fragment.schema !== "carbon.document" || !Array.isArray(fragment.nodes))
    {
      throw new TypeError("EveSOF child resource document must be a carbon.document");
    }
    const refs = new Map();
    for (const source of fragment.nodes)
    {
      const id = Number(source?.id);
      if (!Number.isInteger(id) || id <= 0 || refs.has(id) || typeof source.kind !== "string")
      {
        throw new TypeError("EveSOF child resource document contains an invalid node");
      }
      refs.set(id, this.AddNode(source.kind, {}));
    }
    for (const source of fragment.nodes)
    {
      const target = this.GetNode(refs.get(Number(source.id)).$ref);
      target.fields = remapImportedValue(source.fields ?? {}, refs);
      if (source.raw && Object.keys(source.raw).length)
      {
        target.raw = remapImportedValue(source.raw, refs);
      }
    }
    const importedRoot = remapImportedValue(rootRef, refs);
    if (!importedRoot || !Number.isInteger(Number(importedRoot.$ref)))
    {
      throw new TypeError("EveSOF child resource document root is invalid");
    }
    return importedRoot;
  }

  GetNode(id)
  {
    return this.#nodes[id - 1] ?? null;
  }

  AddRoot(name, ref)
  {
    this.#roots.push({ name, ref });
  }

  ToJSON()
  {
    const nodesById = new Map(this.#nodes.map(node => [node.id, node]));
    const reachable = new Set();
    const visitValue = value =>
    {
      if (Array.isArray(value))
      {
        value.forEach(visitValue);
        return;
      }
      if (!value || typeof value !== "object") return;
      if (Object.hasOwn(value, "$ref"))
      {
        const id = Number(value.$ref);
        if (reachable.has(id)) return;
        const node = nodesById.get(id);
        if (!node) return;
        reachable.add(id);
        visitValue(node.fields);
        visitValue(node.raw);
        return;
      }
      Object.values(value).forEach(visitValue);
    };
    this.#roots.forEach(root => visitValue(root.ref));
    return {
      schema: "carbon.document",
      version: 1,
      format: { id: "runtime-sof", version: 1 },
      roots: this.#roots,
      nodes: this.#nodes.filter(node => reachable.has(node.id))
    };
  }

}

function createSwarmBehaviorFields(source)
{
  if (!source) return null;
  const result = {};
  for (const name of SWARM_BEHAVIOR_FIELD_NAMES)
  {
    result[name] = Number(source[name]);
  }
  result.weightDeceleration = Number(source.weightDecelerate ?? source.weightDeceleration);
  return result;
}

function normalizeSofResourcePath(value)
{
  return String(value ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .toLowerCase();
}

function SofRequestKey(path, output)
{
  return `${normalizeSofResourcePath(path)}\0${output}`;
}

function CollectSofRequest(requests, path, output, role, context = null)
{
  const normalizedPath = normalizeSofResourcePath(path);
  if (!normalizedPath) return null;
  const key = SofRequestKey(normalizedPath, output);
  if (!requests.has(key))
  {
    requests.set(key, { key, path: normalizedPath, output, role, context });
  }
  return key;
}

function IsCarbonDocument(value)
{
  return value?.schema === "carbon.document"
    && Array.isArray(value.roots)
    && Array.isArray(value.nodes);
}

async function ResolveSofDependency(load, path, role, results, resultKey = path)
{
  try
  {
    const value = await load();
    results.set(resultKey, value);
    return value;
  }
  catch (cause)
  {
    const error = new Error(`EveSOF failed to resolve ${role} resource: ${path}`, { cause });
    error.code = "EVE_SOF_RESOURCE_RESOLUTION_FAILED";
    error.path = path;
    error.role = role;
    throw error;
  }
}

function remapImportedValue(value, refs)
{
  if (Array.isArray(value)) return value.map(item => remapImportedValue(item, refs));
  if (!value || typeof value !== "object") return value;
  if (Object.hasOwn(value, "$ref"))
  {
    const ref = refs.get(Number(value.$ref));
    if (!ref) throw new TypeError(`EveSOF child resource ref ${value.$ref} does not exist`);
    return { $ref: ref.$ref };
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, remapImportedValue(item, refs)]));
}
