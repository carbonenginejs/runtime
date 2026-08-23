/**
 * Trinity shader permutation axis and option metadata.
 */
export class HlslShaderPermutation
{
    /**
   * Creates an empty permutation description as stored in an effect header.
   */
    constructor()
    {
        this.name = "";
        this.options = [];
        this.defaultOption = 0;
        this.description = "";
        this.type = 0;
    }

    /**
   * Returns the permutation metadata in report-friendly form.
   *
   * @returns {object} Serializable permutation description.
   */
    toJSON()
    {
        return {
            name: this.name,
            options: this.options.slice(),
            defaultOption: this.defaultOption,
            description: this.description,
            type: this.type
        };
    }
}
