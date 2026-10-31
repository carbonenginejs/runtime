/**
 * The character files' list forms, by record class: each listed key of a file holds one tuple per named field,
 * and the reader (`yaml.js`, `normalizeCharacterYamlValues`) copies each tuple into its field in order, an RGB
 * tuple gaining alpha 1. The model classes hold the fields; how a file lays them out is the format's.
 *
 * Ours (non-carbon-extensions.md § *Character source YAML values*): the game's files write colours as tuple
 * lists, and the records hold one named colour per value (operator, 2026-11-01), as Carbon exposes
 * `EveSOFDataFactionColorSet` colour by colour.
 */
export const characterSourceLists = {
    CjsCharacterColorVariation: {
        colors: [ "color1", "color2", "color3" ],
        specularColors: [ "specularColor1", "specularColor2", "specularColor3" ]
    },
    CjsCharacterRecipeModifier: {
        specularcolors: [ "specularColor1", "specularColor2", "specularColor3" ]
    },
    CjsCharacterAttributes: {
        ambientColor: [ "ambientColor" ],
        color: [ "color" ],
        incandescence: [ "incandescence" ],
        transparency: [ "transparency" ]
    }
};
