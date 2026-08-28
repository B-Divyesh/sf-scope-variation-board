const VERSION = "change-ledger-v3";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/privacy/",
  "/terms/",
  "/assets/legal.css",
  "/assets/contour-ledger.webp",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const fresh = async (path) => {
      const response = await fetch(new Request(path, { cache: "reload" }));
      if (!response.ok) throw new Error(`Could not precache ${path}`);
      await cache.put(path, response);
    };
    await Promise.all(SHELL.map(fresh));
    const html = await (await cache.match("/index.html")).text();
    const builtAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map((match) => match[1]);
    await Promise.all(builtAssets.map(fresh));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((client) => client.postMessage({ type: "APP_UPDATED" }));
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    if (url.hostname.endsWith("sociobot.in")) {
      event.respondWith(fetch(event.request).catch(() => new Response(JSON.stringify({ valid: false, reason: "offline" }), { status: 503, headers: { "Content-Type": "application/json" } })));
    }
    return;
  }
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(async () => (await caches.match(event.request, { ignoreVary: true })) || (await caches.match("/index.html", { ignoreVary: true })) || caches.match("/offline.html", { ignoreVary: true })));
    return;
  }
  event.respondWith(caches.match(event.request, { ignoreVary: true }).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok && ["script", "style", "image", "font", "manifest"].includes(event.request.destination)) {
      const copy = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy));
    }
    return response;
  })));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
