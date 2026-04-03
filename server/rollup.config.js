import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
    input: './modules/main.ts',
    output: {
        file: './build/index.js',
        format: 'cjs',
        strict: false,
        banner: 'var module = typeof module !== "undefined" ? module : { exports: {} };\nvar exports = typeof exports !== "undefined" ? exports : module.exports;'
    },
    plugins: [
        resolve(),
        typescript()
    ]
};
