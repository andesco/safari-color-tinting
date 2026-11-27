# Dev Notes

## Deployment

Cloudflare Pages uploads only `public/` (`pages_build_output_dir` in `wrangler.toml`). It uploads files there even if Git ignores them. Keep private files out of `public/`.

- Preview: `npm run dev`
- Deploy: `npm run deploy`

Do not pass a directory to `wrangler pages deploy`. A push to GitHub does not deploy.

## HDR glow documentation

Use ASD-STE100 Simplified Technical English for `public/hdr-glow/README.md`.

Use short sentences and active voice. Write only one topic in each paragraph.

Keep the HDR explanation and the live demo files in the `public/hdr-glow` directory.

The old `/Users/Andrew/Sites/static.andrewe.dev/hdr-glow` repository is deprecated. Do not publish files from that repository.

Link from `public/hdr-glow/README.md` to `luma.md`. Do not add a link from `luma.md` to `public/hdr-glow/README.md`.

## References

Blog posts that link to this repo and document Safari color tinting behavior:

- https://jahir.dev/blog/safari-toolbar
- https://www.1ar.io/updates/safari-26-liquid-glass-web
- https://benfrain.com/ios26-safari-theme-color-tab-tinting-with-fixed-position-elements/
