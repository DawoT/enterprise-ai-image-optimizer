import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    specPattern: 'tests/e2e/**/*.cy.{ts,tsx}',
    supportFile: 'tests/setup/cypress.ts',
    fixturesFolder: 'tests/fixtures',
    downloadsFolder: 'cypress/downloads',
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    env: {
      apiUrl: 'http://localhost:3000/api',
    },
    retries: {
      runMode: 2,
      openMode: 0,
    },
    component: {
      devServer: {
        framework: 'next',
        bundler: 'webpack',
      },
    },
  },
});
