// Walk the built site in a real browser and check what a visitor sees.
// npm run dev, then: npm run ui   (BASE=https://lunchandlearn.page npm run ui for production; CHANNEL=chrome for Chrome)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://localhost:8830";
const sites = readdirSync(new URL("../sites/", import.meta.url)).map((handle) =>
  ({ handle, ...JSON.parse(readFileSync(new URL(`../sites/${handle}/site.json`, import.meta.url), "utf8")) }));
const articles = sites.flatMap((s) => s.topics.flatMap((t) => t.lessons.map((l) => ({ s, t, l, path: `/${s.handle}/${t.slug}/${l.slug}/` }))));
let browser, page;
const errors = [];

before(async () => {
  browser = await chromium.launch({ channel: process.env.CHANNEL ?? "msedge" });
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && !/status of 404/.test(m.text()) && errors.push(m.text()));
});
after(() => browser?.close());

test("hub: says what this is, links the kit, and has a card per hosted site", async () => {
  await page.goto(BASE);
  assert.match(await page.textContent("header"), /Lunch & Learn is a format/);
  assert.equal(await page.locator('header a[href="https://lnl.sam-peterson.com"]').count(), 0, "credit lives in the footer only");
  assert.equal(await page.locator('header a[href="https://github.com/greg-m-k/lnl-template"]').count(), 1);
  assert.doesNotMatch(await page.content(), /\bfree\b/i, "the site never says free");
  assert.equal(await page.locator("#hosted ~ .cards .card").count(), sites.length);
  assert.equal(await page.textContent("footer"), "Made by Sam Peterson, Greg Kitchen.");
  assert.equal(await page.locator('footer a[href="https://lnl.sam-peterson.com"]').count(), 1, "Sam Peterson credited first");
});

test("a site: one card per lesson, and the author credited", async () => {
  for (const s of sites) {
    await page.goto(`${BASE}/${s.handle}/`);
    assert.equal(await page.locator(".card").count(), s.topics.reduce((n, t) => n + t.lessons.length, 0), s.handle);
    assert.equal(await page.textContent("footer"), `Made by ${s.author.name}. lunchandlearn.page is made by Sam Peterson, Greg Kitchen.`);
  }
});

test("an article: chips for its topic with itself current, the article, and the author", async () => {
  for (const { s, l, path } of articles) {
    await page.goto(BASE + path);
    assert.equal(await page.textContent('.chips [aria-current="page"]'), l.chip ?? l.title, path);
    assert.ok((await page.textContent("article")).length > 50, path);
    assert.equal(await page.textContent("main > footer"), `Made by ${s.author.name}. lunchandlearn.page is made by Sam Peterson, Greg Kitchen.`, path);
  }
});

test("an unknown address shows the not-found page with a way back", async () => {
  const res = await page.goto(`${BASE}/nobody-here/`);
  assert.equal(res.status(), 404);
  assert.equal(await page.locator('a[href="/"]').count(), 1);
});

test("every page fits a phone screen without sideways scrolling", async () => {
  await page.setViewportSize({ width: 390, height: 800 });
  for (const path of ["/", ...sites.map((s) => `/${s.handle}/`), ...articles.map((a) => a.path)]) {
    await page.goto(BASE + path);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, path);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
});

test("paragraphs have visible space between them", async () => {
  for (const path of ["/", ...articles.map((a) => a.path)]) {
    await page.goto(BASE + path);
    const gaps = await page.evaluate(() => [...document.querySelectorAll("main p + p")]
      .map((p) => Math.round(p.getBoundingClientRect().top - p.previousElementSibling.getBoundingClientRect().bottom)));
    for (const gap of gaps) assert.ok(gap >= 12, `${path}: ${gap}px`);
  }
});

test("nothing logged an error", () => assert.deepEqual(errors, []));
