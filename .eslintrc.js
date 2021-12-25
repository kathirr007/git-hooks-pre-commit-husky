module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 12
  },
  globals: {
    define: 'readonly'
  },
  rules: {
    /* 'array-bracket-spacing': 'off',
    'arrow-spacing': 'off',
    'block-spacing': 'off',
    'brace-style': ['warn', '1tbs', { allowSingleLine: true }],
    'comma-dangle': 'off',
    'spaced-comment': 'off',
    'space-unary-ops': 'off',
    'space-infix-ops': 'off',
    'space-in-parens': 'off',
    'space-before-function-paren': 'off',
    'space-before-blocks': 'off',
    'semi-spacing': 'off',
    semi: 'off',
    'rest-spread-spacing': 'off',
    'padded-blocks': 'off',
    'comma-spacing': 'off',
    'key-spacing': 'off',
    'no-multiple-empty-lines': 'off',
    'no-trailing-spaces': 'off',
    'no-unexpected-multiline': 'off',
    'operator-linebreak': 'off',
    'keyword-spacing': 'off',
    'no-multi-spaces': 'off',
    'no-mixed-spaces-and-tabs': 'off', */
    // indent: 'off',
    // 'no-tabs': 'off',
    // 'no-extra-parens': 'off',
    // 'no-mixed-operators': 'off',
    eqeqeq: 'off',
    camelcase: 'off',
    'no-useless-escape': 'off',
    'no-unused-vars': 'off',
    'no-console': 'off',
    'no-debugger': 'off',
    'no-tabs': ['error', { allowIndentationTabs: true }],
    'prefer-template': [1]
  }
}
