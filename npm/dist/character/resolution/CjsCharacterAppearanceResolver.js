import { CjsCharacterPartMetadata as _CjsCharacterPartMeta } from '../catalog/CjsCharacterPartMetadata.js';
import { CjsCharacterModifierReference as _CjsCharacterModifier$1 } from '../catalog/CjsCharacterModifierReference.js';
import { CjsCharacterPartSource as _CjsCharacterPartSour$1 } from '../catalog/CjsCharacterPartSource.js';
import { CjsCharacterPartSourceVersion as _CjsCharacterPartSour } from '../catalog/CjsCharacterPartSourceVersion.js';
import { CjsCharacterPartType as _CjsCharacterPartType } from '../catalog/CjsCharacterPartType.js';
import { CjsCharacterModifierLocation as _CjsCharacterModifier } from '../composition/CjsCharacterModifierLocation.js';
import { CjsCharacterModifierOrder } from '../composition/CjsCharacterModifierOrder.js';
import { CjsCharacterPaperdoll as _CjsCharacterPaperdol } from '../creation/CjsCharacterPaperdoll.js';
import { CjsCharacterAppearancePlan as _CjsCharacterAppearan } from '../planning/CjsCharacterAppearancePlan.js';
import { CjsCharacterResource as _CjsCharacterResource } from '../resources/CjsCharacterResource.js';

/** Resolves source-backed paper-doll selections without inventing character rendering policy. */
class CjsCharacterAppearanceResolver {
  /** Resolves one hydrated paper doll into the currently provable appearance-plan tranche. */
  static resolvePaperdoll(library, paperdoll) {
    if (!library || library.schema !== "carbonenginejs.characterLibrary" || ![7, 8, 9].includes(library.schemaVersion) || typeof library.Get !== "function" || typeof library.GetDocument !== "function") {
      throw new TypeError("Character appearance resolution requires CjsCharacterLibrary");
    }
    if (!(paperdoll instanceof _CjsCharacterPaperdol)) {
      throw new TypeError("Character appearance resolution requires CjsCharacterPaperdoll");
    }
    if (!paperdoll.recordID || library.Get("paperdolls", paperdoll.recordID) !== paperdoll) {
      throw new TypeError("Character appearance resolution requires a paper doll from the supplied library");
    }
    const plan = new _CjsCharacterAppearan();
    const groupIDs = new Set();
    const modifierPolicies = [];
    plan.sourceBuild = library.sourceBuild;
    for (let modifierIndex = 0; modifierIndex < paperdoll.modifiers.length; modifierIndex++) {
      ResolveModifier(plan, paperdoll, paperdoll.modifiers[modifierIndex], modifierIndex, groupIDs, modifierPolicies);
    }
    ResolveModifierPolicy(plan, modifierPolicies);
    if (plan.layers.length) {
      AddDiagnostic(plan, "PASS_ORDER_UNRESOLVED", "Resolved contributions do not establish atlas targets or composition-pass order.", "warning");
    }
    return plan;
  }
}
function ResolveModifier(plan, paperdoll, modifier, modifierIndex, groupIDs, modifierPolicies) {
  const selectionOrigin = AddOrigin(plan, {
    kind: "decoded",
    document: "paperdolls",
    recordID: paperdoll.recordID,
    jsonPointer: `/modifiers/${modifierIndex}`
  });
  const location = modifier?.modifierLocationID;
  if (!(location instanceof _CjsCharacterModifier) || !location.modifierKey) {
    AddDiagnostic(plan, "MODIFIER_LOCATION_UNRESOLVED", `Paper-doll modifier ${modifierIndex} has no resolved modifier location.`, "warning", selectionOrigin);
    return;
  }
  const selection = plan.CreateSelection({
    groupID: location.modifierKey,
    origin: selectionOrigin
  });
  const modifierOrderIdentity = ResolveModifierOrderIdentity(selection.groupID);
  const modifierPolicy = {
    category: modifierOrderIdentity.category,
    group: modifierOrderIdentity.group,
    metadata: null,
    origin: selectionOrigin
  };
  modifierPolicies.push(modifierPolicy);
  if (groupIDs.has(selection.groupID)) {
    AddDiagnostic(plan, "DUPLICATE_SELECTION_GROUP", `Paper doll contains more than one selection for ${JSON.stringify(selection.groupID)}.`, "warning", selectionOrigin);
  }
  groupIDs.add(selection.groupID);
  if (modifier.paperdollResourceVariation !== 0) {
    AddDiagnostic(plan, "RESOURCE_VARIATION_UNRESOLVED", `Selection ${JSON.stringify(selection.groupID)} uses unresolved resource variation ${modifier.paperdollResourceVariation}.`, "warning", selectionOrigin);
  }
  const resource = modifier.paperdollResourceID;
  if (!(resource instanceof _CjsCharacterResource)) {
    AddDiagnostic(plan, "CHARACTER_RESOURCE_UNRESOLVED", `Selection ${JSON.stringify(selection.groupID)} has no resolved character resource.`, "warning", selectionOrigin);
    return;
  }
  DiagnoseCharacterRules(plan, resource, selection, selectionOrigin);
  const partType = resource.partType;
  if (!(partType instanceof _CjsCharacterPartType)) {
    AddDiagnostic(plan, "PART_TYPE_UNRESOLVED", `Character resource ${JSON.stringify(resource.recordID)} has no exact part-type relationship.`, "warning", selectionOrigin);
    return;
  }
  if (partType.colorVariant !== null && partType.colorVariant !== "") {
    AddDiagnostic(plan, "MATERIAL_SELECTION_UNRESOLVED", `Part type ${JSON.stringify(partType.recordID)} has an unresolved color variant.`, "info", selectionOrigin);
  }
  const partSource = ResolvePartSource(plan, partType, resource, selectionOrigin);
  if (partSource === null) return;
  if (partType.sex && partType.sex !== partSource.sex || partType.partPath !== partSource.partPath) {
    AddDiagnostic(plan, "PART_SOURCE_MISMATCH", `Part type ${JSON.stringify(partType.recordID)} and source ${JSON.stringify(partSource.recordID)} disagree on sex or part path.`, "warning", selectionOrigin);
    return;
  }
  const matches = partSource.versions.map((version, index) => ({
    version,
    index
  })).filter(({
    version
  }) => version instanceof _CjsCharacterPartSour && version.resourceVersion === partType.resourceVersion);
  if (matches.length !== 1) {
    AddDiagnostic(plan, matches.length ? "PART_VERSION_AMBIGUOUS" : "PART_VERSION_UNRESOLVED", `Part source ${JSON.stringify(partSource.recordID)} has ${matches.length} exact matches for resource version ${JSON.stringify(partType.resourceVersion)}.`, "warning", selectionOrigin);
    return;
  }
  const {
    version,
    index: versionIndex
  } = matches[0];
  modifierPolicy.metadata = DiagnosePartMetadata(plan, version.metadata, partSource, selectionOrigin);
  const hasConfiguration = version.configurationCandidates.length === 1;
  const hasGeometry = version.geometryCandidates.length === 1;
  if (!hasConfiguration || !hasGeometry) {
    AddDiagnostic(plan, "PART_CANDIDATES_UNRESOLVED", `Part source ${JSON.stringify(partSource.recordID)} requires exactly one configuration and one geometry candidate.`, "warning", selectionOrigin);
  }
  const partOrigin = AddOrigin(plan, {
    kind: "derived",
    document: "characterPartSources",
    recordID: partSource.recordID,
    jsonPointer: `/versions/${versionIndex}`,
    rule: hasConfiguration && hasGeometry ? "unique-version-candidates" : "exact-source-version"
  });
  const part = plan.CreatePart({
    configurationPath: hasConfiguration ? version.configurationCandidates[0] : null,
    geometryPath: hasGeometry ? version.geometryCandidates[0] : null,
    texturePaths: [...version.textureCandidates],
    origin: partOrigin
  });
  const layerOrigin = AddOrigin(plan, {
    kind: "derived",
    document: "paperdolls",
    recordID: paperdoll.recordID,
    jsonPointer: `/modifiers/${modifierIndex}`,
    rule: "exact-selection-part-chain"
  });
  plan.CreateLayer({
    owner: selection,
    contributor: part,
    origin: layerOrigin
  });
  ResolvePartDependencies(plan, modifierPolicy.metadata, partSource, selection);
  if (version.textureCandidates.length) {
    AddDiagnostic(plan, "TEXTURE_ROLES_UNRESOLVED", `Part source ${JSON.stringify(partSource.recordID)} has texture candidates without decoded roles or placement.`, "info", partOrigin);
  }
}
function ResolvePartSource(plan, partType, resource, origin) {
  const candidates = [];
  for (const value of partType.partSources ?? []) {
    if (value instanceof _CjsCharacterPartSour$1 && !candidates.includes(value)) {
      candidates.push(value);
    }
  }
  if (partType.partSource instanceof _CjsCharacterPartSour$1 && !candidates.includes(partType.partSource)) {
    candidates.push(partType.partSource);
  }
  const sex = resource.resGender === 0 ? "female" : resource.resGender === 1 ? "male" : null;
  const matches = sex === null ? candidates : candidates.filter(candidate => candidate.sex === sex);
  if (matches.length !== 1) {
    AddDiagnostic(plan, matches.length ? "PART_SOURCE_AMBIGUOUS" : "PART_SOURCE_UNRESOLVED", `Part type ${JSON.stringify(partType.recordID)} has ${matches.length} exact part-source matches` + `${sex === null ? "" : ` for ${sex}`}.`, "warning", origin);
    return null;
  }
  return matches[0];
}
function DiagnoseCharacterRules(plan, resource, selection, origin) {
  const hasCategoryRules = [resource.clothingAlsoCoversCategory, resource.clothingAlsoCoversCategory2, resource.clothingRemovesCategory, resource.clothingRemovesCategory2].some(Boolean);
  if (hasCategoryRules || resource.clothingRuleException !== null) {
    AddDiagnostic(plan, "CLOTHING_RULES_UNRESOLVED", `Selection ${JSON.stringify(selection.groupID)} has authored clothing rules whose actions are not yet resolved.`, "warning", origin);
  }
}
function DiagnosePartMetadata(plan, metadata, partSource, origin) {
  if (metadata === null) {
    return null;
  }
  if (!(metadata instanceof _CjsCharacterPartMeta)) {
    AddDiagnostic(plan, "PART_METADATA_UNRESOLVED", `Part source ${JSON.stringify(partSource.recordID)} has no exact effective metadata relationship.`, "warning", origin);
    return null;
  }
  for (let index = 0; index < metadata.dependentModifiers.length; index++) {
    const value = metadata.dependentModifiers[index];
    const relation = metadata.dependencies[index];
    if (relation instanceof _CjsCharacterModifier$1 && relation.authoredValue === value && relation.partSource instanceof _CjsCharacterPartSour$1) {
      continue;
    }
    AddDiagnostic(plan, "DEPENDENCY_REFERENCE_UNRESOLVED", `Part source ${JSON.stringify(partSource.recordID)} has unresolved authored dependency ${JSON.stringify(value)}.`, "warning", origin);
  }
  for (const value of metadata.occludesModifiers) {
    AddDiagnostic(plan, "OCCLUSION_POLICY_UNRESOLVED", `Part source ${JSON.stringify(partSource.recordID)} has unresolved authored occlusion ${JSON.stringify(value)}.`, "warning", origin);
  }
  if (metadata.wap !== null) {
    AddDiagnostic(plan, "METADATA_COMPATIBILITY_UNRESOLVED", `Part source ${JSON.stringify(partSource.recordID)} has unresolved compatibility metadata.`, "info", origin);
  }
  return metadata;
}
function ResolvePartDependencies(plan, metadata, requestingSource, owner) {
  if (!(metadata instanceof _CjsCharacterPartMeta)) return;
  for (let index = 0; index < metadata.dependentModifiers.length; index++) {
    const authoredValue = metadata.dependentModifiers[index];
    const relation = metadata.dependencies[index];
    if (!(relation instanceof _CjsCharacterModifier$1) || relation.authoredValue !== authoredValue || !(relation.partSource instanceof _CjsCharacterPartSour$1)) {
      continue;
    }
    const target = relation.partSource;
    const versions = target.versions.filter(value => value instanceof _CjsCharacterPartSour);
    const relationOrigin = AddOrigin(plan, {
      kind: "authored",
      document: "characterPartMetadata",
      recordID: metadata.recordID,
      jsonPointer: `/dependencies/${index}`
    });
    if (versions.length !== 1) {
      AddDiagnostic(plan, "DEPENDENCY_VERSION_UNRESOLVED", `Dependency ${JSON.stringify(authoredValue)} from part source ` + `${JSON.stringify(requestingSource.recordID)} has ${versions.length} ` + "possible source versions.", "warning", relationOrigin);
      continue;
    }
    const version = versions[0];
    const versionIndex = target.versions.indexOf(version);
    const hasConfiguration = version.configurationCandidates.length === 1;
    const hasGeometry = version.geometryCandidates.length === 1;
    const hasTextures = version.textureCandidates.length > 0;
    if (!hasConfiguration && !hasGeometry && !hasTextures) {
      AddDiagnostic(plan, "DEPENDENCY_RESOURCES_EMPTY", `Dependency ${JSON.stringify(authoredValue)} from part source ` + `${JSON.stringify(requestingSource.recordID)} has no direct resource candidates.`, "info", relationOrigin);
      continue;
    }
    if (!hasConfiguration && version.configurationCandidates.length || !hasGeometry && version.geometryCandidates.length) {
      AddDiagnostic(plan, "DEPENDENCY_CANDIDATES_AMBIGUOUS", `Dependency part source ${JSON.stringify(target.recordID)} has ambiguous ` + "configuration or geometry candidates.", "warning", relationOrigin);
    }
    const partOrigin = AddOrigin(plan, {
      kind: "derived",
      document: "characterPartSources",
      recordID: target.recordID,
      jsonPointer: `/versions/${versionIndex}`,
      rule: "unique-typed-dependency-version"
    });
    const part = plan.CreatePart({
      configurationPath: hasConfiguration ? version.configurationCandidates[0] : null,
      geometryPath: hasGeometry ? version.geometryCandidates[0] : null,
      texturePaths: [...version.textureCandidates],
      origin: partOrigin
    });
    plan.CreateLayer({
      owner,
      contributor: part,
      origin: relationOrigin
    });
  }
}
function ResolveModifierPolicy(plan, modifierPolicies) {
  const rules = CjsCharacterModifierOrder.resolveRules(modifierPolicies.map(value => value.metadata));
  const categories = CjsCharacterModifierOrder.resolveCategories(rules);
  const ordered = CjsCharacterModifierOrder.sort(modifierPolicies, {
    categories,
    getCategory: value => value.category,
    getGroup: value => value.group
  });
  for (const value of ordered) {
    if (CjsCharacterModifierOrder.getSortKey(value.category, "", categories) !== -1) {
      continue;
    }
    AddDiagnostic(plan, "MODIFIER_CATEGORY_UNKNOWN", `Selection category ${JSON.stringify(value.category)} is absent from the native modifier order.`, "info", value.origin);
  }
}
function ResolveModifierOrderIdentity(groupID) {
  const value = String(groupID ?? "");
  const makeupPrefix = "makeup/";
  if (value.startsWith(makeupPrefix)) {
    return {
      category: "makeup",
      group: value.slice(makeupPrefix.length)
    };
  }
  return {
    category: value,
    group: ""
  };
}
function AddOrigin(plan, values) {
  return plan.CreateOrigin(values);
}
function AddDiagnostic(plan, code, message, severity, origin = null) {
  return plan.CreateDiagnostic({
    code,
    message,
    severity,
    origin
  });
}

export { CjsCharacterAppearanceResolver };
//# sourceMappingURL=CjsCharacterAppearanceResolver.js.map
