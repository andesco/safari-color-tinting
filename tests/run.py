#!/usr/bin/env python3
"""Run the tint tests in an iOS Simulator and compare with cases.json.

Opens each test page in Safari (a fresh load, no interaction), takes a
screenshot, and reads the color of the status bar (top) and the toolbar
area (bottom) at the right edge of the screen. Colors come from tests.css.

    python3 tests/run.py --udid <simulator UDID> [--base URL] [--only REGEX]

Requires macOS with Xcode (xcrun simctl) and a booted simulator. Website
tinting must be on (Settings > Apps > Safari > Tabs: Allow Website Tinting).
"""
import argparse, json, re, struct, subprocess, sys, tempfile, time
from pathlib import Path

# The test pages, their colors and the expected results are part of the site
PAGES = Path(__file__).resolve().parent.parent / 'public' / 'tests'
TOLERANCE = 40


def css_colors():
    """Named colors from tests.css, including the scrim mixed over the page."""
    css = (PAGES / 'tests.css').read_text()

    def hex_var(name):
        m = re.search(rf'--{name}:\s*#([0-9a-fA-F]{{6}})', css)
        return tuple(int(m.group(1)[i:i + 2], 16) for i in (0, 2, 4))

    def percent_var(name):
        return float(re.search(rf'--{name}:\s*([0-9.]+)%', css).group(1)) / 100

    colors = {name: hex_var(f'{name}-color') for name in ('page', 'bar', 'second')}
    for mode in ('light', 'dark'):
        scrim, alpha = hex_var(f'scrim-{mode}-color'), percent_var(f'scrim-{mode}-opacity')
        colors[f'scrim-{mode}'] = tuple(round(s * alpha + p * (1 - alpha)) for s, p in zip(scrim, colors['page']))
    scrim, alpha = hex_var('demo-scrim-color'), percent_var('demo-scrim-opacity')
    colors['scrim-demo'] = tuple(round(s * alpha + p * (1 - alpha)) for s, p in zip(scrim, colors['page']))
    colors['sheet'] = hex_var('sheet-color')
    return colors


def read_bmp(path):
    """Decode an uncompressed 24/32-bit BMP (sips output) into rows of RGB."""
    data = Path(path).read_bytes()
    offset, = struct.unpack_from('<I', data, 10)
    width, height = struct.unpack_from('<ii', data, 18)
    bpp, = struct.unpack_from('<H', data, 28)
    step = bpp // 8
    stride = (width * step + 3) & ~3
    bottom_up = height > 0
    height = abs(height)

    def pixel(x, y):
        row = height - 1 - y if bottom_up else y
        i = offset + row * stride + x * step
        b, g, r = data[i], data[i + 1], data[i + 2]
        return r, g, b
    return width, height, pixel


def median_color(pixel, xs, ys):
    samples = [pixel(x, y) for x in xs for y in ys]
    return tuple(sorted(c[i] for c in samples)[len(samples) // 2] for i in range(3))


def classify(rgb, colors):
    """Nearest named color, or 'other' if none is within TOLERANCE per channel."""
    distance = lambda ref: max(abs(a - b) for a, b in zip(rgb, ref))
    name = min(colors, key=lambda n: distance(colors[n]))
    return name if distance(colors[name]) <= TOLERANCE else 'other'


def set_appearance(udid, appearance):
    subprocess.run(['xcrun', 'simctl', 'ui', udid, 'appearance', appearance], check=True)


def measure(udid, url, wait, workdir):
    subprocess.run(['xcrun', 'simctl', 'openurl', udid, url], check=True)
    time.sleep(wait)
    png, bmp = workdir / 'shot.png', workdir / 'shot.bmp'
    subprocess.run(['xcrun', 'simctl', 'io', udid, 'screenshot', str(png)], check=True, capture_output=True)
    subprocess.run(['sips', '-s', 'format', 'bmp', str(png), '--out', str(bmp)], check=True, capture_output=True)
    width, height, pixel = read_bmp(bmp)
    xs = range(width - 6, width - 2)
    top = median_color(pixel, xs, range(4, 12))
    bottom = median_color(pixel, xs, range(height - 12, height - 4))
    return top, bottom


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--udid', required=True, help='simulator UDID (xcrun simctl list devices)')
    ap.add_argument('--base', default='https://safari-color-tinting.pages.dev/tests/', help='URL of the tests folder')
    ap.add_argument('--only', default='', help='run only cases whose id matches this regular expression')
    ap.add_argument('--wait', type=float, default=6, help='seconds to wait after each page load')
    args = ap.parse_args()

    colors = css_colors()
    cases = [c for c in json.loads((PAGES / 'cases.json').read_text())['cases'] if re.search(args.only, c['id'])]
    base = args.base if args.base.endswith('/') else args.base + '/'
    failures = 0
    # Warm-up load: the first page after Safari launches can be captured before
    # it has drawn anything (a black screen)
    subprocess.run(['xcrun', 'simctl', 'openurl', args.udid, base + 'index.html'], check=True)
    time.sleep(args.wait)
    with tempfile.TemporaryDirectory() as tmp:
        appearance = None
        for case in cases:
            wanted = case.get('appearance', 'light')
            if wanted != appearance:
                set_appearance(args.udid, wanted)
                appearance = wanted
            # saved=0: use the colors from tests.css, not colors saved on the demo page
            url = base + case['url'] + ('&' if '?' in case['url'] else '?') + 'saved=0'
            top, bottom = measure(args.udid, url, args.wait, Path(tmp))
            got = {'top': classify(top, colors), 'bottom': classify(bottom, colors)}
            ok = got == case['expected']
            failures += not ok
            print(f"{'ok  ' if ok else 'FAIL'} {case['id']:<26} top {got['top']:<11} bottom {got['bottom']:<11}"
                  + ('' if ok else f"  expected {case['expected']['top']}/{case['expected']['bottom']}  rgb {top} {bottom}"))
    set_appearance(args.udid, 'light')
    print(f'\n{len(cases) - failures}/{len(cases)} passed')
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
