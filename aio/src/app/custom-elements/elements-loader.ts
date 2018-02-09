import {
  Inject,
  Injectable, NgModuleRef,
  InjectionToken, NgModuleFactory,
  NgModuleFactoryLoader,
} from '@angular/core';
import {ELEMENT_MODULE_PATHS_TOKEN, WithCustomElement} from './element-registry';

/** Injection token to provide Angular's custom element registration function. */
export const CREATE_NG_ELEMENT_CONSTRUCTOR =
  new InjectionToken('aio/register-as-custom-element');

@Injectable()
export class ElementsLoader {
  /** Map of unregistered custom elements and their respective module paths to load. */
  unregisteredElements: Map<string, string>;

  constructor(private moduleFactoryLoader: NgModuleFactoryLoader,
              private moduleRef: NgModuleRef<any>,
              @Inject(CREATE_NG_ELEMENT_CONSTRUCTOR) private createNgElementConstructor,
              @Inject(ELEMENT_MODULE_PATHS_TOKEN) elementModulePaths) {
    this.unregisteredElements = new Map(elementModulePaths);
  }

  /**
   * Queries the provided element for any custom elements that have not yet been registered with
   * the browser. Custom elements that are registered will be removed from the list of unregistered
   * elements so that they will not be queried in subsequent calls.
   */
  loadContainingCustomElements(element: HTMLElement) {
    Array.from(this.unregisteredElements.keys())
      .filter(s => element.querySelector(s))
      .forEach(s => {
        this.load(s)
          .then(() => this.unregisteredElements.delete(s))
          .catch(err => { throw Error(`Failed to load element ${s} with error ${err}`); });
      });

  }

  /** Loads the element's module and registers it as a custom element. */
  private load(selector: string) {
    const modulePath = this.unregisteredElements.get(selector)!;
    return this.moduleFactoryLoader.load(modulePath!)
      .then((ngModuleFactory: NgModuleFactory<WithCustomElement>) => {
        const moduleRef = ngModuleFactory.create(this.moduleRef.injector);
        const resolver = moduleRef.componentFactoryResolver;
        const componentFactory = resolver.resolveComponentFactory(moduleRef.instance.customElement);

        const def: any = this.createNgElementConstructor(componentFactory, ngModuleFactory);
        customElements!.define(def.is, def);
      });
  }
}
