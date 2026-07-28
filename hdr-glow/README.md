# HDR Glow: Abusing Brightness in Advertising

**Live demo:** https://safari-color-tinting.pages.dev/hdr-glow/

**Source:** [index.html](index.html)

**HDR asset:** [hdr-glow.avif](hdr-glow.avif)

This demo compares two white colors. The [PQ-encoded HDR image](https://www.w3.org/TR/css-color-hdr-1/#rec2100-pq) uses `color(rec2100-pq .75 .75 .75)`. The page background uses [reference white](https://www.w3.org/TR/css-color-hdr-1/#hdr-reference-white), `color(srgb 1 1 1)`. On a compatible HDR display and browser, the image is significantly brighter than the page background.

Digital Color Meter measured the output on an Apple HDR display. It measured the image as linear EDR `1.6 1.6 1.6`. It measured the page background as `1 1 1`. The linear EDR values give a relative [luminance](../luma.md) ratio of 1.6 to 1. They do not give absolute luminance or specify portable CSS colors. A different display or brightness setting can give different values.

The card uses the HDR AVIF as its CSS `background-image`. CSS does not produce the HDR headroom. The HDR AVIF supplies the headroom. SDR hardware and non-HDR browsers map the image to the available range.

## Files

- `hdr-glow.avif` is the HDR image asset.
- `index.html` is the self-contained demo page.

## Viewing

Use an HDR display. Enable HDR in the browser. A screenshot can convert the result to SDR. The page can still show HDR.

For more information about luma, relative luminance, and perceived lightness, read [Luma: Apple & Perceived Brightness](../luma.md).

<!-- This note does not conform to ASD-STE100 and does not need to. -->

> [!NOTE]
> My first encounter with the abuse of HDR display headroom was a text advertisement served by Bidbrain, a programmatic advertising infrastructure provider, which used this [HDR image](https://cdn.bidbrain.app/ext/hdr_glow/glow_white_1000_1784711334.avif) as its background.
