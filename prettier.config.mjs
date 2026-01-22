/** @type {import('prettier').Config} */
const config = {
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
  tabWidth: 2,
  semi: true,
  bracketSpacing: true,
  endOfLine: 'lf',
  arrowParens: 'always',
  proseWrap: 'always',
  htmlWhitespaceSensitivity: 'css',
  plugins: ['prettier-plugin-tailwindcss'],
};

export default config;
