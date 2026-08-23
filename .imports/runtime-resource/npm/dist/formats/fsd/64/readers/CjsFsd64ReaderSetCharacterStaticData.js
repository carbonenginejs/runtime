import ancestriesReader from './CjsFsd64SchemaAncestries.js';
import archetypesReader from './CjsFsd64SchemaArchetypes.js';
import bloodlinesReader from './CjsFsd64SchemaBloodlines.js';
import characterAvatarBehaviorsReader from './CjsFsd64SchemaCharacterAvatarBehaviors.js';
import characterColorLocationsReader from './CjsFsd64SchemaCharacterColorLocations.js';
import characterColorNamesReader from './CjsFsd64SchemaCharacterColorNames.js';
import characterModifierLocationsReader from './CjsFsd64SchemaCharacterModifierLocations.js';
import characterPortraitResourcesReader from './CjsFsd64SchemaCharacterPortraitResources.js';
import characterResourcesReader from './CjsFsd64SchemaCharacterResources.js';
import characterSculptingLocationsReader from './CjsFsd64SchemaCharacterSculptingLocations.js';
import paperdollsReader from './CjsFsd64SchemaPaperdolls.js';
import racesReader from './CjsFsd64SchemaRaces.js';

const CHARACTER_STATIC_DATA_READERS = [ancestriesReader, archetypesReader, bloodlinesReader, characterAvatarBehaviorsReader, characterColorLocationsReader, characterColorNamesReader, characterModifierLocationsReader, characterPortraitResourcesReader, characterResourcesReader, characterSculptingLocationsReader, paperdollsReader, racesReader];
const CHARACTER_STATIC_DATA_PATHS = CHARACTER_STATIC_DATA_READERS.map(reader => reader.constructor.path);

/**
 * File-specific character/staticdata readers.
 */
class CjsFsd64ReaderSetCharacterStaticData {
  static create() {
    return [...CHARACTER_STATIC_DATA_READERS];
  }
  static registerAll(registry) {
    for (const reader of this.create()) {
      registry.Register(reader.constructor.path, reader);
    }
    return registry;
  }
}

export { CHARACTER_STATIC_DATA_PATHS, CjsFsd64ReaderSetCharacterStaticData };
//# sourceMappingURL=CjsFsd64ReaderSetCharacterStaticData.js.map
