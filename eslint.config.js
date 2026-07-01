import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src/components/character/**',
      'src/components/grass/**',
      'src/components/Rose/**',
      'src/components/cosmic/**',
      'src/components/background/**',
      'src/components/Effects/**',
      'src/components/camera/**',
      'src/debug/**',
      'src/core/shaders/**',
      'src/core/utils/**',
      'src/ui/**',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // React Compiler-era rules treat normal R3F/WebGPU imperative mutation
      // as React state mutation. Keep hook ordering/deps strict, but do not
      // block Three.js refs, uniforms, materials, and scene objects.
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/static-components': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);
