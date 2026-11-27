# Tests

The test pages are in [`public/tests/`](../public/tests/). The runner is in this folder.

These pages test when Safari tints its user interface from a fixed element. Each page puts a bar at the top and the bottom edge of the viewport.

- [`index.html`](../public/tests/index.html) lists every test and the expected tint.
- [`edge.html`](../public/tests/edge.html) tests the size and position of a bar: `?h=` height, `?v=` pixels on screen, `?w=` width in percent, `?e=t`, `b` or `tb` for the edges.
- [`element.html`](../public/tests/element.html) tests the structure of a bar: `?test=child`, `?test=colored-element-before` and more.
- [`scrim.html`](../public/tests/scrim.html) opens a dialog over a blurred scrim: `?edges=1` with a strip at each edge in the color of the scrim over the page, `?edges=0` without.
- [`cases.json`](../public/tests/cases.json) has the expected results, measured in the iOS Simulator (iOS 26.4 and 27.2).
- [`tests.css`](../public/tests/tests.css) has the default colors as variables: `--page-color`, `--bar-color` and `--second-color`. The pages use the colors saved on the demo page instead (Body Background, Fixed Position Background and Meta Theme Color). Add `saved=0` to the URL to use the defaults.

Each page shows the CSS and HTML that it applies.

## Run in the iOS Simulator

Boot an iPhone simulator, then run:

```sh
python3 tests/run.py --udid <simulator UDID>
```

The script opens each page, takes a screenshot, and reads the color of the status bar and the toolbar area. It compares the colors with `cases.json` and prints the result. Use `--base` to test a different deployment and `--only` to run some of the tests.
