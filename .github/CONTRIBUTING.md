# Contribution guide

1.  Make sure you always pull the latest changes from the repo and `rebase` from the `master` branch whenever it's necessary.
2.  Always work on the `dev` branch or dedicated branches (e.g.: for features).
3.  Don't modify generated files in `/doc` and in `/build`.
4.  Squash commits in branches to reduce the chain whenever its possible.
5.  Always **test** your code using `npm test`.
6.  If you add new code, ensure that it's covered by test cases.
7.  If you fix an issue, mention `fix #x` (where x is the issue number).
8.  Ensure that you use the appropriate code style (that can be checked
with `npm run lint`).
9.  Make sure you follow the [ESLint commit convention](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-eslint).

## Project structure
-   **`bin`**: contains server files.
-   **`charts`**: contains generated flow diagrams.
-   **`config`**: contains configurations excluding the dev/prod env ones.
-   **`doc`**: contains the documentation.
-   **`keys`**: contains keys for the HTTPS server.
-   **`public`**: contains built files for the public side.
-   **`src`**: contains source files.
-   **`test`**: contains all tests, unit tests are written using Jest and E2E are written with Nightwatch.
-   **`views`**: contains Pug view files.
