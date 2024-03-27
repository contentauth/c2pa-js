/**
 * Copyright 2023 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../../../assets/svg/monochrome/generic-info.svg';
import { Configurable } from '../../mixins/configurable';
import { baseSectionStyles, defaultStyles } from '../../styles';
import { hasChanged } from '../../utils';

import '../Icon';
import '../PanelSection';
import defaultStringMap from './AIToolUsed.str.json';

declare global {
  interface HTMLElementTagNameMap {
    'cai-ai-tool': AIToolUsed;
  }

  namespace JSX {
    interface IntrinsicElements {
      'cai-ai-tool': any;
    }
  }
}

export interface AIToolUsedConfig {
  stringMap: Record<string, string>;
}

const defaultConfig: AIToolUsedConfig = {
  stringMap: defaultStringMap,
};

@customElement('cai-ai-tool')
export class AIToolUsed extends Configurable(LitElement, defaultConfig) {
  static get styles() {
    return [defaultStyles, baseSectionStyles];
  }

  @property({
    type: Object,
    hasChanged,
  })
  data: string[] | undefined;

  render() {
    return html` <cai-panel-section
      helpText=${this._config.stringMap['produced-by.helpText']}
    >
      <div slot="header">${this._config.stringMap['ai-tool-used.header']}</div>
      <div slot="content">${this.data}</div>
    </cai-panel-section>`;
  }
}
