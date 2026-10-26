/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

(function () {
  'use strict';

  const script = document.currentScript;
  const config = JSON.parse(
    document.querySelector('meta[name="c2pa-docs"]').content
  );
  const currentRoot = new URL('../', script.src);
  const packageRoot = new URL(config.prefix ? '../../' : './', currentRoot);
  const toolbar = document.querySelector('.tsd-toolbar-contents');
  if (!toolbar) {
    throw new Error(
      'Cannot find the TypeDoc toolbar for the version selector.'
    );
  }

  const label = document.createElement('label');
  label.className = 'api-version-selector';
  label.textContent = 'Version: ';
  const select = document.createElement('select');
  select.setAttribute(
    'aria-label',
    config.label + ' API documentation version'
  );
  for (const version of config.versions) {
    const option = document.createElement('option');
    option.value = new URL(
      'versions/' + version + '/index.html',
      packageRoot
    ).href;
    option.textContent = version;
    option.selected = version === config.version;
    select.appendChild(option);
  }
  select.addEventListener('change', function () {
    window.location.assign(select.value);
  });
  label.appendChild(select);
  toolbar.appendChild(label);

  const packages = document.createElement('a');
  packages.href = new URL('../index.html', packageRoot).href;
  packages.textContent = 'All packages';
  toolbar.appendChild(packages);
})();
