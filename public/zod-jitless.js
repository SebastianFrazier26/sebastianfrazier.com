// Copied from cabn's apps/demo/public/zod-jitless.js. zod builds its object
// schemas with a caught `new Function("")` probe, and this page's CSP (no
// 'unsafe-eval') reports that probe as a violation even though zod falls
// back fine. `jitless` skips it. It has to be set before any bundled chunk
// constructs a schema, so it runs here: a classic script executes before the
// deferred module script. zod 4 keeps this config on globalThis and adopts
// an object that is already there.
globalThis.__zod_globalConfig = Object.assign(
	globalThis.__zod_globalConfig || {},
	{ jitless: true },
);
