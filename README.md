# Portfolio

Glawen LaFleur's portfolio. Plain HTML, CSS and JavaScript with no build step.
The design plan is in [docs/portfolio-plan.md](docs/portfolio-plan.md).

## Run locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Add a project

1. In `index.html`, copy one `<li class="project">` block inside `.project-grid`.
2. Set the slug in the `id` and the tile's `href` (lowercase, hyphenated, unique).
3. Add `assets/projects/<slug>/cover.*` (square, about 800x800) and update the `src`.
4. Fill in the title, tagline, meta list and article.

No JavaScript changes are needed. Project details are moved into the modal
from the page, so write the article directly in `index.html`.

## Replace the placeholders

Search `index.html` for `TODO`: contact URLs, cover images, figure alt text,
and the Open Graph image and URL. The bio and project text are lorem ipsum.

## Structure

- `css/`: one file per cascade layer (`tokens`, `base`, `layout`, `components`, `states`), ordered by `layers.css`.
- `js/main.js`: theme control, project modal, view transitions, history/hash sync.
- `assets/fonts/`: Hanken Grotesk (variable), SIL Open Font License.

## Deploy

The site is static: upload the folder to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages).
