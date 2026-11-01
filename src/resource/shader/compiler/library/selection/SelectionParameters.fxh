// Our selection helper uses separate hover (red) and selected (green) masks.
#ifndef SELECTIONPARAMETERS_FXH
#define SELECTIONPARAMETERS_FXH
float4 SelectionChannel
<
    bool SasUiVisible = false;
    string SasUiDescription = "Mask channel weights: red hover, green selected";
> = float4( 1.0, 0.0, 0.0, 0.0 );
#endif
