<img src="images/safari-macOS-26.png" alt="Safari macOS Tab Bar" style="max-width: 551px; display: block; margin: 0 auto;">

# Safari Color Tinting

Apple has quietly abandoned support for using `<meta name="theme-color">` to set the color of Safari browser UI, in favor of using the `background-color` of standard page element.

View how your web browser supports color in its UI:

### [Safari Color Tinting: Demo](http://safari-color-tinting.pages.dev "Safari Color Tinting: Demo")

## Safari 15+: `<meta>`
Safari versions 15 through 18.6 supported a <nobr><code>theme-color</code></nobr> meta tag, allowing developers to directly declare the color of browser UI elements.

```html
<head>
<meta name="theme-color" content="#0044FF">
</head>
```
> While Safari 26+ still parses the <nobr><code>theme-color</code></nobr> meta tag, [Safari no longer uses this color][caniuse].

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

Safari re-samples `body` as needed. WebKit has a live observer that directly updates the the color of Safari UI as it changes.

If no `<body>` background-color is set, Safari falls back to the `<html>` element's background-color. If neither is set, Safari defaults to white in light mode and black in dark mode.

> [!NOTE]
> `viewport-fit=cover` in the viewport meta tag is required for controlling the bottom bar tint and for `env(safe-area-inset-*)` CSS environment variables to work, particularly for home-screen web apps.

### `{position: fixed | sticky;}`

If a qualifying `fixed` or `sticky` element exists with a <nobr><code>background-color</code></nobr>, it takes priority over `<body>`. Safari will sample an element that is:

* within 4 pixels from the top **`OR`**
* 3 pixels from the bottom on iOS **`OR`**
* partially off-screen (up to `bottom: -8px` with `min-height: 12px` still sampled)

- at least 80% wide on iOS **`OR`**
- at least 90% wide on macOS

* at least 3 pixels high

```html
<div style="position: fixed; top: 4px; width: 90%; background-color: #F70;">
```
```css
div { position: sticky; top: 0; width: 90%; background-color: #F70; }
```

### Sampling Details

Safari tinting has several edge cases: elements that are not sampled, properties that prevent sampling, and properties that still result in sampling.

#### NOT SAMPLED:

* `position: absolute` children inside fixed or sticky parents
*  pseudo-elements `::before` `::after` on fixed or sticky elements
* `display: none`
* `backdrop-filter`: `opacity: 0.9` `saturate(50%)` `blur(8px)`

#### SAMPLED:

* `visibility: hidden`
* `pointer-events: none`

## [**Luma: Apple & Perceived Brightness**][luma]

Safari uses the [luma] (perceived brightness) of the selected color to determine if the browser UI text should be dark or light.

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

[caniuse]: https://caniuse.com/meta-theme-color
[luma]: luma.md