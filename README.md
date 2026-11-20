# lunchandlearn.page

Hosting for Lunch & Learn sites. Each person gets `lunchandlearn.page/<handle>/`: a home page of topic cards and one
article per lesson, with the lesson chips, layout and dark mode already done. You do not need a domain of your own.

A Lunch & Learn is a format: one design question a team keeps debating, every answer to it built for real, and an hour
to try them side by side. The format comes from Sam Peterson's [Lunch & Learn](https://lnl.sam-peterson.com).

This site hosts the articles. The working code for each topic stays in its author's own repository, and the topic links
to it. To build that code, start from the [Lunch & Learn kit](https://github.com/greg-m-k/lnl-template).

## Add yours

1. Fork this repository.
2. Add a folder `sites/<your-handle>/` with:
   - `site.json`: your title, intro, name, and your topics with their lessons;
   - `<topic>/<lesson>.md`: one Markdown article per lesson.

   `sites/example/` is a complete example, and its two articles explain each field.
3. Check it: `npm install`, then `npm run build`. The build names anything that needs fixing.
4. See it: `npm run dev` and open http://localhost:8830/&lt;your-handle&gt;/.
5. Open a pull request. It may change only your own folder. Once it is merged, your pages are live.

### site.json

```json
{
  "title": "Jane's Lunch & Learn",
  "author": { "name": "Jane Doe", "url": "https://example.com/jane" },
  "intro": "Questions my team keeps arguing about.",
  "topics": [
    {
      "slug": "retries", "emoji": "🔁", "title": "Retry vs Fail Fast",
      "summary": "When a call fails, try again or give up?",
      "code": "https://github.com/jane/retries-demo",
      "lessons": [
        { "slug": "start", "title": "Start here: the terms", "chip": "Start here", "blurb": "What a retry storm is." }
      ]
    }
  ]
}
```

- Handles, topic slugs and lesson slugs are lower-case words joined by hyphens. A few handles are reserved for the host.
- `author.url` and `code` must be `https` links. `emoji` and `chip` are optional.
- Each lesson needs its article at `<topic-slug>/<lesson-slug>.md`.

### What an article can contain

Markdown: headings, lists, tables, code, block quotes, images and links. Because everyone's articles share one site, raw
HTML is shown as text, links work only for `http(s)://` and paths on this site, and images load only from `https://`.

## Running the host

```
npm install
npm test          # the build's checks and the pages it writes
npm run dev       # builds, then serves dist/ at http://localhost:8830
npm run ui        # in a second terminal: walks every page in Edge (CHANNEL=chrome for Chrome)
```

`scripts/build.mjs` checks every site in `sites/` and writes static pages to `dist/`. Nothing is written unless every
site passes. The site is a Cloudflare Worker with static assets only (`wrangler.jsonc`); `npm run deploy` builds and
deploys it to lunchandlearn.page.

`.github/workflows/ci.yml` runs on every pull request: it checks that a contributor changed only one site folder, runs
the tests, builds, and walks every page in Chrome.
