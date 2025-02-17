import { ClassName, NumberTextView } from "@tweakpane/core";
import { PointNdTextView } from "@tweakpane/core/dist/input-binding/common/view/point-nd-text.js";
// import { ExtendedPoint2dInputParams, ExtendedPoint3dInputParams, ExtendedPoint4dInputParams } from "./plugin.js";

interface Config {
	textViews: NumberTextView[];
	params: any; //ExtendedPoint2dInputParams | ExtendedPoint3dInputParams | ExtendedPoint4dInputParams;
}

const className = ClassName('ext');

const indexToAxisLable: { [key in number]: string } = {
	0: 'x',
	1: 'y',
	2: 'z',
	3: 'w'
}

export class ExtendedPointNdTextView extends PointNdTextView {
	constructor(doc: Document, config: Config) {
		config.textViews.forEach((textView, index) => {
			const labelElement = doc.createElement('div');
			labelElement.classList.add(className('lable'));
			labelElement.textContent = indexToAxisLable[index];
			// TODO: refactor
			textView.element.lastChild?.appendChild(labelElement);
		});
		super(doc, config);
		this.disabling(config.params);
	}

	private disabling(params: any) {
		this.textViews.forEach((textView, index) => {
			const isX = (params.x && params.x.disabled && index == 0);
			const isY = (params.y && params.y.disabled && index == 1);
			const isZ = (params.z && params.z.disabled && index == 2);
			const isW = (params.w && params.w.disabled && index == 3);
			if (isX || isY || isZ || isW) {
				textView.inputElement.value = '';
				(textView.inputElement as HTMLElement).setAttribute('disabled', '');
				textView.knobElement.remove();
			}
		});
	}
}