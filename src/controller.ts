import { bindFoldable, connectValues, createValue, findNextTarget, Foldable, forceCast, getHorizontalStepKeys, getStepForKey, getVerticalStepKeys, isArrowKey, isEmpty, mapRange, NumberTextProps, Parser, PickerLayout, PointAxis, PointerData, PointerHandler, PointerHandlerEvent, PointerHandlerEvents, PointNdAssembly, PopupController, SliderProps, supportsTouch, Tuple2, Value, ValueChangeOptions, ValueController, ValueMap, ViewProps } from '@tweakpane/core';
import { Point2d, Point2dAssembly } from '@tweakpane/core/dist/input-binding/point-2d/model/point-2d.js';
import { NumberTextView, ExtendedPointNdTextView, Point2dView, Point2dPickerProps, Point2dPickerView } from './view.js';

interface Config2d {
	axes: Tuple2<PointAxis>;
	expanded: boolean;
	invertsY: boolean;
	max: number;
	parser: Parser<number>;
	pickerLayout?: PickerLayout;
	value: Value<Point2d>;
	params: any;
	viewProps: ViewProps;
}

// export class ExtendedPoint2dController extends Point2dController {
// 	private readonly extendedtextController_: PointNdTextController<Point2d>;
// 	constructor(doc: Document, config: Config2d) {
// 		super(doc, config);
// 		this.extendedtextController_ = new PointNdTextController(doc, {
// 			assembly: Point2dAssembly,
// 			axes: config.axes,
// 			parser: config.parser,
// 			value: this.value,
// 			params: config.params,
// 			viewProps: this.viewProps,
// 		});
// 		this.view.textElement.childNodes.forEach((node) => node.remove());
// 		this.view.textElement.appendChild(this.extendedtextController_.view.element);

// 		// remove picker button if one of axies disabled
// 		const isX = (config.params.x && config.params.x.disabled);
// 		const isY = (config.params.y && config.params.y.disabled);
// 		if (isX || isY) {
// 			this.view.buttonElement.remove();
// 		}
// 	}

// 	get textControllers(): PointNdTextController<Point2d> {
// 		return this.extendedtextController_;
// 	}
// }

interface ConfigP {
	layout?: PickerLayout;
	props: Point2dPickerProps;
	value: Value<Point2d>;
	viewProps: ViewProps;
}

function computeOffset(
	ev: KeyboardEvent,
	keyScales: Tuple2<number>,
	invertsY: boolean,
): [number, number] {
	return [
		getStepForKey(keyScales[0], getHorizontalStepKeys(ev)),
		getStepForKey(keyScales[1], getVerticalStepKeys(ev)) * (invertsY ? 1 : -1),
	];
}

export class Point2dPickerController
	implements ValueController<Point2d, Point2dPickerView> {
	public readonly props: Point2dPickerProps;
	public readonly value: Value<Point2d>;
	public readonly view: Point2dPickerView;
	public readonly viewProps: ViewProps;
	private readonly ptHandler_: PointerHandler;

	constructor(doc: Document, config: ConfigP) {
		this.onPadKeyDown_ = this.onPadKeyDown_.bind(this);
		this.onPadKeyUp_ = this.onPadKeyUp_.bind(this);
		this.onPointerDown_ = this.onPointerDown_.bind(this);
		this.onPointerMove_ = this.onPointerMove_.bind(this);
		this.onPointerUp_ = this.onPointerUp_.bind(this);

		this.props = config.props;
		this.value = config.value;
		this.viewProps = config.viewProps;

		this.view = new Point2dPickerView(doc, {
			layout: config.layout,
			props: this.props,
			value: this.value,
			viewProps: this.viewProps,
		});

		this.ptHandler_ = new PointerHandler(this.view.padElement);
		this.ptHandler_.emitter.on('down', this.onPointerDown_);
		this.ptHandler_.emitter.on('move', this.onPointerMove_);
		this.ptHandler_.emitter.on('up', this.onPointerUp_);

		this.view.padElement.addEventListener('keydown', this.onPadKeyDown_);
		this.view.padElement.addEventListener('keyup', this.onPadKeyUp_);
	}

	private handlePointerEvent_(d: PointerData, opts: ValueChangeOptions): void {
		if (!d.point) {
			return;
		}

		const max = this.props.get('max');
		const px = mapRange(d.point.x, 0, d.bounds.width, -max, +max);
		const py = mapRange(
			this.props.get('invertsY') ? d.bounds.height - d.point.y : d.point.y,
			0,
			d.bounds.height,
			-max,
			+max,
		);
		this.value.setRawValue(new Point2d(px, py), opts);
	}

	private onPointerDown_(ev: PointerHandlerEvents['down']): void {
		this.handlePointerEvent_(ev.data, {
			forceEmit: false,
			last: false,
		});
	}

	private onPointerMove_(ev: PointerHandlerEvents['move']): void {
		this.handlePointerEvent_(ev.data, {
			forceEmit: false,
			last: false,
		});
	}

	private onPointerUp_(ev: PointerHandlerEvents['up']): void {
		this.handlePointerEvent_(ev.data, {
			forceEmit: true,
			last: true,
		});
	}

	private onPadKeyDown_(ev: KeyboardEvent): void {
		if (isArrowKey(ev.key)) {
			ev.preventDefault();
		}

		const [dx, dy] = computeOffset(
			ev,
			[this.props.get('xKeyScale'), this.props.get('yKeyScale')],
			this.props.get('invertsY'),
		);
		if (dx === 0 && dy === 0) {
			return;
		}

		this.value.setRawValue(
			new Point2d(this.value.rawValue.x + dx, this.value.rawValue.y + dy),
			{
				forceEmit: false,
				last: false,
			},
		);
	}

	private onPadKeyUp_(ev: KeyboardEvent): void {
		const [dx, dy] = computeOffset(
			ev,
			[this.props.get('xKeyScale'), this.props.get('yKeyScale')],
			this.props.get('invertsY'),
		);
		if (dx === 0 && dy === 0) {
			return;
		}

		this.value.setRawValue(this.value.rawValue, {
			forceEmit: true,
			last: true,
		});
	}
}

export class Point2dController implements ValueController<Point2d, Point2dView> {
	public readonly value: Value<Point2d>;
	public readonly view: Point2dView;
	public readonly viewProps: ViewProps;
	private readonly popC_: PopupController | null;
	private readonly pickerC_: Point2dPickerController;
	private readonly textC_: PointNdTextController<Point2d>;
	private readonly foldable_: Foldable;

	constructor(doc: Document, config: Config2d) {
		this.onPopupChildBlur_ = this.onPopupChildBlur_.bind(this);
		this.onPopupChildKeydown_ = this.onPopupChildKeydown_.bind(this);
		this.onPadButtonBlur_ = this.onPadButtonBlur_.bind(this);
		this.onPadButtonClick_ = this.onPadButtonClick_.bind(this);

		this.value = config.value;
		this.viewProps = config.viewProps;

		this.foldable_ = Foldable.create(config.expanded);

		this.popC_ =
			config.pickerLayout === 'popup'
				? new PopupController(doc, {
					viewProps: this.viewProps,
				})
				: null;

		const padC = new Point2dPickerController(doc, {
			layout: config.pickerLayout,
			props: new ValueMap({
				invertsY: createValue(config.invertsY),
				max: createValue(config.max),
				xKeyScale: config.axes[0].textProps.value('keyScale'),
				yKeyScale: config.axes[1].textProps.value('keyScale'),
			}),
			value: this.value,
			viewProps: this.viewProps,
		});
		padC.view.allFocusableElements.forEach((elem: any) => {
			elem.addEventListener('blur', this.onPopupChildBlur_);
			elem.addEventListener('keydown', this.onPopupChildKeydown_);
		});
		this.pickerC_ = padC;

		this.textC_ = new PointNdTextController(doc, {
			assembly: Point2dAssembly,
			axes: config.axes,
			parser: config.parser,
			value: this.value,
			params: config.params,
			viewProps: this.viewProps,
		});

		this.view = new Point2dView(doc, {
			expanded: this.foldable_.value('expanded'),
			pickerLayout: config.pickerLayout,
			viewProps: this.viewProps,
		});
		this.view.textElement.appendChild(this.textC_.view.element);
		this.view.buttonElement?.addEventListener('blur', this.onPadButtonBlur_);
		this.view.buttonElement?.addEventListener('click', this.onPadButtonClick_);

		if (this.popC_) {
			this.view.element.appendChild(this.popC_.view.element);
			this.popC_.view.element.appendChild(this.pickerC_.view.element);

			connectValues({
				primary: this.foldable_.value('expanded'),
				secondary: this.popC_.shows,
				forward: (p) => p,
				backward: (_, s) => s,
			});
		} else if (this.view.pickerElement) {
			this.view.pickerElement.appendChild(this.pickerC_.view.element);

			bindFoldable(this.foldable_, this.view.pickerElement);
		}
	}

	get textController(): PointNdTextController<Point2d> {
		return this.textC_;
	}

	private onPadButtonBlur_(e: FocusEvent) {
		if (!this.popC_) {
			return;
		}

		const elem = this.view.element;
		const nextTarget: HTMLElement | null = forceCast(e.relatedTarget);
		if (!nextTarget || !elem.contains(nextTarget)) {
			this.popC_.shows.rawValue = false;
		}
	}

	private onPadButtonClick_(): void {
		this.foldable_.set('expanded', !this.foldable_.get('expanded'));
		if (this.foldable_.get('expanded')) {
			this.pickerC_.view.allFocusableElements[0].focus();
		}
	}

	private onPopupChildBlur_(ev: FocusEvent): void {
		if (!this.popC_) {
			return;
		}

		const elem = this.popC_.view.element;
		const nextTarget = findNextTarget(ev);
		if (nextTarget && elem.contains(nextTarget)) {
			// Next target is in the popup
			return;
		}
		if (
			nextTarget &&
			nextTarget === this.view.buttonElement &&
			!supportsTouch(elem.ownerDocument)
		) {
			// Next target is the trigger button
			return;
		}

		this.popC_.shows.rawValue = false;
	}

	private onPopupChildKeydown_(ev: KeyboardEvent): void {
		if (this.popC_) {
			if (ev.key === 'Escape') {
				this.popC_.shows.rawValue = false;
			}
		} else if (this.view.pickerElement) {
			if (ev.key === 'Escape') {
				this.view.buttonElement?.focus();
			}
		}
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
