// Safari Color Tinting demo
//
// One state object drives the page. On load it comes from sessionStorage when
// the tab is reloaded, else from the URL (a shared link), else the defaults with
// the three colors saved in localStorage. Nothing writes to the address bar;
// Share and Copy build a URL on demand. The test pages (tests/) read the same
// saved colors.

(() => {
'use strict';

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

// "08F", "0088ff", "#0088FF" → "#0088ff"; anything else → null
const parseHex = (value) => {
    let hex = String(value || '').trim().replace(/^#/, '').toLowerCase();
    if (/^[0-9a-f]{3}$/.test(hex)) hex = hex.replace(/./g, (c) => c + c);
    return /^[0-9a-f]{6}$/.test(hex) ? `#${hex}` : null;
};

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgbToHex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

// Rotate the hue of a hex color by `deg` degrees (HSL)
const spinHex = (hex, deg) => {
    const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h *= 60;
    }
    h = (h + deg + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
        : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return rgbToHex(...[r1, g1, b1].map((v) => Math.round((v + m) * 255)));
};

// Dark background (luma ≤ 127.5, see luma.js) → light text
const isDark = (hex) => getLuma(hex) <= 127.5;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const DEFAULTS = {
    body:  { on: true,  color: '#0088ff' },
    fixed: { on: true,  color: '#ffcc33' },
    meta:  { on: false, color: '#363636' },
    // Fixed element without tint: one technique at a time
    technique: '',           // '' | 'saturate' | 'blur' | 'opacity'
    // Tint without a visible element
    hide: '',                // '' | 'offscreen' | 'opacity' | 'hidden' | 'display'
    hiddenTop: false,        // top bar moved past the edge: 12px tall, 5px on screen
    hiddenBottom: false,     // bottom bar moved past the edge: 12px tall, 4px on screen
};
// WebKit hit-tests a point 4px inside each viewport edge (PageColorSampler::
// fixedContainerSampleRectMargin) and reads the background color only of a box
// more than 10px tall (thinBorderWidth), off-screen part included. A 12px bar
// must keep 5px on screen at the top and 4px at the bottom (measured in the
// iOS Simulator, iOS 26.4 and 27.2).
const HIDDEN_BAR_HEIGHT = 12;
const HIDDEN_OFFSET = { top: -7, bottom: -8 }; // 5px on screen at the top, 4px at the bottom

const BACKDROP = { saturate: 'saturate(100%)', blur: 'blur(0px)', opacity: 'opacity(1)' };
const TECHNIQUE_CODE = { saturate: 's', blur: 'b', opacity: 'o' };

const HIDE_CODE = { offscreen: 'x', opacity: 'o', hidden: 'h', display: 'd' };
// Off screen: both bars 12px tall, moved 12px past the edge (0px on screen)
const OFFSCREEN_OFFSET = -12;
const invert = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));

// Color param: "0088ff" (on) or "0,0088ff" (off). Legacy "1,0088ff" also means on.
const parseColorParam = (param) => {
    if (param == null) return null;
    const parts = param.split(',');
    const color = parseHex(parts.length === 2 ? parts[1] : parts[0]);
    const on = parts.length === 2 ? parts[0] === '1' : !/^(false|none|)$/i.test(param);
    return { on: on && !!color, color };
};

const stateFromURL = (search) => {
    const p = new URLSearchParams(search);
    const state = withSavedColors(structuredClone(DEFAULTS));
    const colors = {};
    for (const [key, name] of [['b', 'body'], ['f', 'fixed'], ['m', 'meta']]) {
        const parsed = parseColorParam(p.get(key));
        if (!parsed) continue;
        colors[name] = parsed;
        state[name].on = parsed.on;
        if (parsed.color) state[name].color = parsed.color;
    }

    // Only one color in the URL: derive the other two (180° hue rotation)
    const given = Object.keys(colors);
    if (given.length === 1 && colors[given[0]].color) {
        const complement = spinHex(colors[given[0]].color, 180);
        for (const name of ['body', 'fixed', 'meta']) {
            if (name !== given[0]) state[name] = { on: true, color: complement };
        }
    }

    state.technique = invert(TECHNIQUE_CODE)[p.get('nt')] || '';
    state.hide = invert(HIDE_CODE)[p.get('hide')] || '';
    // edge=t | b | tb. Older links: edge=<px on screen>, hb/ht=<bottom offset>
    const edge = p.get('edge') || '';
    if (/^\d+$/.test(edge)) {
        state.hiddenTop = Number(edge) >= 5;
        state.hiddenBottom = Number(edge) >= 4;
    } else {
        state.hiddenTop = edge.includes('t');
        state.hiddenBottom = edge.includes('b') || /^-?\d+$/.test(p.get('hb') ?? p.get('ht') ?? '');
    }

    if (state.hide === 'offscreen') state.hiddenTop = state.hiddenBottom = false;
    // Older links: bf, vis, at, bp, ps
    if (!state.technique) {
        const vis = p.get('vis') || '';
        state.technique = invert({ saturate: 's', blur: 'b', opacity: 'o' })[p.get('bf')] || '';
        if (!state.hide) state.hide = vis.includes('d') ? 'display' : vis.includes('o') ? 'opacity' : vis.includes('h') ? 'hidden' : '';
    }
    return state;
};

// One short parameter per option; options at their default are left out.
// When any color differs from the default, all three colors are written, so a
// hand-typed URL with a single color still derives the other two.
const urlFromState = (state) => {
    const color = ({ on, color }) => (on ? '' : '0,') + color.slice(1);
    const same = (name) => state[name].on === DEFAULTS[name].on && state[name].color === DEFAULTS[name].color;
    const params = [];
    if (!['body', 'fixed', 'meta'].every(same)) {
        params.push(`b=${color(state.body)}`, `f=${color(state.fixed)}`, `m=${color(state.meta)}`);
    }
    if (state.technique) params.push(`nt=${TECHNIQUE_CODE[state.technique]}`);
    if (state.hide) params.push(`hide=${HIDE_CODE[state.hide]}`);
    if (state.hiddenTop || state.hiddenBottom) params.push(`edge=${state.hiddenTop ? 't' : ''}${state.hiddenBottom ? 'b' : ''}`);
    return location.origin + location.pathname + (params.length ? `?${params.join('&')}` : '');
};

// Reload keeps the options and the scroll position (sessionStorage is per tab)
const STORAGE_KEY = 'safari-color-tinting';
const navigationType = performance.getEntriesByType('navigation')[0]?.type;
const loadSession = () => {
    try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
        return saved && saved.state && 'technique' in saved.state ? saved : null;
    } catch {
        return null;
    }
};
// The three colors persist in localStorage, across tabs and visits
const COLORS_KEY = 'safari-color-tinting:colors';
function withSavedColors(base) {
    try {
        const saved = JSON.parse(localStorage.getItem(COLORS_KEY));
        for (const name of ['body', 'fixed', 'meta']) {
            const color = parseHex(saved?.[name]);
            if (color) base[name].color = color;
        }
    } catch { /* storage unavailable or invalid: keep the defaults */ }
    return base;
}
const saveColors = () => {
    try {
        localStorage.setItem(COLORS_KEY, JSON.stringify({ body: state.body.color, fixed: state.fixed.color, meta: state.meta.color }));
    } catch { /* storage unavailable */ }
};

const saveSession = () => {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ state, scrollY: window.scrollY }));
    } catch { /* storage unavailable: reload falls back to the defaults */ }
};

const session = navigationType === 'reload' ? loadSession() : null;
const state = session ? { ...structuredClone(DEFAULTS), ...session.state } : stateFromURL(location.search);
if (!(state.technique in TECHNIQUE_CODE)) state.technique = '';
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const initialColors = { body: state.body.color, fixed: state.fixed.color, meta: state.meta.color };

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);
let topBar = $('top-bar');
let bottomBar = $('bottom-bar');
let bars = [topBar, bottomBar];

// Safari keeps using a fixed element it has sampled for as long as that
// element exists, so a change to its opacity, position or backdrop-filter does
// not update the tint. Replacing the bars with copies makes Safari sample
// them again (iPhone; on macOS and iPad the top edge stays locked until reload).
let barsKey = null;
const remountBars = () => {
    const key = JSON.stringify([state.fixed, state.technique, state.hide, state.hiddenTop, state.hiddenBottom]);
    if (barsKey !== null && key !== barsKey) {
        bars = bars.map((bar) => {
            const copy = bar.cloneNode(true);
            bar.replaceWith(copy);
            return copy;
        });
        [topBar, bottomBar] = bars;
    }
    barsKey = key;
};
const el = {
    code: $('code-gen-example'),
    topIndicator: $('top-indicator'),
    bottomIndicator: $('bottom-indicator'),
    hljsLight: document.querySelector('link[href*="github.min.css"]'),
    hljsDark: document.querySelector('link[href*="github-dark-dimmed.min.css"]'),
};
const picker = { body: $('color-picker-body'), fixed: $('color-picker-fixed'), meta: $('color-picker-meta') };
const checkbox = { body: $('checkbox-body'), fixed: $('checkbox-fixed'), meta: $('checkbox-meta') };
// Option groups: checkboxes with data-group="technique" | "hide" and a value
const groupBoxes = (group) => [...document.querySelectorAll(`input[data-group="${group}"]`)];
const hiddenTopBox = $('hidden-top');
const hiddenBottomBox = $('hidden-bottom');

// ---------------------------------------------------------------------------
// Presets: native <datalist> suggestions in the browser's color picker
// ---------------------------------------------------------------------------

const PALETTE = ['#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545', '#fd7e14',
                 '#ffc107', '#198754', '#20c997', '#0dcaf0', '#212529', '#f8f9fa'];

const setPresets = (input, first) => {
    let list = $(`${input.id}-presets`);
    if (!list) {
        list = document.createElement('datalist');
        list.id = `${input.id}-presets`;
        input.after(list);
        input.setAttribute('list', list.id);
    }
    const colors = [...new Set([...first.filter(Boolean), ...PALETTE])];
    list.replaceChildren(...colors.map((c) => Object.assign(document.createElement('option'), { value: c })));
};

const renderPresets = () => {
    const complement = spinHex(state.body.color, 180);
    setPresets(picker.body, [DEFAULTS.body.color, initialColors.body]);
    setPresets(picker.fixed, [DEFAULTS.fixed.color, initialColors.fixed, complement]);
    setPresets(picker.meta, [DEFAULTS.meta.color, initialColors.meta, complement]);
};

// ---------------------------------------------------------------------------
// Render: apply state to the page
// ---------------------------------------------------------------------------

// Set an inline style property only when its value changes, so an unrelated
// update never touches the elements Safari samples.
const setStyle = (node, prop, value) => {
    if (node && node.style.getPropertyValue(prop) !== value) {
        if (value) node.style.setProperty(prop, value);
        else node.style.removeProperty(prop);
    }
};

const pageIsDark = () => state.body.on && isDark(state.body.color);

const renderControls = () => {
    for (const name of ['body', 'fixed', 'meta']) {
        picker[name].value = state[name].color;
        checkbox[name].checked = state[name].on;
        const label = document.querySelector(`[data-hex-for="${picker[name].id}"]`);
        if (label) label.textContent = state[name].color.toUpperCase();
    }
    for (const box of groupBoxes('technique')) box.checked = state.technique === box.value;
    for (const box of groupBoxes('hide')) box.checked = state.hide === box.value;

    hiddenTopBox.checked = state.hiddenTop;
    hiddenBottomBox.checked = state.hiddenBottom;

};

const renderBody = () => {
    setStyle(document.body, 'background-color', state.body.on ? state.body.color : '');
    const dark = pageIsDark();
    document.body.classList.toggle('dark-theme', dark);
    document.body.classList.toggle('light-theme', !dark);
    if (el.hljsLight && el.hljsDark) {
        el.hljsLight.disabled = dark;
        el.hljsDark.disabled = !dark;
    }
};

const renderMeta = () => {
    let tag = document.querySelector('meta[name="theme-color"]');
    if (!state.meta.on) {
        if (tag) tag.remove();
        return;
    }
    if (!tag) {
        tag = Object.assign(document.createElement('meta'), { name: 'theme-color' });
        document.head.append(tag);
    }
    if (tag.content !== state.meta.color) tag.content = state.meta.color;
};

// Both fixed bars get the same options; the bottom bar can also be hidden
const renderBars = () => {
    const color = state.fixed.color;
    const t = state.technique;
    for (const bar of bars) {
        setStyle(bar, 'display', !state.fixed.on || state.hide === 'display' ? 'none' : '');
        setStyle(bar, 'background-color', color);
        setStyle(bar, 'backdrop-filter', BACKDROP[t] || '');
        setStyle(bar, '-webkit-backdrop-filter', BACKDROP[t] || '');
        setStyle(bar, 'opacity', state.hide === 'opacity' ? '0' : '');
        setStyle(bar, 'visibility', state.hide === 'hidden' ? 'hidden' : '');
    }
    // Hidden bars: 12px tall, full width, moved past the edge so only a sliver
    // in the tint color stays on screen, next to Safari's status bar and toolbar
    const offscreen = state.hide === 'offscreen';
    for (const [bar, side, narrow] of [[topBar, 'top', state.hiddenTop], [bottomBar, 'bottom', state.hiddenBottom]]) {
        const offset = offscreen ? OFFSCREEN_OFFSET : narrow ? HIDDEN_OFFSET[side] : null;
        setStyle(bar, side, offset === null ? '' : `${offset}px`);
        setStyle(bar, 'min-height', offset === null ? '' : `${HIDDEN_BAR_HEIGHT}px`);
        setStyle(bar, 'height', offset === null ? '' : `${HIDDEN_BAR_HEIGHT}px`);
        setStyle(bar, 'width', offset === null ? '' : '100%');
    }

    // On-screen note for each bar: off, Narrow or Hidden
    const hidden = state.fixed.on && !!state.hide;
    for (const [pill, arrow, narrow] of [[el.topIndicator, '↑', state.hiddenTop], [el.bottomIndicator, '↓', state.hiddenBottom]]) {
        const label = hidden ? 'Hidden' : narrow ? 'Narrow' : '';
        pill.hidden = !label;
        pill.textContent = label ? `${arrow} ${label} Element Enabled` : '';
        pill.parentElement.classList.toggle('on-dark', pageIsDark());
    }
};

// Example code for the current options (the code block scrolls; height is fixed)
const renderCode = () => {
    if (!el.code) return;
    const color = state.fixed.color;
    const t = state.technique;
    const css = ['.fixed-bar { position: fixed; left: 0; width: 90%; min-height: 15px; }'];
    const lines = ['<head>'];
    if (state.meta.on) lines.push(`  <meta name="theme-color" content="${state.meta.color}">`);
    lines.push(...css.map((rule) => `  <style>${rule}</style>`), '</head>',
        `<body${state.body.on ? ` style="background-color: ${state.body.color};"` : ''}>`);

    if (state.fixed.on) {
        const props = [`background-color: ${color};`];
        if (BACKDROP[t]) props.push(`backdrop-filter: ${BACKDROP[t]};`);
        if (state.hide === 'opacity') props.push('opacity: 0;');
        if (state.hide === 'hidden') props.push('visibility: hidden;');
        if (state.hide === 'display') props.push('display: none;');
        const size = ` width: 100%; min-height: ${HIDDEN_BAR_HEIGHT}px;`;
        const offscreen = state.hide === 'offscreen';
        const top = offscreen ? `top: ${OFFSCREEN_OFFSET}px;${size}` : state.hiddenTop ? `top: ${HIDDEN_OFFSET.top}px;${size}` : 'top: 4px;';
        const bottom = offscreen ? `bottom: ${OFFSCREEN_OFFSET}px;${size}` : state.hiddenBottom ? `bottom: ${HIDDEN_OFFSET.bottom}px;${size}` : 'bottom: 3px;';
        lines.push(`  <div id="top-bar" class="fixed-bar" style="${top} ${props.join(' ')}"></div>`,
            `  <div id="bottom-bar" class="fixed-bar" style="${bottom} ${props.join(' ')}"></div>`);
    }
    lines.push('</body>');

    el.code.textContent = lines.join('\n');
    delete el.code.dataset.highlighted;
    if (window.hljs) hljs.highlightElement(el.code);
};

const render = () => {
    renderControls();
    renderBody();
    renderMeta();
    renderBars();
    remountBars();
    renderCode();
    saveSession();
    saveColors();
};

// A change that Safari may only pick up on reload: show the "↻ Reload" button.
// Reloading keeps the options and the scroll position (sessionStorage).
const reloadButton = $('reload-button');
const showRefreshHint = () => { reloadButton.hidden = false; };
reloadButton.addEventListener('click', () => {
    saveSession();
    location.reload();
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

for (const name of ['body', 'fixed', 'meta']) {
    // "input" fires live while the native picker is open
    picker[name].addEventListener('input', () => {
        const color = parseHex(picker[name].value);
        if (!color) return;
        state[name].color = color;
        if (name === 'body') renderPresets();
        if (name === 'fixed') showRefreshHint(picker[name]);
        render();
    });
    checkbox[name].addEventListener('change', () => {
        state[name].on = checkbox[name].checked;
        if (name === 'fixed') showRefreshHint(checkbox[name]);
        render();
    });
}

// Each group allows one option at a time: checking one clears the others
for (const group of ['technique', 'hide']) {
    for (const box of groupBoxes(group)) {
        box.addEventListener('change', () => {
            state[group] = box.checked ? box.value : '';
            // Off screen replaces the Narrow options
            if (state.hide === 'offscreen') state.hiddenTop = state.hiddenBottom = false;
            showRefreshHint(box);
            render();
        });
    }
}

hiddenTopBox.addEventListener('change', () => {
    state.hiddenTop = hiddenTopBox.checked;
    if (state.hiddenTop && state.hide === 'offscreen') state.hide = '';
    showRefreshHint(hiddenTopBox);
    render();
});
hiddenBottomBox.addEventListener('change', () => {
    state.hiddenBottom = hiddenBottomBox.checked;
    if (state.hiddenBottom && state.hide === 'offscreen') state.hide = '';
    showRefreshHint(hiddenBottomBox);
    render();
});


// Share and Copy build the URL from the state when used
const copyText = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const area = Object.assign(document.createElement('textarea'), { value: text });
        area.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
        document.body.append(area);
        area.select();
        document.execCommand('copy');
        area.remove();
    }
};

$('shareButton')?.addEventListener('click', async () => {
    const url = urlFromState(state);
    if (navigator.share && window.isSecureContext) {
        try {
            await navigator.share({ url });
        } catch (error) {
            if (error.name !== 'AbortError') copyText(url);
        }
    } else {
        copyText(url);
    }
});

$('copyButton')?.addEventListener('click', () => copyText(urlFromState(state)));

// Reset every option: forget the saved colors and options, then load the
// page without parameters (a fresh load also clears Safari's top edge lock)
$('resetButton')?.addEventListener('click', () => {
    try {
        localStorage.removeItem(COLORS_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
    } catch { /* storage unavailable */ }
    window.removeEventListener('pagehide', saveSession);
    window.scrollTo(0, 0);
    location.replace(location.pathname);
});

// ---------------------------------------------------------------------------
// Static page setup
// ---------------------------------------------------------------------------

// Replace "›" in settings text with an SVG chevron
const CHEVRON = '<svg style="position:relative;top:0.15em;" width="1em" height="1em" viewBox="0 0 16 16"><path fill="currentColor" d="M5.0 3.0 L10.2 8.0 L5.0 13.0 L6.4 14.4 L12.8 8.0 L6.4 1.6 Z"/></svg>';
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
const chevronNodes = [];
while (walker.nextNode()) if (walker.currentNode.nodeValue.includes('›')) chevronNodes.push(walker.currentNode);
for (const node of chevronNodes) {
    const span = document.createElement('span');
    span.innerHTML = node.nodeValue.replace(/›/g, CHEVRON);
    node.replaceWith(span);
}

// Hide the notice in Safari 15+
const notice = $('not-safari-notice');
const ua = navigator.userAgent;
const safariVersion = Number((ua.match(/Version\/(\d+)/) || [])[1] || 0);
if (notice && /Apple/.test(navigator.vendor) && !/Chrome|CriOS|FxiOS/.test(ua) && safariVersion >= 15) {
    notice.style.display = 'none';
}

renderPresets();
render();
if (window.hljs) hljs.highlightAll();

// Restore the scroll position of a reload, and keep it up to date
if (session && Number.isFinite(session.scrollY)) {
    window.scrollTo(0, session.scrollY);
    window.addEventListener('load', () => window.scrollTo(0, session.scrollY), { once: true });
}
window.addEventListener('pagehide', saveSession);
let scrollTimer = 0;
window.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(saveSession, 150);
}, { passive: true });
})();
