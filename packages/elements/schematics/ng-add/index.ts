/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Rule, SchematicContext, Tree, chain, noop} from '@angular-devkit/schematics';
import {NodePackageInstallTask} from '@angular-devkit/schematics/tasks';
import {Schema} from './schema';

export default function(options: Schema): Rule {
  return chain([
    options && options.skipPackageJson ? noop() : addPackageJsonDependency(), addScript(options)
  ]);
}

/** Adds a package.json dependency for document-register-element */
function addPackageJsonDependency() {
  return (host: Tree, context: SchematicContext) => {

    if (host.exists('package.json')) {
      const jsonStr = host.read('package.json') !.toString('utf-8');
      const json = JSON.parse(jsonStr);

      // If there are no dependencies, create an entry for dependencies.
      const type = 'dependencies';
      if (!json[type]) {
        json[type] = {};
      }

      const packages: {name: string, version: string}[] = [
        {name: 'document-register-element', version: '^1.8.1'},
        {name: '@angular/elements', version: '^6.0.0'},
      ];

      packages.forEach(pkg => {
        if (!json[type][pkg.name]) {
          json[type][pkg.name] = pkg.version;
          context.logger.log('info', `Added ${pkg.name} as a dependency.`);
        }
      });

      // Write the JSON back to package.json
      host.overwrite('package.json', JSON.stringify(json, null, 2));

      // Install the dependency
      context.addTask(new NodePackageInstallTask());
    }

    return host;
  };
}

/** Adds the document-register-element.js script to the angular CLI json. */
function addScript(options: Schema) {
  return (host: Tree, context: SchematicContext) => {
    const script = 'node_modules/document-register-element/build/document-register-element.js';


    try {
      // Handle the new json - angular.json
      const angularJsonFile = host.read('angular.json');
      if (angularJsonFile) {
        const json = JSON.parse(angularJsonFile.toString('utf-8'));
        const project = Object.keys(json['projects'])[0] || options.project;
        const scripts = json['projects'][project]['architect']['build']['options']['scripts'];
        scripts.push({input: script});
        host.overwrite('angular.json', JSON.stringify(json, null, 2));
      }
    } catch (e) {
      context.logger.log(
          'warn', 'Failed to add the polyfill document-register-element.js to scripts');
    }

    context.logger.log('info', 'Added document-register-element.js polyfill to scripts');

    return host;
  };
}
