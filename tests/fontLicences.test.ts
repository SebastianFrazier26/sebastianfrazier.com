import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	FONT_FILE,
	fontFamily,
	licenceFor,
	pickLicence,
} from "../scripts/lib/fontLicences.ts";

describe("font licences", () => {
	it("reads the family from source and hashed names alike", () => {
		expect(fontFamily("Bungee-Regular-Latin.woff2")).toBe("Bungee");
		expect(fontFamily("assets/Bungee-Regular-Latin-D9adNChf.woff2")).toBe(
			"Bungee",
		);
		expect(fontFamily("PressStart2P.ttf")).toBe("PressStart2P");
	});

	it("pairs each font with the licence naming its family", () => {
		const dir = [
			"Bungee-Regular.woff2",
			"Barlow-Bold.woff2",
			"OFL-Bungee.txt",
			"OFL-Barlow.txt",
		];
		expect(pickLicence("Bungee-Regular.woff2", dir)).toEqual({
			file: "OFL-Bungee.txt",
			kind: "OFL",
		});
		expect(pickLicence("Barlow-Bold.woff2", dir)?.file).toBe("OFL-Barlow.txt");
	});

	it("falls back to one bare licence for the directory", () => {
		expect(
			pickLicence("Foo-Regular.ttf", ["Foo-Regular.ttf", "OFL.txt"]),
		).toEqual({
			file: "OFL.txt",
			kind: "OFL",
		});
		expect(pickLicence("Foo.otf", ["LICENSE"])).toEqual({
			file: "LICENSE",
			kind: "LICENSE",
		});
	});

	it("finds nothing rather than guessing", () => {
		expect(pickLicence("Foo.woff2", ["OFL-Bar.txt"])).toBeNull();
		expect(pickLicence("Foo.woff2", ["OFL.txt", "LICENSE.md"])).toBeNull();
		expect(pickLicence("Foo.woff2", ["Foo.woff2"])).toBeNull();
	});

	it("covers every font self-hosted under src/", () => {
		const src = fileURLToPath(new URL("../src/", import.meta.url));
		const fonts = readdirSync(src, {
			recursive: true,
			encoding: "utf8",
		}).filter((path) => FONT_FILE.test(path));
		expect(fonts.length).toBeGreaterThan(0);
		for (const font of fonts) {
			expect(licenceFor(`${src}${font}`), font).not.toBeNull();
		}
	});
});
