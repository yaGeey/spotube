module.exports = {
   root: true,
   env: { browser: true, es2020: true },
   extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended-type-checked',
      'plugin:react/recommended',
      'plugin:react/jsx-runtime',

      'plugin:react-hooks/recommended',
      'plugin:@tanstack/eslint-plugin-query/recommended',
   ],
   ignorePatterns: ['dist', '.eslintrc.cjs'],
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
      '@typescript-eslint/no-extra-semi': 'off',

      // Дозволяє писати ": any"
      '@typescript-eslint/no-explicit-any': 'off',

      // Дозволяє присвоювати any змінним (const x = someAnyValue)
      '@typescript-eslint/no-unsafe-assignment': 'off',

      // Дозволяє звертатися до полів any (someAnyValue.id)
      '@typescript-eslint/no-unsafe-member-access': 'off',

      // Дозволяє передавати any у функції
      '@typescript-eslint/no-unsafe-argument': 'off',

      // Дозволяє викликати any як функцію (someAnyValue())
      '@typescript-eslint/no-unsafe-call': 'off',

      // Дозволяє повертати any з функції
      '@typescript-eslint/no-unsafe-return': 'off',
   },

   settings: {
      react: {
         version: 'detect',
      },
   },
}
