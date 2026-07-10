/// <reference types="@vitest/browser/providers/playwright" />
/// <reference types="@vitest/browser/providers/webdriverio" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
    esbuild: {
        target: 'es2018',
    },
    test: {
        testTimeout: 10000,
        fileParallelism: false,
        watch: false,

        // environment: "browser",
        include: ['src/**/*.test.ts'],
        coverage: {
            include: ['src/**/*.ts'],
            provider: 'istanbul',
            reporter: ['text', 'json', 'html',
                ['text', { file: 'coverage-text.txt' }],
            ],
            // ignoreEmptyLines: true,
        },
        browser: {
            provider: "playwright",
            enabled: true,
            screenshotFailures: false,
            instances: [
                {
                    browser: 'chromium',
                    launch: {
                        args: ['--js-flags=--expose-gc'],
                    }

                    // options: {
                    //     headless: true,
                    //     slowMo: 0,
                    //     args: ['--no-sandbox', '--disable-setuid-sandbox'],
                    // },
                },
            ],
            // slowHijackESM: false,
            headless: true,
            fileParallelism: false,
            // name: 'chromium', // browser name is required

        },
    },
})