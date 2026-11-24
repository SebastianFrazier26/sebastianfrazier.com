import { defineConfig, devices } from "@playwright/test";

// Runs against `vite preview` of the production build (`pnpm build` first),
// so the page under test carries the real CSP meta tag and the real chunks.
// The port is overridable so two worktrees can run at once.
const PORT = Number(process.env.SF_E2E_PORT ?? 4391);

export default defineConfig({
	testDir: "./e2e",
	timeout: 60_000,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL: `http://127.0.0.1:${PORT}`,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	webServer: {
		command: `pnpm exec vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
		url: `http://127.0.0.1:${PORT}`,
		// A reused server could be serving another checkout's dist/.
		reuseExistingServer: false,
		timeout: 60_000,
	},
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				// CI installs the matching Chromium. Locally, point this at a
				// cached Chrome for Testing build rather than installing one.
				launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
					? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
					: {},
			},
		},
	],
});
