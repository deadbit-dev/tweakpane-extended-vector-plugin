import { connectValues, createValue, forceCast, getStepForKey, getVerticalStepKeys, isEmpty, NumberTextProps, Parser, PickerLayout, Point2dController, PointAxis, PointerData, PointerHandler, PointerHandlerEvent, PointNdAssembly, SliderProps, Tuple2, Value, ValueController, ViewProps } from '@tweakpane/core';
import { Point2d, Point2dAssembly } from '@tweakpane/core/dist/input-binding/point-2d/model/point-2d.js';
import { NumberTextView, ExtendedPointNdTextView } from './view.js';

interface Config2d {
	axes: Tuple2<PointAxis>;
	expanded: boolean;
	invertsY: boolean;
	max: number;
	parser: Parser<number>;
	pickerLayout: PickerLayout;
	value: Value<Point2d>;
	params: any;
	viewProps: ViewProps;
}

export class ExtendedPoint2dController extends Point2dController {
	private readonly extendedtextController_: PointNdTextController<Point2d>;
	constructor(doc: Document, config: Config2d) {
		super(doc, config);
		this.extendedtextController_ = new PointNdTextController(doc, {
			assembly: Point2dAssembly,
			axes: config.axes,
			parser: config.parser,
			value: this.value,
			params: config.params,
			viewProps: this.viewProps,
		});
		this.view.textElement.childNodes.forEach((node) => node.remove());
		this.view.textElement.appendChild(this.extendedtextController_.view.element);

		// remove picker button if one of axies disabled
		const isX = (config.params.x && config.params.x.disabled);
		const isY = (config.params.y && config.params.y.disabled);
		if (isX || isY) {
			this.view.buttonElement.remove();
		}
	}

	get textControllers(): PointNdTextController<Point2d> {
		return this.extendedtextController_;
	}
}

interface ConfigN {
	parser: Parser<number>;
	props: NumberTextProps;
	sliderProps?: SliderProps;
	value: Value<number>;
	viewProps: ViewProps;

	arrayPosition?: 'fst' | 'mid' | 'lst';
}

export class NumberTextController
	implements ValueController<number, NumberTextView> {
	public readonly props: NumberTextProps;
	public readonly value: Value<number>;
	public readonly view: NumberTextView;
	public readonly viewProps: ViewProps;
	private readonly sliderProps_: SliderProps | null;
	private readonly parser_: Parser<number>;
	private readonly dragging_: Value<number | null>;
	private originRawValue_ = 0;

	constructor(doc: Document, config: ConfigN) {
		this.onInputChange_ = this.onInputChange_.bind(this);
		this.onInputKeyDown_ = this.onInputKeyDown_.bind(this);
		this.onInputKeyUp_ = this.onInputKeyUp_.bind(this);
		this.onPointerDown_ = this.onPointerDown_.bind(this);
		this.onPointerMove_ = this.onPointerMove_.bind(this);
		this.onPointerUp_ = this.onPointerUp_.bind(this);

		this.parser_ = config.parser;
		this.props = config.props;
		this.sliderProps_ = config.sliderProps ?? null;
		this.value = config.value;
		this.viewProps = config.viewProps;

		this.dragging_ = createValue<number | null>(null);
		this.view = new NumberTextView(doc, {
			arrayPosition: config.arrayPosition,
			dragging: this.dragging_,
			props: this.props,
			value: this.value,
			viewProps: this.viewProps,
		});
		this.view.inputElement.addEventListener('change', this.onInputChange_);
		this.view.inputElement.addEventListener('keydown', this.onInputKeyDown_);
		this.view.inputElement.addEventListener('keyup', this.onInputKeyUp_);

		const ph = new PointerHandler(this.view.knobElement);
		ph.emitter.on('down', this.onPointerDown_);
		ph.emitter.on('move', this.onPointerMove_);
		ph.emitter.on('up', this.onPointerUp_);
	}

	private constrainValue_(value: number): number {
		const min = this.sliderProps_?.get('min');
		const max = this.sliderProps_?.get('max');
		let v = value;
		if (min !== undefined) {
			v = Math.max(v, min);
		}
		if (max !== undefined) {
			v = Math.min(v, max);
		}
		return v;
	}

	private onInputChange_(e: Event): void {
		const inputElem: HTMLInputElement = forceCast(e.currentTarget);
		const value = inputElem.value;

		const parsedValue = this.parser_(value);
		if (!isEmpty(parsedValue)) {
			this.value.rawValue = this.constrainValue_(parsedValue);
		}
		this.view.refresh();
	}

	private onInputKeyDown_(ev: KeyboardEvent): void {
		const step = getStepForKey(
			this.props.get('keyScale'),
			getVerticalStepKeys(ev),
		);
		if (step === 0) {
			return;
		}
		this.value.setRawValue(this.constrainValue_(this.value.rawValue + step), {
			forceEmit: false,
			last: false,
		});
	}

	private onInputKeyUp_(ev: KeyboardEvent): void {
		const step = getStepForKey(
			this.props.get('keyScale'),
			getVerticalStepKeys(ev),
		);
		if (step === 0) {
			return;
		}
		this.value.setRawValue(this.value.rawValue, {
			forceEmit: true,
			last: true,
		});
	}

	private onPointerDown_() {
		this.originRawValue_ = this.value.rawValue;
		this.dragging_.rawValue = 0;
	}

	private computeDraggingValue_(data: PointerData): number | null {
		if (!data.point) {
			return null;
		}

		const dx = data.point.x - data.bounds.width / 2;
		return this.constrainValue_(
			this.originRawValue_ + dx * this.props.get('pointerScale'),
		);
	}

	private onPointerMove_(ev: PointerHandlerEvent) {
		const v = this.computeDraggingValue_(ev.data);
		if (v === null) {
			return;
		}

		this.value.setRawValue(v, {
			forceEmit: false,
			last: false,
		});
		this.dragging_.rawValue = this.value.rawValue - this.originRawValue_;
	}

	private onPointerUp_(ev: PointerHandlerEvent) {
		const v = this.computeDraggingValue_(ev.data);
		if (v === null) {
			return;
		}

		this.value.setRawValue(v, {
			forceEmit: true,
			last: true,
		});
		this.dragging_.rawValue = null;
	}
}

interface ConfigNd<PointNd> {
	assembly: PointNdAssembly<PointNd>;
	axes: PointAxis[];
	parser: Parser<number>;
	value: Value<PointNd>;
	params: any;
	viewProps: ViewProps;
}

function createAxisController<PointNd>(doc: Document, config: ConfigNd<PointNd>, index: number): NumberTextController {
	return new NumberTextController(doc, {
		arrayPosition:
			index === 0 ? 'fst' : index === config.axes.length - 1 ? 'lst' : 'mid',
		parser: config.parser,
		props: config.axes[index].textProps,
		value: createValue(0, {
			constraint: config.axes[index].constraint,
		}),
		viewProps: config.viewProps,
	});
}

export class PointNdTextController<PointNd> implements ValueController<PointNd, ExtendedPointNdTextView> {
	public readonly value: Value<PointNd>;
	public readonly view: ExtendedPointNdTextView;
	public readonly viewProps: ViewProps;
	private readonly acs_: NumberTextController[];
	constructor(doc: Document, config: ConfigNd<PointNd>) {
		this.value = config.value;
		this.viewProps = config.viewProps;

		this.acs_ = config.axes.map((_, index) =>
			createAxisController(doc, config, index),
		);
		this.acs_.forEach((c, index) => {
			connectValues({
				primary: this.value,
				secondary: c.value,
				forward: (p) => config.assembly.toComponents(p)[index],
				backward: (p, s) => {
					const comps = config.assembly.toComponents(p);
					comps[index] = s;
					return config.assembly.fromComponents(comps);
				},
			});
		});

		this.view = new ExtendedPointNdTextView(doc, {
			textViews: this.acs_.map((ac) => ac.view),
			params: config.params
		});
	}

	get textControllers(): NumberTextController[] {
		return this.acs_;
	}
}
