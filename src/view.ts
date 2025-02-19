import { ClassName, InputView, NumberTextProps, Value, ValueEvents, View, ViewProps } from "@tweakpane/core";
import { PointNdTextView } from "@tweakpane/core/dist/input-binding/common/view/point-nd-text.js";
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
				textView.inputElement.value = '';
				(textView.inputElement as HTMLElement).setAttribute('disabled', '');
				// textView.knobElement.remove();
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
	// public readonly knobElement: HTMLElement;
	public readonly element: HTMLElement;
	public readonly value: Value<number>;
	private readonly props_: NumberTextProps;
	private readonly dragging_: Value<number | null>;
	// private readonly guideBodyElem_: SVGPathElement;
	// private readonly guideHeadElem_: SVGPathElement;
	// private readonly tooltipElem_: HTMLElement;

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
		inputElem.type = 'text';
		config.viewProps.bindDisabled(inputElem);
		this.element.appendChild(inputElem);
		this.inputElement = inputElem;

		this.onDraggingChange_ = this.onDraggingChange_.bind(this);

		this.dragging_ = config.dragging;
		this.dragging_.emitter.on('change', this.onDraggingChange_);

		this.element.classList.add(classNameN());
		this.inputElement.classList.add(classNameN('i'));

		// const knobElem = doc.createElement('div');
		// knobElem.classList.add(classNameN('k'));
		// this.element.appendChild(knobElem);
		// this.knobElement = knobElem;

		// const guideElem = doc.createElementNS(SVG_NS, 'svg');
		// guideElem.classList.add(classNameN('g'));
		// this.knobElement.appendChild(guideElem);

		// const bodyElem = doc.createElementNS(SVG_NS, 'path');
		// bodyElem.classList.add(classNameN('gb'));
		// guideElem.appendChild(bodyElem);
		// this.guideBodyElem_ = bodyElem;

		// const headElem = doc.createElementNS(SVG_NS, 'path');
		// headElem.classList.add(classNameN('gh'));
		// guideElem.appendChild(headElem);
		// this.guideHeadElem_ = headElem;

		// const tooltipElem = doc.createElement('div');
		// tooltipElem.classList.add(ClassName('tt')());
		// this.knobElement.appendChild(tooltipElem);
		// this.tooltipElem_ = tooltipElem;

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

		// const x = ev.rawValue / this.props_.get('pointerScale');
		// const aox = x + (x > 0 ? -1 : x < 0 ? +1 : 0);
		// const adx = constrainRange(-aox, -4, +4);
		// this.guideHeadElem_.setAttributeNS(
		// 	null,
		// 	'd',
		// 	[`M ${aox + adx},0 L${aox},4 L${aox + adx},8`, `M ${x},-1 L${x},9`].join(
		// 		' ',
		// 	),
		// );
		// this.guideBodyElem_.setAttributeNS(null, 'd', `M 0,4 L${x},4`);

		// const formatter = this.props_.get('formatter');
		// this.tooltipElem_.textContent = formatter(this.value.rawValue);
		// this.tooltipElem_.style.left = `${x}px`;
	}

	public refresh(): void {
		const formatter = this.props_.get('formatter');
		this.inputElement.value = formatter(this.value.rawValue);
	}

	private onChange_(): void {
		this.refresh();
	}
}