import { Parser, PointAxis, PointNdAssembly, PointNdTextController, Value, ViewProps } from '@tweakpane/core';
import { ExtendedPointNdTextView } from './view.js';

interface Config<PointNd> {
	assembly: PointNdAssembly<PointNd>;
	axes: PointAxis[];
	parser: Parser<number>;
	value: Value<PointNd>;
	params: any;
	viewProps: ViewProps;
}

export class ExtendedPointNdController<PointNd> extends PointNdTextController<PointNd> {
	public readonly view: ExtendedPointNdTextView;
	constructor(doc: Document, config: Config<PointNd>) {
		super(doc, config);
		this.view = new ExtendedPointNdTextView(doc, {
			textViews: this.textControllers.map((ac) => ac.view),
			params: config.params
		});
	}
}
