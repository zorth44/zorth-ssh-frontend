module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended', // Use vue3-recommended for Vue 3
    'prettier', // Add prettier last to override other formatting rules
    'plugin:prettier/recommended', // Integrates Prettier with ESLint
  ],
  parser: 'vue-eslint-parser', // Use vue-eslint-parser for .vue files
  parserOptions: {
    parser: '@typescript-eslint/parser', // Use @typescript-eslint/parser for <script> blocks
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    'vue',
    'prettier', // Enables eslint-plugin-prettier
  ],
  rules: {
    'prettier/prettier': 'warn', // Show Prettier issues as warnings
    // Add any project-specific ESLint rules here
    // Example:
    // 'vue/no-unused-vars': 'warn',
    // '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['dist', 'node_modules', '*.config.js', '*.config.cjs'], // Ignore build outputs and config files from linting for now
};
