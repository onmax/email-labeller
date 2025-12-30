import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  typescript: true,
  ignores: ['.eslintcache', 'node_modules', '**/dist/**', 'services/**'],
  rules: {
    'no-console': 'off',
    'node/prefer-global/process': 'off',
  },
})
