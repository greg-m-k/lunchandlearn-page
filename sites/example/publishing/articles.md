# What an article can contain

Articles are Markdown. You can use headings, lists, tables, `inline code`, code blocks, block quotes, images and links.

```js
// Code blocks keep their spacing and get their own background.
const [person, job] = await Promise.all([getPerson(id), getJob(id)]);
```

| You write | You get |
|---|---|
| `## Heading` | a section heading |
| `` `code` `` | inline code |
| `[text](https://...)` | a link |

## Left out on purpose

Everyone's articles share one site, so a few things are switched off:

- **Raw HTML** shows as text and never runs.
- **Links** work for `https://`, `http://` and paths on this site. Other kinds, such as `javascript:`, show as plain text.
- **Images** load only from `https://` addresses.

For anything interactive, link to your working code and let readers run it themselves.
