<img src="images/safari-macOS-26.png" alt="Safari macOS Tab Bar" style="max-width: 551px; display: block; margin: 0 auto;">

# Safari Color Tinting

Safari tints its user interface to match the web page: the tab bar on macOS, and the status bar and the toolbar on iPhone and iPad. Safari 26 takes the color from the page itself: the `background-color` of `<body>`, or of a fixed or sticky element at the top or the bottom edge. Users can turn tinting off in the [Safari settings](#safari-settings).

Safari 15 to 18 used the `theme-color` meta tag instead. Safari 26 ignores it.

Safari uses the luma (perceived brightness) of the tint color to make the text in its user interface dark or light. Refer to [Luma: Apple & Perceived Brightness][luma].

View how your web browser supports color in its UI:

### [Safari Color Tinting: Demo](https://safari-color-tinting.pages.dev "Safari Color Tinting: Demo")

## Safari 26+: `<body>` or `{position: fixed | sticky;}`

Safari 26 now derives browser UI colors automatically:

### `<body>`

Safari 26 uses the <nobr><code>background-color</code></nobr> of the `<body>` element as the default source for browser UI color.

```html
<body style="background-color: #0088FF;">
```

```css
body { background-color: #0088FF; }
```

Safari re-samples `body` as needed. WebKit has a live observer that directly updates the color of Safari UI as it changes.

If no `<body>` background-color is set, Safari falls back to the `<html>` element's background-color. If neither is set, Safari defaults to white in light mode and black in dark mode.

### `{position: fixed | sticky;}`

An element with `position: fixed` or `position: sticky` and a `background-color` takes priority over `<body>` at the top or bottom edge.

#### Rules

Safari tints to match a fixed or sticky element when the element:

1. **covers the point 4px inside the edge**, at the horizontal center of the viewport. A bar at `top: 0` to `top: 4px`, or at `bottom: 0` to `bottom: 3px`, covers it.
2. **is at least 90% as wide as the viewport.** On iOS the exact minimum is 90% of the viewport width less 8px (about 88% on an iPhone). Use `width: 100%` to be safe.
3. **is more than 10px tall** (11px or more). A shorter bar works only when it is fully on screen and at least 6px tall, because Safari then samples its pixels instead of reading its color. Pixel samples can stay stale.
4. **is visible:** not `display: none`, not `visibility: hidden`, and not (nearly) transparent (`opacity` less than `0.1`).
5. **has no `backdrop-filter`**, on the element or on an ancestor. Any `backdrop-filter` stops sampling.

Safari keeps using a fixed element that it has sampled. A change to its `opacity`, `visibility`, position or `backdrop-filter` does not change the tint. To make Safari sample the element again, replace it with a copy: `bar.replaceWith(bar.cloneNode(true))`.

On macOS and iPad, the top edge stops updating after the user interacts with the page or scrolls it, until the page reloads.

Refer to [How WebKit Picks the Tint Color](/webkit.md) for the reasons, from the WebKit source code.

### Examples

A visible bar at the top:

```css
.top-bar { position: fixed; top: 0; left: 0; width: 100%; height: 44px; background-color: #F70; }
```

A sticky header:

```css
header { position: sticky; top: 0; width: 100%; background-color: #F70; }
```

**Tint without a visible element.** Use a bar taller than 10px, at full width, and move it past the edge. Keep 5px on screen at the top and 4px at the bottom. The sliver has the tint color and touches the status bar or the toolbar, so it looks like part of the Safari user interface.

```css
.tint-top    { position: fixed; left: 0; width: 100%; height: 12px; top: -7px;    background-color: #F70; }
.tint-bottom { position: fixed; left: 0; width: 100%; height: 12px; bottom: -8px; background-color: #F70; }
```

**Show a fixed element without tinting.** Add a neutral `backdrop-filter`:

```css
.toolbar { position: fixed; top: 0; width: 100%; background-color: #F70; backdrop-filter: saturate(100%); }
```

**These do not stop tinting:**

* a child with `position: absolute` that covers the sample point, is at least 90% as wide as the viewport and is more than 10px tall. Safari uses the color of the child, also when the parent has its own background color. A narrower child has no effect: Safari uses the color of the parent, or the page color when the parent has none.
* a pseudo-element (`::before` or `::after`) on an element with no background color. Safari then samples the pixels at the edge, and these include the pseudo-element.
* `pointer-events: none`

**A pseudo-element has no effect** when the fixed element has its own `background-color`: Safari uses the color of the element and ignores the pseudo-element.

**These stop tinting and hide the element:** `display: none`, `visibility: hidden`, `opacity: 0`.

> [!NOTE]
> `viewport-fit=cover` in the viewport meta tag is required for controlling the bottom bar tint and for `env(safe-area-inset-*)` CSS environment variables to work, particularly for home-screen web apps.

## Safari 15 to 18: `<meta>`
Safari versions 15 through 18.6 supported a <nobr><code>theme-color</code></nobr> meta tag, allowing developers to directly declare the color of browser UI elements.

```html
<head>
<meta name="theme-color" content="#0044FF">
</head>
```
> While Safari 26+ still parses the <nobr><code>theme-color</code></nobr> meta tag, [Safari no longer uses this color][caniuse].

## Safari Settings

Users can enable or disable browser UI color tinting in Safari 26:

<!-- :icon-chevron-right: &rsaquo; -->
<!-- :icon-checkbox: ✓ -->
**macOS**: Safari &rsaquo; Settings &rsaquo; Tabs &rsaquo; Appearance: <nobr>✓ Show color in tab bar</nobr>

**iOS**: Settings &rsaquo; Apps › Safari &rsaquo; Tabs: <nobr>Allow Website Tinting ✓</nobr>

&nbsp;

## Web Standards Documentation

The `theme-color` meta tag remains part of web standards:

- [MDN Documentation: `<meta>` tags](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta)
- [MDN Documentation: `theme-color`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/theme-color)
- [WHATWG HTML Specification: `theme-color`](https://html.spec.whatwg.org/multipage/semantics.html#meta-theme-color)

## License

[MIT](LICENSE) © 2025–2026 Andrew Escobar

[caniuse]: https://caniuse.com/meta-theme-color
[luma]: /luma.md