import { bindValue, ClassName, constrainRange, createSvgIconElement, InputView, mapRange, NumberTextProps, PickerLayout, SVG_NS, Value, ValueEvents, ValueMap, valueToClassName, View, ViewProps } from "@tweakpane/core";
import { PointNdTextView } from "@tweakpane/core/dist/input-binding/common/view/point-nd-text.js";
import { Point2d } from "@tweakpane/core/dist/input-binding/point-2d/model/point-2d.js";
// import { ExtendedPoint2dInputParams, ExtendedPoint3dInputParams, ExtendedPoint4dInputParams } from "./plugin.js";


const indexToAxisLable: { [key in number]: string } = {
	0: 'x',
	1: 'y',
	2: 'z',
	3: 'w'
}

interface ConfigNd {
	textViews: NumberTextView[];
	params: any; //ExtendedPoint2dInputParams | ExtendedPoint3dInputParams | ExtendedPoint4dInputParams;
}

const classNameNd = ClassName('pndtxt');
const classNameExt = ClassName('ext');

export class ExtendedPointNdTextView extends PointNdTextView {
	constructor(doc: Document, config: ConfigNd) {
		super(doc, config as any); // FIXME: cast type
		this.element.lastChild?.remove();
		this.element.childNodes.forEach((node) => node.remove());
		this.element.firstChild?.remove();
		this.textViews.forEach((textView, index) => {
			textView.element.remove();

			const labelElement = doc.createElement('div');
			labelElement.classList.add(classNameExt('label'));
			labelElement.textContent = indexToAxisLable[index];
			this.element.appendChild(labelElement);

			const axisElem = doc.createElement('div');
			axisElem.classList.add(classNameNd('a'));
			axisElem.appendChild(textView.element);
			this.element.appendChild(axisElem);
		});

		this.textViews.forEach((textView, index) => {
			const isX = (config.params.x && config.params.x.disabled && index == 0);
			const isY = (config.params.y && config.params.y.disabled && index == 1);
			const isZ = (config.params.z && config.params.z.disabled && index == 2);
			const isW = (config.params.w && config.params.w.disabled && index == 3);
			if (isX || isY || isZ || isW) {
				textView.inputElement.value = '-';
			}
		});
	}
}

interface ConfigN {
	dragging: Value<number | null>;
	props: NumberTextProps;
	value: Value<number>;
	viewProps: ViewProps;

	arrayPosition?: 'fst' | 'mid' | 'lst';
}

const classNameN = ClassName('txt');

export class NumberTextView implements View, InputView {
	public readonly inputElement: HTMLInputElement;
	public readonly knobElement: HTMLElement;
	public readonly element: HTMLElement;
	public readonly value: Value<number>;
	private readonly props_: NumberTextProps;
	private readonly dragging_: Value<number | null>;
	private readonly guideBodyElem_: SVGPathElement;
	private readonly guideHeadElem_: SVGPathElement;
	private readonly tooltipElem_: HTMLElement;

	constructor(doc: Document, config: ConfigN) {
		this.onChange_ = this.onChange_.bind(this);

		this.props_ = config.props;
		this.props_.emitter.on('change', this.onChange_);

		this.element = doc.createElement('div');
		this.element.classList.add(classNameN(), classNameN(undefined, 'num'));
		if (config.arrayPosition) {
			this.element.classList.add(classNameN(undefined, config.arrayPosition));
		}
		config.viewProps.bindClassModifiers(this.element);

		const inputElem = doc.createElement('input');
		inputElem.classList.add(classNameN('i'));
		inputElem.classList.add('ext');
		inputElem.type = 'text';
		config.viewProps.bindDisabled(inputElem);
		this.element.appendChild(inputElem);
		this.inputElement = inputElem;

		this.onDraggingChange_ = this.onDraggingChange_.bind(this);

		this.dragging_ = config.dragging;
		this.dragging_.emitter.on('change', this.onDraggingChange_);

		this.element.classList.add(classNameN());
		this.inputElement.classList.add(classNameN('i'));

		const knobElem = doc.createElement('div');
		knobElem.classList.add(classNameN('k'));
		this.element.appendChild(knobElem);
		this.knobElement = knobElem;

		const guideElem = doc.createElementNS(SVG_NS, 'svg');
		guideElem.classList.add(classNameN('g'));
		this.knobElement.appendChild(guideElem);

		const bodyElem = doc.createElementNS(SVG_NS, 'path');
		bodyElem.classList.add(classNameN('gb'));
		guideElem.appendChild(bodyElem);
		this.guideBodyElem_ = bodyElem;

		const headElem = doc.createElementNS(SVG_NS, 'path');
		headElem.classList.add(classNameN('gh'));
		guideElem.appendChild(headElem);
		this.guideHeadElem_ = headElem;

		const tooltipElem = doc.createElement('div');
		tooltipElem.classList.add(ClassName('tt')());
		this.knobElement.appendChild(tooltipElem);
		this.tooltipElem_ = tooltipElem;

		config.value.emitter.on('change', this.onChange_);
		this.value = config.value;

		this.refresh();
	}

	private onDraggingChange_(ev: ValueEvents<number | null>['change']) {
		if (ev.rawValue === null) {
			this.element.classList.remove(classNameN(undefined, 'drg'));
			return;
		}

		this.element.classList.add(classNameN(undefined, 'drg'));

		const x = ev.rawValue / this.props_.get('pointerScale');
		const aox = x + (x > 0 ? -1 : x < 0 ? +1 : 0);
		const adx = constrainRange(-aox, -4, +4);
		this.guideHeadElem_.setAttributeNS(
			null,
			'd',
			[`M ${aox + adx},0 L${aox},4 L${aox + adx},8`, `M ${x},-1 L${x},9`].join(
				' ',
			),
		);
		this.guideBodyElem_.setAttributeNS(null, 'd', `M 0,4 L${x},4`);

		const formatter = this.props_.get('formatter');
		this.tooltipElem_.textContent = formatter(this.value.rawValue);
		this.tooltipElem_.style.left = `${x}px`;
	}

	public refresh(): void {
		const formatter = this.props_.get('formatter');
		this.inputElement.value = formatter(this.value.rawValue);
	}

	private onChange_(): void {
		this.refresh();
	}
}

interface Config2d {
	expanded: Value<boolean>;
	pickerLayout?: PickerLayout;
	viewProps: ViewProps;
}

const className2d = ClassName('p2d');

export class Point2dView implements View {
	public readonly element: HTMLElement;
	public readonly buttonElement?: HTMLButtonElement;
	public readonly textElement: HTMLElement;
	public readonly pickerElement: HTMLElement | null;

	constructor(doc: Document, config: Config2d) {
		this.element = doc.createElement('div');
		this.element.classList.add(className2d());
		config.viewProps.bindClassModifiers(this.element);
		bindValue(
			config.expanded,
			valueToClassName(this.element, className2d(undefined, 'expanded')),
		);

		const headElem = doc.createElement('div');
		headElem.classList.add(className2d('h'));
		this.element.appendChild(headElem);

		if (config.pickerLayout) {
			const buttonElem = doc.createElement('button');
			buttonElem.classList.add(className2d('b'));
			buttonElem.appendChild(createSvgIconElement(doc, 'p2dpad'));
			config.viewProps.bindDisabled(buttonElem);
			headElem.appendChild(buttonElem);
			this.buttonElement = buttonElem;
		}

		const textElem = doc.createElement('div');
		textElem.classList.add(className2d('t'));
		headElem.appendChild(textElem);
		this.textElement = textElem;

		if (config.pickerLayout === 'inline') {
			const pickerElem = doc.createElement('div');
			pickerElem.classList.add(className2d('p'));
			this.element.appendChild(pickerElem);
			this.pickerElement = pickerElem;
		} else {
			this.pickerElement = null;
		}
	}
}

export type Point2dPickerProps = ValueMap<{
	invertsY: boolean;
	max: number;
	xKeyScale: number;
	yKeyScale: number;
}>;

interface ConfigP {
	layout?: PickerLayout;
	props: Point2dPickerProps;
	value: Value<Point2d>;
	viewProps: ViewProps;
}

const className2dP = ClassName('p2dp');

export class Point2dPickerView implements View {
	public readonly element: HTMLElement;
	public readonly padElement: HTMLDivElement;
	public readonly value: Value<Point2d>;
	private readonly props_: Point2dPickerProps;
	private readonly svgElem_: Element;
	private readonly lineElem_: Element;
	private readonly markerElem_: HTMLElement;

	constructor(doc: Document, config: ConfigP) {
		this.onFoldableChange_ = this.onFoldableChange_.bind(this);
		this.onPropsChange_ = this.onPropsChange_.bind(this);
		this.onValueChange_ = this.onValueChange_.bind(this);

		this.props_ = config.props;
		this.props_.emitter.on('change', this.onPropsChange_);

		this.element = doc.createElement('div');
		this.element.classList.add(className2dP());
		if (config.layout === 'popup') {
			this.element.classList.add(className2dP(undefined, 'p'));
		}
		config.viewProps.bindClassModifiers(this.element);

		const padElem = doc.createElement('div');
		padElem.classList.add(className2dP('p'));
		config.viewProps.bindTabIndex(padElem);
		this.element.appendChild(padElem);
		this.padElement = padElem;

		const svgElem = doc.createElementNS(SVG_NS, 'svg');
		svgElem.classList.add(className2dP('g'));
		this.padElement.appendChild(svgElem);
		this.svgElem_ = svgElem;

		const xAxisElem = doc.createElementNS(SVG_NS, 'line');
		xAxisElem.classList.add(className2dP('ax'));
		xAxisElem.setAttributeNS(null, 'x1', '0');
		xAxisElem.setAttributeNS(null, 'y1', '50%');
		xAxisElem.setAttributeNS(null, 'x2', '100%');
		xAxisElem.setAttributeNS(null, 'y2', '50%');
		this.svgElem_.appendChild(xAxisElem);

		const yAxisElem = doc.createElementNS(SVG_NS, 'line');
		yAxisElem.classList.add(className2dP('ax'));
		yAxisElem.setAttributeNS(null, 'x1', '50%');
		yAxisElem.setAttributeNS(null, 'y1', '0');
		yAxisElem.setAttributeNS(null, 'x2', '50%');
		yAxisElem.setAttributeNS(null, 'y2', '100%');
		this.svgElem_.appendChild(yAxisElem);

		const lineElem = doc.createElementNS(SVG_NS, 'line');
		lineElem.classList.add(className2dP('l'));
		lineElem.setAttributeNS(null, 'x1', '50%');
		lineElem.setAttributeNS(null, 'y1', '50%');
		this.svgElem_.appendChild(lineElem);
		this.lineElem_ = lineElem;

		const markerElem = doc.createElement('div');
		markerElem.classList.add(className2dP('m'));
		this.padElement.appendChild(markerElem);
		this.markerElem_ = markerElem;

		config.value.emitter.on('change', this.onValueChange_);
		this.value = config.value;

		this.update_();
	}

	get allFocusableElements(): HTMLElement[] {
		return [this.padElement];
	}

	private update_(): void {
		const [x, y] = this.value.rawValue.getComponents();
		const max = this.props_.get('max');
		const px = mapRange(x, -max, +max, 0, 100);
		const py = mapRange(y, -max, +max, 0, 100);
		const ipy = this.props_.get('invertsY') ? 100 - py : py;
		this.lineElem_.setAttributeNS(null, 'x2', `${px}%`);
		this.lineElem_.setAttributeNS(null, 'y2', `${ipy}%`);
		this.markerElem_.style.left = `${px}%`;
		this.markerElem_.style.top = `${ipy}%`;
	}

	private onValueChange_(): void {
		this.update_();
	}

	private onPropsChange_(): void {
		this.update_();
	}

	private onFoldableChange_(): void {
		this.update_();
	}
}