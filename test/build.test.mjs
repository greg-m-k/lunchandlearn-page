// The build: what it accepts from contributors, what it refuses, and the pages it writes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkSite, markdown, build } from "../scripts/build.mjs";

const site = (over = {}) => ({
  title: "Jane's Lunch & Learn",
  author: { name: "Jane Doe", url: "https://example.com/jane" },
  intro: "Questions my team keeps arguing about.",
  topics: [{
    slug: "retries", emoji: "🔁", title: "Retry vs Fail Fast", summary: "When a call fails, try again or give up?",
    code: "https://github.com/jane/retries-demo",
    lessons: [{ slug: "start", title: "Start here", blurb: "The terms." }, { slug: "storm", title: "The retry storm", blurb: "What happens at scale." }],
  }],
  ...over,
});
const articles = new Set(["retries/start.md", "retries/storm.md"]);

test("a well-formed site has no problems", () => {
  assert.deepEqual(checkSite("jane", site(), articles), []);
});

test("handles are lower-case words with hyphens, and some are reserved for the host", () => {
  assert.match(checkSite("Jane!", site(), articles).join(), /handle/);
  assert.match(checkSite("styles.css", site(), articles).join(), /handle/);
  assert.match(checkSite("about", site(), articles).join(), /reserved/);
});

test("every lesson needs its article, slugs are unique, and links are https", () => {
  assert.match(checkSite("jane", site(), new Set(["retries/start.md"])).join(), /retries\/storm\.md/);
  const dup = site();
  dup.topics[0].lessons.push({ slug: "start", title: "Again", blurb: "x" });
  assert.match(checkSite("jane", dup, articles).join(), /twice/);
  assert.match(checkSite("jane", site({ author: { name: "J", url: "javascript:alert(1)" } }), articles).join(), /https/);
  const code = site();
  code.topics[0].code = "http://insecure.example";
  assert.match(checkSite("jane", code, articles).join(), /https/);
  assert.match(checkSite("jane", site({ title: "" }), articles).join(), /title/);
});

test("markdown from contributors: raw HTML shows as text, and only http(s) and relative links work", () => {
  const html = markdown("Hi <script>alert(1)</script>\n\n[ok](https://x.dev) [bad](javascript:alert(1)) ![i](data:image/png;base64,AA)");
  assert.doesNotMatch(html, /<script/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<a href="https:\/\/x\.dev"/);
  assert.doesNotMatch(html, /javascript:/);
  assert.doesNotMatch(html, /data:image/);
  assert.match(markdown("`code` and\n\n```js\nlet a = 1 < 2;\n```"), /<code>code<\/code>[\s\S]*<pre><code class="language-js">let a = 1 &lt; 2;/);
});

test("build: the hub lists each site, a site shows one card per lesson, an article has chips and its author", () => {
  const root = mkdtempSync(join(tmpdir(), "lnl-"));
  const sites = join(root, "sites"), out = join(root, "dist");
  mkdirSync(join(sites, "jane", "retries"), { recursive: true });
  writeFileSync(join(sites, "jane", "site.json"), JSON.stringify(site()));
  writeFileSync(join(sites, "jane", "retries", "start.md"), "# Start here\n\nRetries help.");
  writeFileSync(join(sites, "jane", "retries", "storm.md"), "# Storm\n\nThey also hurt.");
  build({ sites, out, assets: new URL("../public/", import.meta.url) });

  const hub = readFileSync(join(out, "index.html"), "utf8");
  assert.match(hub, /href="\/jane\/"/);
  assert.match(hub, /Jane&#39;s Lunch &amp; Learn|Jane's Lunch &amp; Learn/);
  const home = readFileSync(join(out, "jane", "index.html"), "utf8");
  assert.equal(home.match(/class="card"/g).length, 2);
  assert.match(home, /href="https:\/\/github\.com\/jane\/retries-demo"/);
  const article = readFileSync(join(out, "jane", "retries", "storm", "index.html"), "utf8");
  assert.match(article, /<a href="\/jane\/retries\/storm\/" aria-current="page">The retry storm<\/a>/);
  assert.match(article, /Made by <a href="https:\/\/example\.com\/jane">Jane Doe<\/a>\. <a href="\/">lunchandlearn\.page<\/a> is made by <a href="https:\/\/lnl\.sam-peterson\.com">Sam Peterson<\/a> and <a href="https:\/\/greg\.kitchen">Greg Kitchen<\/a>\./);
  assert.match(hub, /<footer class="site">Made by <a href="https:\/\/lnl\.sam-peterson\.com">Sam Peterson<\/a> and <a href="https:\/\/greg\.kitchen">Greg Kitchen<\/a>\.<\/footer>/);
  assert.match(article, /They also hurt\./);
  assert.ok(existsSync(join(out, "styles.css")) && existsSync(join(out, "404.html")));
});

test("build: a site with problems stops the build and names them", () => {
  const root = mkdtempSync(join(tmpdir(), "lnl-"));
  mkdirSync(join(root, "sites", "about"), { recursive: true });
  writeFileSync(join(root, "sites", "about", "site.json"), JSON.stringify(site()));
  assert.throws(() => build({ sites: join(root, "sites"), out: join(root, "dist"), assets: new URL("../public/", import.meta.url) }),
    /about: .*reserved/s);
});

test("the sites in this repository build", () => {
  const out = mkdtempSync(join(tmpdir(), "lnl-"));
  build({ sites: new URL("../sites/", import.meta.url), out, assets: new URL("../public/", import.meta.url) });
  assert.ok(existsSync(join(out, "index.html")));
});
