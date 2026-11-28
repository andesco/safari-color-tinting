# Known Quirks

[Safari Color Tinting](/readme.md) › Quirks

Known cases where Safari does not tint as the [rules](/readme.md#rules) in the README say. Each section has a demo.

## Stuck Tint After a Theme Change

On iPhone, Safari 26 and later tints the strip at the bottom of the screen, behind the address bar, with the `background-color` of `<body>`. It follows the color when the page changes it.

### When It Happens

All of these are true:

- A `position: fixed` element touches the bottom edge: `bottom: 0` and the full width.
- The element has no `background-color` of its own.
- A child of the element has a `background-color`, for example a button or a label.
- The center of the element is empty, and the empty area is less than 90% as wide as the screen.
- JavaScript then changes the `<body>` `background-color`, for example in a light and dark theme switch.

The bottom strip keeps the first body color. The top of the screen and the page change.

Not affected:

- The same element at `bottom: 100px`.
- A fixed element with no children that have a `background-color`.

### Example

```html
<body style="background-color: #0000ff;">
<div id="bar">
  <div class="chip">Menu</div>
  <div class="space"></div>
</div>
<script>
  setTimeout(() => {
    document.body.style.backgroundColor = '#cc0000';
  }, 4000);
</script>
</body>
```

```css
#bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 5rem;
  text-align: center;
  font-size: 0;
}
.chip {
  display: inline-block;
  vertical-align: bottom;
  padding: 2px;
  font-size: 14px;
  background-color: yellow;
}
.space {
  display: inline-block;
  width: 80%;
  height: 5rem;
}
```

After 4 seconds the page turns red. The bottom strip stays blue.

### Does Not Help

- Replacing the element: `el.replaceWith(el.cloneNode(true))`
- Toggling `display`
- Adding a `backdrop-filter` to the element or to the empty area
- Nudging `bottom` by 1px
- Leaving Safari and returning

### Workarounds

Remove the element, then append it again about 500 ms later:

```js
document.body.style.backgroundColor = '#cc0000';
bar.remove();
setTimeout(() => document.body.append(bar), 500);
```

Give the fixed element a `background-color`, and change it together with the body:

```js
document.body.style.backgroundColor = '#cc0000';
bar.style.backgroundColor = '#cc0000';
```

The user can also open the tab overview and return to the tab. This is tested on iOS 27.2 only.

### Tested

iPhone Safari on iOS 26.4 and iOS 27.2 (simulator).

### WebKit Bug

[Bug 333402](https://bugs.webkit.org/show_bug.cgi?id=333402)

### Demo

[Known Quirks: Demo](https://safari-color-tinting.pages.dev/quirks)

[Safari Color Tinting](/readme.md) › Quirks
