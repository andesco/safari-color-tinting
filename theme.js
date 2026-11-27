// Appearance: "auto" follows the system; "light" and "dark" are saved.
// Runs first, so the page never paints in the wrong theme.
(() => {
    const KEY = 'safari-color-tinting:luma-theme';
    const system = matchMedia('(prefers-color-scheme: dark)');
    let choice = 'auto';
    try {
        const saved = localStorage.getItem(KEY);
        if (saved === 'light' || saved === 'dark') choice = saved;
    } catch { /* storage unavailable: follow the system */ }

    const apply = () => {
        const dark = choice === 'dark' || (choice === 'auto' && system.matches);
        document.body.classList.toggle('dark-theme', dark);
        document.body.classList.toggle('light-theme', !dark);
        if (choice === 'auto') delete document.documentElement.dataset.theme;
        else document.documentElement.dataset.theme = choice;
        // Only pages with highlighted code load these stylesheets
        const light = document.getElementById('hljs-light');
        const darker = document.getElementById('hljs-dark');
        if (light) light.media = dark ? 'not all' : 'all';
        if (darker) darker.media = dark ? 'all' : 'not all';
    };
    apply();
    system.addEventListener('change', apply);

    document.addEventListener('DOMContentLoaded', () => {
        const switcher = document.getElementById('theme-switch');
        switcher.querySelector(`input[value="${choice}"]`).checked = true;
        switcher.hidden = false;
        switcher.addEventListener('change', (event) => {
            choice = event.target.value;
            try {
                if (choice === 'auto') localStorage.removeItem(KEY);
                else localStorage.setItem(KEY, choice);
            } catch { /* storage unavailable: the choice lasts until reload */ }
            apply();
        });
    });
})();
