const DEFAULT_CATEGORIES = ["skin", "head", "dependants", "archetypes", "bodyshapes", "skintype", "skintone", "tattoo", "makeup", "scars", "beard", "bottominner", "topinner", "bottomunderweartucked", "bottomunderwear", "bottomtight", "topunderweartucked", "sockstucked", "bottommiddle", "topunderwear", "socks", "handsinner", "feettucked", "bottomoutertucked", "toptight", "topmiddle", "bottomouter", "feet", "accessories", "hands", "topouter", "hair", "outer"];
const MAKEUP_GROUPS = ["implants", "eyes", "eyeshadow", "eyebrowbase", "eyebrows", "scarring", "freckles", "blush", "eyelashes", "augmentations"];
const RULE_FIELDS = ["forcesLooseTop", "hidesBootShin", "swapTops", "swapBottom", "swapSocks"];

/** Resolves and applies the verified stable character-modifier order policy. */
class CjsCharacterModifierOrder {
  /** Returns a caller-owned copy of the authored category order. */
  static getDefaultCategories() {
    return [...DEFAULT_CATEGORIES];
  }

  /** Returns a caller-owned copy of the makeup subcategory order. */
  static getMakeupGroups() {
    return [...MAKEUP_GROUPS];
  }

  /** ORs hydrated metadata flags into the one rule set used by ordering. */
  static resolveRules(metadata = []) {
    const values = Array.isArray(metadata) ? metadata : [metadata];
    const rules = Object.fromEntries(RULE_FIELDS.map(field => [field, false]));
    for (const value of values) {
      if (!value || typeof value !== "object") continue;
      for (const field of RULE_FIELDS) {
        rules[field] ||= value[field] === true;
      }
    }
    return rules;
  }

  /** Applies the five metadata-controlled endpoint swaps to a fresh order. */
  static resolveCategories(rules = {}) {
    const result = CjsCharacterModifierOrder.getDefaultCategories();
    EnsureBefore(result, rules.hidesBootShin === true ? ["feet", "feettucked"] : ["feettucked", "feet"]);
    EnsureBefore(result, rules.forcesLooseTop === true ? ["bottomoutertucked", "bottomouter"] : ["bottomouter", "bottomoutertucked"]);
    EnsureBefore(result, rules.swapTops === true ? ["topmiddle", "toptight"] : ["toptight", "topmiddle"]);
    EnsureBefore(result, rules.swapBottom === true ? ["topunderweartucked", "topunderwear"] : ["topunderwear", "topunderweartucked"]);
    EnsureBefore(result, rules.swapSocks === true ? ["socks", "sockstucked"] : ["sockstucked", "socks"]);
    return result;
  }

  /** Returns the native numeric key for one category and optional group. */
  static getSortKey(category, group = "", categories = DEFAULT_CATEGORIES) {
    if (!Array.isArray(categories)) {
      throw new TypeError("Character modifier categories must be an array");
    }
    const categoryName = String(category ?? "");
    const categoryIndex = categories.indexOf(categoryName);
    if (categoryIndex === -1) return -1;
    let groupIndex = 999;
    if (categoryName === "makeup") {
      const resolved = MAKEUP_GROUPS.indexOf(String(group ?? ""));
      if (resolved !== -1) groupIndex = resolved;
    }
    return categoryIndex * 1000 + groupIndex;
  }

  /** Returns a stable, non-mutating sort of modifier-like values. */
  static sort(values, {
    categories = DEFAULT_CATEGORIES,
    getCategory = DefaultCategory,
    getGroup = DefaultGroup
  } = {}) {
    if (!Array.isArray(values)) {
      throw new TypeError("Character modifiers must be an array");
    }
    if (typeof getCategory !== "function" || typeof getGroup !== "function") {
      throw new TypeError("Character modifier accessors must be functions");
    }
    return values.map((value, index) => ({
      index,
      key: CjsCharacterModifierOrder.getSortKey(getCategory(value), getGroup(value), categories),
      value
    })).sort((left, right) => left.key - right.key || left.index - right.index).map(entry => entry.value);
  }
}
function EnsureBefore(categories, [first, second]) {
  const firstIndex = categories.indexOf(first);
  const secondIndex = categories.indexOf(second);
  if (firstIndex === -1 || secondIndex === -1) {
    throw new Error("Character modifier order is missing a required category");
  }
  if (firstIndex > secondIndex) {
    [categories[firstIndex], categories[secondIndex]] = [categories[secondIndex], categories[firstIndex]];
  }
}
function DefaultCategory(value) {
  return value?.category ?? value?.categorie ?? "";
}
function DefaultGroup(value) {
  return value?.group ?? "";
}

export { CjsCharacterModifierOrder };
//# sourceMappingURL=CjsCharacterModifierOrder.js.map
