import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
    input: './modules/main.ts',
    output: {
        file: './build/index.js',
        format: 'cjs'
    },
    plugins: [
        resolve(),
        typescript()
    ]
};
