// The parameters every outline effect shares, so one set of values drives
// every outline, whatever draws it.
//
// Annotations follow CCP's shipped effects: SasUiVisible exposes a parameter
// (the only annotation Carbon itself reads, Tr2Effect::PopulateParameters);
// Group, SasUiDescription, UIWidget, Component1-4 and Validation are for the
// tools that edit it.

#ifndef OUTLINEPARAMETERS_FXH
#define OUTLINEPARAMETERS_FXH

float4 OutlineColour
<
    bool SasUiVisible = true;
    string Group = "Outline";
    string SasUiDescription = "The outline colour, in linear space";
    string UIWidget = "LinearColor";
> = float4( 1.0, 1.0, 1.0, 1.0 );

float4 OutlineSettings
<
    bool SasUiVisible = true;
    string Group = "Outline";
    string SasUiDescription = "( Brightness, Width in pixels, Animated, unused )";
    string UIWidget = "VectorMixed";
    string Component1 = "Brightness";
    string Component2 = "Width in pixels";
    string Component3 = "Animated (0 = off, 1 = on)";
    string Component4 = "unused";
    string Validation = "self.y >= 0";
    string ValidationMessage = "Outline width cannot be negative";
> = float4( 1.0, 2.0, 0.0, 0.0 );

float4 OutlineAnimationSettings
<
    bool SasUiVisible = true;
    string Group = "Outline";
    string SasUiDescription = "Reserved for outline animation; not used yet";
    string UIWidget = "VectorMixed";
    string Component1 = "unused";
    string Component2 = "unused";
    string Component3 = "unused";
    string Component4 = "unused";
> = float4( 0.0, 0.0, 0.0, 0.0 );

#endif // OUTLINEPARAMETERS_FXH
