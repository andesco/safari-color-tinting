// Shared helpers for the test pages: apply a sample (CSS + HTML) to the page
// and show the same code, colored by the luma of the page color.
'use strict';

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Use the three colors saved by the demo page (localStorage, same site):
// body -> --page-color, fixed -> --bar-color, meta -> --second-color.
// run.py adds ?saved=0 so its results do not depend on saved colors.
const applySavedColors = () => {
    if (new URLSearchParams(location.search).get('saved') === '0') return;
    try {
        const saved = JSON.parse(localStorage.getItem('safari-color-tinting:colors')) || {};
        const map = { body: '--page-color', fixed: '--bar-color', meta: '--second-color' };
        for (const [name, variable] of Object.entries(map)) {
            if (/^#[0-9a-f]{6}$/i.test(saved[name] || '')) document.documentElement.style.setProperty(variable, saved[name]);
        }
    } catch { /* storage unavailable: keep the colors from tests.css */ }
};
applySavedColors();

// Light text on a dark page, dark text on a light page (luma.js, Rec. 709)
const applyTextColors = () => {
    const dark = getLuma(cssVar('--page-color')) <= 127.5;
    const root = document.documentElement.style;
    root.setProperty('--text-color', dark ? '#ffffff' : '#000000');
    root.setProperty('--code-background', dark ? 'rgba(0, 0, 0, 0.22)' : 'rgba(255, 255, 255, 0.45)');
};

const showSample = (title, sample) => {
    const main = document.querySelector('main');
    const h1 = Object.assign(document.createElement('h1'), { textContent: title });
    main.append(h1);
    for (const [label, code] of [['CSS', sample.css], ['HTML', sample.html]]) {
        if (!code) continue;
        const pre = document.createElement('pre');
        pre.className = 'sample';
        pre.append(Object.assign(document.createElement('span'), { className: 'label', textContent: label }), code.trim());
        main.append(pre);
    }
};

// Apply the sample: its CSS in a <style>, its HTML at the end of <body>
const applySample = (sample) => {
    if (sample.css) document.head.append(Object.assign(document.createElement('style'), { textContent: sample.css }));
    if (sample.html) document.body.insertAdjacentHTML('beforeend', sample.html);
};

const runSample = (title, sample) => {
    applyTextColors();
    showSample(title, sample);
    applySample(sample);
};
