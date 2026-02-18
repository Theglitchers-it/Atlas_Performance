module.exports = {
    root: true,
    env: {
        browser: true,
        es2022: true,
        node: true
    },
    extends: [
        'eslint:recommended',
        'plugin:vue/vue3-recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        // Rilassate per non bloccare CI — solo warning
        'vue/multi-word-component-names': 'off',
        'vue/no-unused-vars': 'warn',
        'vue/require-default-prop': 'off',
        'vue/require-prop-types': 'off',
        'vue/no-v-html': 'warn',

        // Formatting — disabilitato (gestito da editor/prettier)
        'vue/html-indent': 'off',
        'vue/html-self-closing': 'off',
        'vue/max-attributes-per-line': 'off',
        'vue/singleline-html-element-content-newline': 'off',
        'vue/multiline-html-element-content-newline': 'off',
        'vue/first-attribute-linebreak': 'off',
        'vue/html-closing-bracket-newline': 'off',
        'vue/html-closing-bracket-spacing': 'off',
        'vue/attribute-hyphenation': 'off',
        'vue/v-on-event-hyphenation': 'off',

        // JS rules rilassate
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        'no-console': 'off',
        'no-debugger': 'warn',
        'no-undef': 'off', // TypeScript gestisce questo
        'no-empty': ['warn', { allowEmptyCatch: true }]
    },
    globals: {
        defineProps: 'readonly',
        defineEmits: 'readonly',
        defineExpose: 'readonly',
        withDefaults: 'readonly'
    },
    ignorePatterns: ['dist/', 'node_modules/', '*.d.ts', 'auto-imports.d.ts', 'components.d.ts']
}
