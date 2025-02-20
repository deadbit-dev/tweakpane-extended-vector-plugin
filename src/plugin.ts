import {
	BaseInputParams,
	BindingTarget,
	Constraint,
	createDimensionConstraint,
	createPlugin,
	createPointAxis,
	createPointDimensionParser,
	deepMerge,
	getSuitableKeyScale,
	InputBindingPlugin,
	isEmpty,
	NumberTextInputParams,
	parseNumber,
	parsePickerLayout,
	parsePointDimensionParams,
	parseRecord,
	Point2dInputParams,
	Point2dYParams,
	Point3dInputParams,
	Point4dInputParams,
	PointAxis,
	PointDimensionParams,
	PointNdConstraint,
	Tuple2
} from '@tweakpane/core';

import { Point3dObject, Point3d, Point3dAssembly } from '@tweakpane/core/dist/input-binding/point-3d/model/point-3d.js';
import { Point4d, Point4dAssembly, Point4dObject } from '@tweakpane/core/dist/input-binding/point-4d/model/point-4d.js';
import { Point2d, Point2dAssembly, Point2dObject } from '@tweakpane/core/dist/input-binding/point-2d/model/point-2d.js';
import { Point2dController, PointNdTextController } from './controller.js';

// FIXME: remove updating value in disabled field
// FIXME: position of drag line
// TODO: move lable outside and add ability to drag on it too
// TODO: implement picker for 2d working with disabled axis


export interface ExtendedPointDimensionParams extends PointDimensionParams {
	disabled: boolean;
}

export interface ExtendedPoint2dInputParams extends Point2dInputParams {
	x?: ExtendedPointDimensionParams;
	y?: ExtendedPoint2dYParams;
}

export interface ExtendedPoint2dYParams extends Point2dYParams {
	disabled?: boolean;
}

export interface ExtendedPoint3dInputParams extends BaseInputParams, PointDimensionParams {
	x?: ExtendedPointDimensionParams;
	y?: ExtendedPointDimensionParams;
	z?: ExtendedPointDimensionParams;
}

export interface ExtendedPoint4dInputParams extends BaseInputParams, PointDimensionParams {
	x?: ExtendedPointDimensionParams;
	y?: ExtendedPointDimensionParams;
	z?: ExtendedPointDimensionParams;
	w?: ExtendedPointDimensionParams;
}

function extendedParsePointDimensionParams(value: any): ExtendedPointDimensionParams | undefined {
	return { ...parsePointDimensionParams(value), disabled: value.disabled };
}

function createConstraint2d(
	params: Point2dInputParams,
	initialValue: Point2dObject,
): Constraint<Point2d> {
	return new PointNdConstraint({
		assembly: Point2dAssembly,
		components: [
			createDimensionConstraint({ ...params, ...params.x }, initialValue.x),
			createDimensionConstraint({ ...params, ...params.y }, initialValue.y)
		],
	});
}

function point2dFromUnknown(value: unknown): Point2d {
	return Point2d.isObject(value)
		? new Point2d(value.x, value.y)
		: new Point2d();
}

function writePoint2d(target: BindingTarget, value: Point2d) {
	target.writeProperty('x', value.x);
	target.writeProperty('y', value.y);
}

function getSuitableMaxDimensionValue(params: NumberTextInputParams, rawValue: number): number {
	if (!isEmpty(params.min) || !isEmpty(params.max)) {
		return Math.max(Math.abs(params.min ?? 0), Math.abs(params.max ?? 0));
	}

	const step = getSuitableKeyScale(params);
	return Math.max(Math.abs(step) * 10, Math.abs(rawValue) * 10);
}

function getSuitableMax(params: Point2dInputParams, initialValue: Point2d): number {
	const xr = getSuitableMaxDimensionValue(
		deepMerge(params, (params.x ?? {}) as Record<string, unknown>),
		initialValue.x,
	);
	const yr = getSuitableMaxDimensionValue(
		deepMerge(params, (params.y ?? {}) as Record<string, unknown>),
		initialValue.y,
	);
	return Math.max(xr, yr);
}

function shouldInvertY(params: Point2dInputParams): boolean {
	if (!('y' in params)) {
		return false;
	}

	const yParams = params.y;
	if (!yParams) {
		return false;
	}

	return 'inverted' in yParams ? !!yParams.inverted : false;
}

export const ExtendedPoint2dInputPlugin: InputBindingPlugin<
	Point2d,
	Point2dObject,
	ExtendedPoint2dInputParams
> = createPlugin({
	id: 'input-point2d',
	type: 'input',
	accept: (value, params) => {
		if (!Point2d.isObject(value)) {
			return null;
		}
		const result = parseRecord<ExtendedPoint2dInputParams>(params, (p) => ({
			...createPointDimensionParser(p),
			expanded: p.optional.boolean,
			picker: p.optional.custom(parsePickerLayout),
			readonly: p.optional.constant(false),
			x: p.optional.custom(extendedParsePointDimensionParams),
			y: p.optional.object<ExtendedPoint2dYParams & Record<string, unknown>>({
				...createPointDimensionParser(p),
				inverted: p.optional.boolean,
				disabled: p.optional.boolean
			}),
		}));
		return result
			? {
				initialValue: value,
				params: result,
			}
			: null;
	},
	binding: {
		reader: () => point2dFromUnknown,
		constraint: (args) => createConstraint2d(args.params, args.initialValue),
		equals: Point2d.equals,
		writer: () => writePoint2d,
	},
	controller: (args) => {
		const doc = args.document;
		const value = args.value;
		const c = args.constraint as PointNdConstraint<Point2d>;
		const dParams = [args.params.x, args.params.y];
		return new Point2dController(doc, {
			axes: value.rawValue.getComponents().map((comp, i) =>
				createPointAxis({
					constraint: c.components[i],
					initialValue: comp,
					params: deepMerge(
						args.params,
						(dParams[i] ?? {}) as Record<string, unknown>,
					),
				}),
			) as Tuple2<PointAxis>,
			expanded: args.params.expanded ?? false,
			invertsY: shouldInvertY(args.params),
			max: getSuitableMax(args.params, value.rawValue),
			parser: parseNumber,
			pickerLayout: args.params.picker,
			value: value,
			params: args.params,
			viewProps: args.viewProps,
		});
	},
});

function createConstraint3d(
	params: Point3dInputParams,
	initialValue: Point3dObject,
): Constraint<Point3d> {
	return new PointNdConstraint({
		assembly: Point3dAssembly,
		components: [
			createDimensionConstraint({ ...params, ...params.x }, initialValue.x),
			createDimensionConstraint({ ...params, ...params.y }, initialValue.y),
			createDimensionConstraint({ ...params, ...params.z }, initialValue.z),
		],
	});
}

function point3dFromUnknown(value: unknown): Point3d {
	return Point3d.isObject(value)
		? new Point3d(value.x, value.y, value.z)
		: new Point3d();
}

function writePoint3d(target: BindingTarget, value: Point3d) {
	target.writeProperty('x', value.x);
	target.writeProperty('y', value.y);
	target.writeProperty('z', value.z);
}

export const ExtendedPoint3dInputPlugin: InputBindingPlugin<
	Point3d,
	Point3dObject,
	ExtendedPoint3dInputParams
> = createPlugin({
	id: 'input-point3d',
	type: 'input',
	accept: (value, params) => {
		if (!Point3d.isObject(value)) {
			return null;
		}
		const result = parseRecord<ExtendedPoint3dInputParams>(params, (p) => ({
			...createPointDimensionParser(p),
			readonly: p.optional.constant(false),
			x: p.optional.custom(extendedParsePointDimensionParams),
			y: p.optional.custom(extendedParsePointDimensionParams),
			z: p.optional.custom(extendedParsePointDimensionParams),
		}));
		return result ? { initialValue: value, params: result } : null;
	},
	binding: {
		reader: (_args) => point3dFromUnknown,
		constraint: (args) => createConstraint3d(args.params, args.initialValue),
		equals: Point3d.equals,
		writer: (_args) => writePoint3d,
	},
	controller: (args) => {
		const value = args.value;
		const c = args.constraint as PointNdConstraint<Point3d>;
		const dParams = [args.params.x, args.params.y, args.params.z];
		return new PointNdTextController(args.document, {
			assembly: Point3dAssembly,
			axes: value.rawValue.getComponents().map((comp, i) =>
				createPointAxis({
					constraint: c.components[i],
					initialValue: comp,
					params: deepMerge(
						args.params,
						(dParams[i] ?? {}) as Record<string, unknown>,
					),
				}),
			),
			parser: parseNumber,
			value: value,
			params: args.params,
			viewProps: args.viewProps,
		});
	},
});

function createConstraint4d(
	params: Point4dInputParams,
	initialValue: Point4dObject,
): Constraint<Point4d> {
	return new PointNdConstraint({
		assembly: Point4dAssembly,
		components: [
			createDimensionConstraint({ ...params, ...params.x }, initialValue.x),
			createDimensionConstraint({ ...params, ...params.y }, initialValue.y),
			createDimensionConstraint({ ...params, ...params.z }, initialValue.z),
			createDimensionConstraint({ ...params, ...params.w }, initialValue.w),
		],
	});
}

function point4dFromUnknown(value: unknown): Point4d {
	return Point4d.isObject(value)
		? new Point4d(value.x, value.y, value.z, value.w)
		: new Point4d();
}

function writePoint4d(target: BindingTarget, value: Point4d) {
	target.writeProperty('x', value.x);
	target.writeProperty('y', value.y);
	target.writeProperty('z', value.z);
	target.writeProperty('w', value.w);
}

export const ExtendedPoint4dInputPlugin: InputBindingPlugin<
	Point4d,
	Point4dObject,
	ExtendedPoint3dInputParams
> = createPlugin({
	id: 'input-point4d',
	type: 'input',
	accept: (value, params) => {
		if (!Point4d.isObject(value)) {
			return null;
		}
		const result = parseRecord<ExtendedPoint3dInputParams>(params, (p) => ({
			...createPointDimensionParser(p),
			readonly: p.optional.constant(false),
			x: p.optional.custom(extendedParsePointDimensionParams),
			y: p.optional.custom(extendedParsePointDimensionParams),
			z: p.optional.custom(extendedParsePointDimensionParams),
			w: p.optional.custom(extendedParsePointDimensionParams),
		}));
		return result ? { initialValue: value, params: result } : null;
	},
	binding: {
		reader: (_args) => point4dFromUnknown,
		constraint: (args) => createConstraint4d(args.params, args.initialValue),
		equals: Point4d.equals,
		writer: (_args) => writePoint4d,
	},
	controller: (args) => {
		const value = args.value;
		const c = args.constraint as PointNdConstraint<Point4d>;
		const dParams = [args.params.x, args.params.y, args.params.z, args.params.w];
		return new PointNdTextController(args.document, {
			assembly: Point4dAssembly,
			axes: value.rawValue.getComponents().map((comp, i) =>
				createPointAxis({
					constraint: c.components[i],
					initialValue: comp,
					params: deepMerge(
						args.params,
						(dParams[i] ?? {}) as Record<string, unknown>,
					),
				}),
			),
			parser: parseNumber,
			value: value,
			params: args.params,
			viewProps: args.viewProps,
		});
	},
});