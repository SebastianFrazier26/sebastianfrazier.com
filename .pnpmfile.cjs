// Local-dev only: with CABN_ENGINE_DIR set (scripts/engine-link.ts sets it),
// the site's @cabn/* dependencies resolve to that cabn checkout's packages
// instead of npm. Unset — always, in CI and in the committed lockfile — this
// hook changes nothing.
const LINKED = [
	"@cabn/engine",
	"@cabn/cli",
	"@cabn/world-schema",
	"@cabn/blog",
];

function readPackage(pkg) {
	const dir = process.env.CABN_ENGINE_DIR;
	if (!dir || pkg.name !== "sebastianfrazier.com") return pkg;
	for (const field of ["dependencies", "devDependencies"]) {
		for (const name of LINKED) {
			if (pkg[field]?.[name]) {
				pkg[field][name] =
					`link:${dir}/packages/${name.slice("@cabn/".length)}`;
			}
		}
	}
	return pkg;
}

module.exports = { hooks: { readPackage } };
