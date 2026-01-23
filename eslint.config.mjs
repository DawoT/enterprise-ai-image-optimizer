import next from '@next/eslint-plugin-next';
import pluginJs from '@eslint/js';
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js';
import pluginReactHooksConfig from 'eslint-plugin-react-hooks/configs/recommended.js';
import pluginImport from 'eslint-plugin-import';
import pluginJsxA11y from 'eslint-plugin-jsx-a11y';
import pluginTypeScript from '@typescript-eslint/eslint-plugin';
import parserTypeScript from '@typescript-eslint/parser';
import pluginPrettier from 'eslint-plugin-prettier/recommended';
import pluginCypress from 'eslint-plugin-cypress';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/dist/**',
      '**/*.config.js',
      '**/*.config.mjs',
      'cypress/**/*.js',
      'cypress/**/*.ts',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    plugins: {
      '@next/next': next,
      import: pluginImport,
      '@typescript-eslint': pluginTypeScript,
      'jsx-a11y': pluginJsxA11y,
      prettier: pluginPrettier,
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
      react: {
        version: 'detect',
      },
    },
    languageOptions: {
      parser: parserTypeScript,
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true,
      },
      globals: {
        React: 'writable',
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      ...pluginReactConfig.rules,
      ...pluginReactHooksConfig.rules,
      ...pluginTypeScript.configs.recommended.rules,
      ...pluginJsxA11y.configs.recommended.rules,
      ...pluginImport.configs.recommended.rules,
      ...pluginImport.configs.typescript.rules,
      // TypeScript specific rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      // Import rules
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object'],
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
              position: 0,
            },
            {
              pattern: '@/core/**',
              group: 'internal',
              position: 1,
            },
            {
              pattern: '@/infrastructure/**',
              group: 'internal',
              position: 2,
            },
            {
              pattern: '@/app/**',
              group: 'internal',
              position: 3,
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-default-export': 'warn',
      'import/prefer-default-export': 'off',
      // React rules
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'error',
      'react/no-unstable-nested-components': 'warn',
      // Prettier
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          trailingComma: 'es5',
          printWidth: 100,
          tabWidth: 2,
          semi: true,
          bracketSpacing: true,
          endOfLine: 'lf',
        },
      ],
      // Next.js specific
      '@next/next/no-html-link-for-pages': 'off',
      '@next/next/no-img-element': 'warn',
    },
  },
  {
    files: ['cypress/**/*.{js,ts}'],
    plugins: {
      cypress: pluginCypress,
    },
    languageOptions: {
      globals: {
        cy: 'readonly',
        Cypress: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        context: 'readonly',
        before: 'readonly',
        after: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
    rules: {
      'cypress/no-unnecessary-waiting': 'warn',
    },
  },
];
