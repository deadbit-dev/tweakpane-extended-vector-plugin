/* eslint-env node */

import { nodeResolve } from '@rollup/plugin-node-resolve';
import CommonJS from '@rollup/plugin-commonjs';
import Replace from '@rollup/plugin-replace';
import Typescript from '@rollup/plugin-typescript';
import Autoprefixer from 'autoprefixer';
import Postcss from 'postcss';
import Cleanup from 'rollup-plugin-cleanup';
import { terser as Terser } from 'rollup-plugin-terser';
import Sass from 'sass';

import Package from './package.json';

async function compileCss() {
	const css = Sass.renderSync({
		file: 'src/sass/plugin.scss',
		outputStyle: 'compressed',
	}).css.toString();

	const result = await Postcss([Autoprefixer]).process(css, {
		from: undefined,
	});
	return result.css.replace(/'/g, "\\'").trim();
}

function getPlugins(css, shouldMinify) {
	const plugins = [
		Typescript({
			tsconfig: 'src/tsconfig.json',
		}),
		nodeResolve(),
		CommonJS({
			include: /node_modules/,
		}),
		Replace({
			__css__: css,
			preventAssignment: false,
			'process.env.NODE_ENV': JSON.stringify('production'),
		}),
	];
	if (shouldMinify) {
		plugins.push(Terser());
	}
	return [
		...plugins,
		// https://github.com/microsoft/tslib/issues/47
		Cleanup({
			comments: 'none',
		}),
	];
}

export default async () => {
	const production = process.env.BUILD === 'production';
	const postfix = production ? '.min' : '';

	const distName = 'tweakpane4-extended-vector-plugin';
	const css = await compileCss();
	return {
		input: 'src/index.ts',
		external: ['tweakpane'],
		output: {
			file: `dist/${distName}${postfix}.js`,
			format: 'esm',
			globals: {
				tweakpane: 'Tweakpane',
			},
		},
		plugins: getPlugins(css, production),

		// Suppress `Circular dependency` warning
		onwarn(warning, rollupWarn) {
			if (warning.code === 'CIRCULAR_DEPENDENCY') {
				return;
			}
			rollupWarn(warning);
		},
	};
};
