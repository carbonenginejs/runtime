import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/EffectData.h:343-363

/**
 * One unordered-access view a stage uses: Carbon's `Uav`. Its register is its
 * key in `StageData.uavs`.
 *
 * Carbon declares `operator==( const Texture& )` on this struct; nothing here
 * calls it, so it is not ported.
 */
export class Uav
{
    name = "";

    /** A `TextureType` value. */
    type = 0;

    count = 1;

    isAutoregister = false;
}

CjsSchema.blue.define(Uav, {
    className: "Uav"
});
