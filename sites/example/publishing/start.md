# Start here: what you send

Your Lunch & Learn lives at `lunchandlearn.page/<your-handle>/`. You send one folder, and this site turns it into pages
in the same style as every other Lunch & Learn here.

## The folder

```
sites/<your-handle>/
  site.json                  your title, intro, name, and your topics with their lessons
  <topic>/<lesson>.md        one Markdown article per lesson
```

`site.json` lists your topics in the order they appear. Each topic has a `slug`, a `title`, a one-line `summary`, an
optional `emoji`, an optional `code` link to the repository with its working code, and its `lessons`. Each lesson has a
`slug`, a `title`, an optional short `chip` for the lesson menu, and a one-sentence `blurb` for its card. This site's own
[site.json](https://github.com/greg-m-k/lunchandlearn-page/blob/main/sites/example/site.json) is a complete example.

## Sending it

1. Fork [the registry](https://github.com/greg-m-k/lunchandlearn-page) and add your folder.
2. Run `npm install` and `npm run build`. The build checks your folder and names anything it needs.
3. Open a pull request. The checks run again; once it is merged, your pages are live.

To change your Lunch & Learn later, open another pull request that touches only your folder.

## Where the working code goes

In your own repository. A Lunch & Learn is about running the patterns, so each topic should link to code a reader can
clone and run. The [Lunch & Learn kit](https://github.com/greg-m-k/lnl-template) is a starting point for that code: it
has the interactive lesson pages, measured timelines and the structure the articles here describe.
