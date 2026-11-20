# How WebKit Picks the Tint Color

[Safari Color Tinting](/readme.md) › WebKit

This page explains the [rules](/readme.md#rules) in the README from the WebKit source code: where Safari looks for a fixed or sticky element, which color it uses, and when it does not update the color. Use it when a fixed element does not tint as you expect.

## Sample point

[`LocalFrameView::fixedContainerEdges()`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/LocalFrameView.cpp) contracts the layout viewport by `fixedContainerSampleRectMargin = 4` px on each side ([`PageColorSampler.h`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/PageColorSampler.h)). It then hit-tests the midpoint of the top or the bottom edge of that rectangle. Only fixed and sticky layers take part in this hit test.

The hit test uses a 1×1px probe that extends down from the point, and `LayoutRect::intersects()` excludes the edge. Thus the top and the bottom differ by 1px:

| Edge | Probe | Minimum on screen |
|---|---|---|
| Top | rows 4 to 5 | 5px: the element must reach past row 4 |
| Bottom | rows H−4 to H−3 | 4px: the element must reach row H−4 |

## Height: color read or pixel sampling

WebKit reads the `background-color` of the element only if its border box is more than 10px tall and wide (`thinBorderWidth = 10`). The full height of the element counts, also the part that is off screen.

This also applies to a child at the sample point: a child that is 10px tall or less does not supply the color. The width rule in the next section applies to the child too.

For a shorter element, WebKit samples pixels ([`PageColorSampler::predominantColor()`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/PageColorSampler.cpp)). The sample area is 2 rows deep, just inside the 4px margin. WebKit takes 29 samples and needs one color in at least 20 of them. The element must cover both rows, so it must be at least 6px tall and fully on screen.

## Width

`compareWithViewportSize()` requires at least `minimumRatio = 0.9` of the contracted viewport width: 0.9 × (viewport width − 8px). On a 402px iPhone this is 354.6px, about 88.2%.

## Elements in the hit path

WebKit walks from the element at the sample point up to the fixed or sticky container. It uses the first visible `background-color` on the way, so a child that covers the point supplies the color, also when the container has its own background color. WebKit added this path in April 2025 and covers it with the layout test [`color-sampling-fixed-ancestor-with-relative-container.html`](https://github.com/WebKit/WebKit/blob/main/LayoutTests/fast/page-color-sampling/color-sampling-fixed-ancestor-with-relative-container.html): a fixed `<header>` with no background and a child with `position: absolute` that has one.

The hit test resolves a `::before` or `::after` pseudo-element to its element, so the walk does not see the color of the pseudo-element. If no element on the path has a color, WebKit samples pixels, and these include a child or a pseudo-element. Thus a pseudo-element supplies the color only when its element has no background color.

* `isHiddenOrNearlyTransparent()` skips an element with `visibility: hidden`, an opacity of less than 0.1, or no background and no children.
* A `backdrop-filter` on the path sets the result to `PredominantColorType::Multiple`, so Safari does not tint.
* The first hit test ignores `pointer-events`, so `pointer-events: none` has no effect.

## Changes to a sampled element

Safari keeps using a fixed element that it has sampled for as long as the element exists. On iPhone too, a change to its `opacity`, `visibility`, position or `backdrop-filter` does not change the tint. `display: none` takes effect immediately, because the element then has no renderer.

To make Safari sample the element again, replace it with a copy, or remove it and add it again:

```js
bar.replaceWith(bar.cloneNode(true));
```

The [demo](https://safari-color-tinting.pages.dev) does this when an option changes. A scrim strip works the same way: Safari picks it up when it is added and returns to the page color when it is removed.

## Top Edge Lock: macOS and iPad

On macOS and iPad, Safari stops resampling a fixed or sticky element at the top edge after the user interacts with the page or scrolls it. Safari keeps the color it sampled last until the next page load. On iPhone, Safari continues to resample, within the limits of [Changes to a sampled element](#changes-to-a-sampled-element).

WebKit decides if it can sample the top edge in [`Page::canSampleTopFixedContainerEdge()`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/Page.cpp):

```cpp
return settings().topContentInsetBackgroundCanChangeAfterScrolling()
    || (!frameView->wasEverScrolledExplicitlyByUserBelowTopEdge()
        && !m_userHasInteractedSinceLastPageLoadExcludingForcedUserGestures)
    || document->parsing();
```

Safari samples the top edge only when one of these conditions is true:

1. The `topContentInsetBackgroundCanChangeAfterScrolling` setting is on. [WebKit turns it on only for small-screen iOS devices (iPhone)](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/Shared/Cocoa/WebPreferencesDefaultValuesCocoa.mm). It is off on macOS and iPad.
2. The user has not scrolled the page below the top edge and has not interacted with the page since it loaded. A click, a tap or a key press is an interaction.
3. The document is still parsing.

When the top edge is locked, WebKit reuses the last sampled color for that edge. A change to the `background-color` of the fixed element then has no effect. A reload clears the lock.

WebKit reuses the last element only if that element still has a renderer and is visible ([`Page::updateFixedContainerEdges()`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/Page.cpp)). Thus `display: none` takes effect immediately, even when the top edge is locked: the element has no renderer, so Safari uses the page background. A property that keeps the element visible, such as `backdrop-filter: opacity(1)`, takes effect only after a reload.

The lock applies only to the top edge of fixed and sticky elements. The `<body>` background is not affected: Safari continues to follow changes to it on all platforms.

[Safari Color Tinting](/readme.md) › WebKit
