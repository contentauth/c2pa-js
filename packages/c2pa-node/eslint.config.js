const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');

module.exports = [
	js.configs.recommended,
	{
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
				project: './tsconfig.json',
			},
			globals: {
				console: 'readonly',
				process: 'readonly',
				Buffer: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly',
				global: 'readonly',
				module: 'readonly',
				require: 'readonly',
				exports: 'readonly',
			},
		},
		plugins: {
			'@typescript-eslint': tseslint,
		},
		rules: {
			...tseslint.configs.recommended.rules,
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-non-null-assertion': 'warn',
			'prefer-const': 'error',
			'no-var': 'error',
			'no-console': 'warn',
		},
	},
	{
		files: ['**/*.spec.ts', '**/*.test.ts'],
		languageOptions: {
			globals: {
				describe: 'readonly',
				it: 'readonly',
				test: 'readonly',
				expect: 'readonly',
				beforeEach: 'readonly',
				afterEach: 'readonly',
				beforeAll: 'readonly',
				afterAll: 'readonly',
				jest: 'readonly',
			},
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'no-console': 'off',
		},
	},
	{
		ignores: [
			'dist/',
			'node_modules/',
			'*.js',
			'**/*.d.ts',
			'*.config.js',
			'*.config.mjs',
		],
	},
]; 
