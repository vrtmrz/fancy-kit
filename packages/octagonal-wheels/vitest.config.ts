import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    oxc: {
        target: 'es2018',
    },
    test: {
        testTimeout: 10000,
        fileParallelism: false,
        watch: false,
        silent: 'passed-only',

        // environment: "browser",
        include: ['src/**/*.test.ts'],
        coverage: {
            include: ['src/**/*.ts'],
            // Coverage measures maintained runtime code; compatibility tests still run.
            exclude: [
                'src/concurrency/lock_v1.ts',
                'src/concurrency/processor_v1.ts',
                'src/concurrency/semaphore_v1.ts',
                'src/dataobject/reactive_v1.ts',
                'src/messagepassing/signal_v1.ts',
                'src/binary/encodedUTF16.deprecated.ts',
                'src/hash/crc32.ts',
                'src/**/*.bench.ts',
            ],
            provider: 'istanbul',
            reporter: ['text', 'json', 'html',
                ['text', { file: 'coverage-text.txt' }],
            ],
            // ignoreEmptyLines: true,
        },
        browser: {
            provider: playwright({
                launchOptions: {
                    args: ['--js-flags=--expose-gc'],
                },
            }),
            enabled: true,
            screenshotFailures: false,
            instances: [
                {
                    browser: 'chromium',
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
