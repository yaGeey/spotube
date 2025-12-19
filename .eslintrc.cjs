module.exports = {
   root: true,
   env: { browser: true, es2020: true },
   extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:react/recommended',
      'plugin:react/jsx-runtime',

      'plugin:react-hooks/recommended',
      'plugin:@tanstack/eslint-plugin-query/recommended',
   ],
   ignorePatterns: ['dist', '.eslintrc.cjs', 'generated', 'electron/main.ts', 'vite.config.ts', 'tsconfig.json', 'prisma.config.ts'],
   parser: '@typescript-eslint/parser',
   parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      project: ['./tsconfig.json'],
      tsconfigRootDir: __dirname,
   },

   plugins: ['react-refresh', 'react'],
   rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
      'no-extra-semi': 'off',
      '@tanstack/query/exhaustive-deps': 'off',
      '@typescript-eslint/no-namespace': 'off',

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
   },

   settings: {
      react: {
         version: 'detect',
      },
   },
}
