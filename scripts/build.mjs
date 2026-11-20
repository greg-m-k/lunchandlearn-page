// Build lunchandlearn.page: check every site in sites/, then write static pages to dist/.
//   /                              the hub: what this is, how to add yours, every hosted Lunch & Learn
//   /<handle>/                     one person's Lunch & Learn: topics, each with a card per lesson
//   /<handle>/<topic>/<lesson>/    one article, with the topic's lessons as chips
// Contributors send sites/<handle>/site.json plus one Markdown file per lesson. Everything they send is
// checked here, once, and treated as untrusted: raw HTML is shown as text and only http(s) links work.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync, cpSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";

const HANDLE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG = HANDLE;
const RESERVED = new Set(["about", "admin", "api", "assets", "new", "site", "sites", "static", "styles", "www", "help"]);
const LIMIT = { title: 80, text: 600, lessons: 30, topics: 10 };
const HOST = { name: "Greg Kitchen", url: "https://greg.kitchen" };
const REGISTRY = "https://github.com/greg-m-k/lunchandlearn-page";
const KIT = "https://github.com/greg-m-k/lnl-template";
const ORIGIN = "https://lnl.sam-peterson.com";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const https = (u) => typeof u === "string" && /^https:\/\/[^\s"'<>]+$/.test(u);
// A link in an article: http(s), a path on this site, or a #fragment. Nothing with another scheme.
const safeHref = (u) => (/^(https?:\/\/|\/(?!\/)|#)/i.test(u) || !/^[a-z][a-z0-9+.-]*:|^\/\//i.test(u) ? u : null);

// ---- Checking a contributor's site -----------------------------------------------------------
// Returns a list of problems in plain words; an empty list means the site builds.
export function checkSite(handle, site, articles) {
  const problems = [];
  const need = (ok, msg) => { if (!ok) problems.push(msg); };
  const text = (v, max = LIMIT.text) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
  need(HANDLE.test(handle) && handle.length <= 30, `the handle "${handle}" must be lower-case letters and digits joined by hyphens, at most 30 characters`);
  need(!RESERVED.has(handle), `the handle "${handle}" is reserved for the host`);
  need(text(site?.title, LIMIT.title), `site.json needs a title of at most ${LIMIT.title} characters`);
  need(text(site?.intro), `site.json needs an intro of at most ${LIMIT.text} characters`);
  need(text(site?.author?.name, LIMIT.title), "site.json needs author.name");
  need(site?.author?.url === undefined || https(site.author.url), "author.url must be an https link");
  const topics = Array.isArray(site?.topics) ? site.topics : [];
  need(topics.length > 0 && topics.length <= LIMIT.topics, `site.json needs 1 to ${LIMIT.topics} topics`);
  const topicSlugs = new Set();
  for (const t of topics) {
    const name = t?.slug ?? "?";
    need(SLUG.test(t?.slug ?? ""), `topic "${name}": slug must be lower-case words joined by hyphens`);
    need(!topicSlugs.has(t?.slug), `topic "${name}" is listed twice`);
    topicSlugs.add(t?.slug);
    need(text(t?.title, LIMIT.title), `topic "${name}" needs a title`);
    need(text(t?.summary), `topic "${name}" needs a summary`);
    need(t?.code === undefined || https(t.code), `topic "${name}": code must be an https link to the working code`);
    const lessons = Array.isArray(t?.lessons) ? t.lessons : [];
    need(lessons.length > 0 && lessons.length <= LIMIT.lessons, `topic "${name}" needs 1 to ${LIMIT.lessons} lessons`);
    const lessonSlugs = new Set();
    for (const l of lessons) {
      const where = `${name}/${l?.slug ?? "?"}`;
      need(SLUG.test(l?.slug ?? ""), `lesson "${where}": slug must be lower-case words joined by hyphens`);
      need(!lessonSlugs.has(l?.slug), `lesson "${where}" is listed twice`);
      lessonSlugs.add(l?.slug);
      need(text(l?.title, LIMIT.title), `lesson "${where}" needs a title`);
      need(text(l?.blurb), `lesson "${where}" needs a blurb`);
      need(articles.has(`${t?.slug}/${l?.slug}.md`), `lesson "${where}" needs its article at ${t?.slug}/${l?.slug}.md`);
    }
  }
  return problems;
}

// ---- Markdown, safely ---------------------------------------------------------------------------
const md = new Marked({ gfm: true });
md.use({
  renderer: {
    html({ text }) { return esc(text); },  // raw HTML in an article is shown, never run
    link({ href, title, tokens }) {
      const inner = this.parser.parseInline(tokens);
      const safe = safeHref(href);
      if (!safe) return inner;
      const external = /^https?:/i.test(safe) ? ' rel="nofollow noopener"' : "";
      return `<a href="${esc(safe)}"${title ? ` title="${esc(title)}"` : ""}${external}>${inner}</a>`;
    },
    image({ href, title, text }) {
      if (!/^https:\/\//i.test(href)) return esc(text);
      return `<img src="${esc(href)}" alt="${esc(text)}"${title ? ` title="${esc(title)}"` : ""} loading="lazy">`;
    },
  },
});
export const markdown = (source) => md.parse(source);

// ---- Pages ----------------------------------------------------------------------------------------
const page = ({ title, description = "", main, mainClass = "", footer }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">\n` : ""}<link rel="stylesheet" href="/styles.css">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='9' cy='16' r='6' fill='%232563eb'/%3E%3Ccircle cx='23' cy='16' r='6' fill='%2316a34a'/%3E%3C/svg%3E">
</head>
<body>
<main${mainClass ? ` class="${mainClass}"` : ""}>
${main}
</main>
${footer}
</body>
</html>
`;
const credit = (a) => `Made by ${a.url ? `<a href="${esc(a.url)}">${esc(a.name)}</a>` : esc(a.name)}.`;
const card = (href, title, blurb) =>
  `<li><a class="card" href="${href}"><h3>${esc(title)}</h3><p>${esc(blurb)}</p></a></li>`;

function hubPage(sites) {
  const list = sites.length
    ? `<ul class="cards">${sites.map(({ handle, site }) => card(`/${handle}/`, site.title,
        `${site.author.name} · ${site.topics.length} ${site.topics.length === 1 ? "topic" : "topics"}`)).join("\n")}</ul>`
    : "<p>None yet. Yours could be the first.</p>";
  return page({
    title: "Lunch & Learn", description: "Free hosting for Lunch & Learn sites.", mainClass: "home",
    main: `<header>
  <h1>Lunch &amp; Learn</h1>
  <p class="lead"><strong>A Lunch &amp; Learn is a format</strong>: one design question a team keeps debating, every answer
    to it built for real, and an hour to try them side by side. The format comes from Sam Peterson's
    <a href="${ORIGIN}">Lunch &amp; Learn</a>, the original site of this kind.</p>
  <p class="lead">This site hosts yours for free, at lunchandlearn.page/<em>you</em>/, so you do not need a domain of your own.
    You write the articles; the cards, lesson chips, layout and dark mode come with it. Your working code stays in your own
    repository, and each topic links to it.</p>
  <p class="lead">To add yours, open a pull request to <a href="${REGISTRY}">the registry</a> with a folder
    <code>sites/&lt;your-handle&gt;/</code>: a <code>site.json</code> and one Markdown file per article. The README has the steps.
    To build the runnable demos themselves, start from the <a href="${KIT}">Lunch &amp; Learn kit</a>.</p>
</header>
<section class="topic" aria-labelledby="hosted">
  <h2 id="hosted">Hosted here</h2>
  ${list}
</section>`,
    footer: `<footer class="site">${credit(HOST)}</footer>`,
  });
}

function sitePage(handle, site) {
  const topics = site.topics.map((t) => `<section class="topic" aria-labelledby="topic-${t.slug}">
  <h2 id="topic-${t.slug}">${t.emoji ? `<span aria-hidden="true">${esc(t.emoji)}</span> ` : ""}${esc(t.title)}</h2>
  <p>${esc(t.summary)}${t.code ? ` <a href="${esc(t.code)}">The working code for this topic</a>.` : ""}</p>
  <ul class="cards">
${t.lessons.map((l) => card(`/${handle}/${t.slug}/${l.slug}/`, l.title, l.blurb)).join("\n")}
  </ul>
</section>`).join("\n");
  return page({
    title: site.title, description: site.intro, mainClass: "home",
    main: `<header>
  <h1>${esc(site.title)}</h1>
  <p class="lead">${esc(site.intro)}</p>
</header>
${topics}`,
    footer: `<footer class="site">${credit(site.author)} Hosted on <a href="/">lunchandlearn.page</a>.</footer>`,
  });
}

function articlePage(handle, site, topic, lesson, html) {
  const chips = `<nav class="chips" aria-label="${esc(topic.title)} lessons"><a href="/${handle}/">← ${esc(site.title)}</a>${
    topic.lessons.map((l) => {
      const href = `/${handle}/${topic.slug}/${l.slug}/`;
      return `<a href="${href}"${l.slug === lesson.slug ? ' aria-current="page"' : ""}>${esc(l.chip ?? l.title)}</a>`;
    }).join("")}</nav>`;
  const i = topic.lessons.indexOf(lesson);
  const next = topic.lessons[i + 1];
  return page({
    title: `${lesson.title} · ${site.title}`, description: lesson.blurb, mainClass: "prose",
    main: `${chips}
<article>
${html}
</article>
${topic.code ? `<p class="status">The working code for this topic: <a href="${esc(topic.code)}">${esc(topic.code)}</a></p>\n` : ""}${
  next ? `<p class="next">Next: <a href="/${handle}/${topic.slug}/${next.slug}/">${esc(next.title)} →</a></p>\n` : ""}<footer>${credit(site.author)} Hosted on <a href="/">lunchandlearn.page</a>.</footer>`,
    footer: "",
  });
}

const notFound = () => page({
  title: "Not found · Lunch & Learn", mainClass: "home",
  main: `<header><h1>Not found</h1><p class="lead">There is no page here. <a href="/">See every Lunch &amp; Learn hosted on this site</a>.</p></header>`,
  footer: `<footer class="site">${credit(HOST)}</footer>`,
});

// ---- The build ------------------------------------------------------------------------------------
const pathOf = (p) => (p instanceof URL ? fileURLToPath(p) : p);
function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...filesUnder(full).map((f) => `${name}/${f}`));
    else out.push(name);
  }
  return out;
}

function write(file, text) {
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, text);
}

// Check every site first; write nothing unless all of them pass.
export function build({ sites: sitesDir, out: outDir, assets }) {
  sitesDir = pathOf(sitesDir); outDir = pathOf(outDir); assets = pathOf(assets);
  const sites = [], problems = [];
  for (const handle of existsSync(sitesDir) ? readdirSync(sitesDir).sort() : []) {
    const dir = join(sitesDir, handle);
    if (!statSync(dir).isDirectory()) continue;
    let site = null;
    try { site = JSON.parse(readFileSync(join(dir, "site.json"), "utf8")); } catch (e) { problems.push(`${handle}: site.json is missing or not valid JSON (${e.message})`); continue; }
    const articles = new Set(filesUnder(dir).filter((f) => f.endsWith(".md")));
    const found = checkSite(handle, site, articles);
    if (found.length) problems.push(...found.map((p) => `${handle}: ${p}`));
    else sites.push({ handle, dir, site });
  }
  if (problems.length) throw new Error(`These sites need fixing:\n- ${problems.join("\n- ")}`);

  rmSync(outDir, { recursive: true, force: true });
  cpSync(assets, outDir, { recursive: true });
  write(join(outDir, "index.html"), hubPage(sites));
  write(join(outDir, "404.html"), notFound());
  for (const { handle, dir, site } of sites) {
    write(join(outDir, handle, "index.html"), sitePage(handle, site));
    for (const t of site.topics) for (const l of t.lessons) {
      const html = markdown(readFileSync(join(dir, t.slug, `${l.slug}.md`), "utf8"));
      write(join(outDir, handle, t.slug, l.slug, "index.html"), articlePage(handle, site, t, l, html));
    }
  }
  return sites.map((s) => s.handle);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = new URL("../", import.meta.url);
  try {
    const built = build({ sites: new URL("sites/", root), out: new URL("dist/", root), assets: new URL("public/", root) });
    console.log(`built ${built.length} site(s): ${built.join(", ") || "none"} -> ${relative(process.cwd(), fileURLToPath(new URL("dist/", root)))}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
