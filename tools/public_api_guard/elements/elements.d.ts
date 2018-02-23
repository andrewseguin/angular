/** @experimental */
export declare function createNgElementConstructor<T, P>(componentFactory: ComponentFactory<T>, config: NgElementConfig<T>): NgElementConstructor<P>;

/** @experimental */
export interface NgElementConfig<T> {
    delegateFactory: NgElementDelegateFactoryBase<T>;
    getAttributeToPropertyInputs: (factory: ComponentFactory<any>) => Map<string, string>;
}

/** @experimental */
export interface NgElementConstructor<P> {
    readonly observedAttributes: string[];
    new (): HTMLElement & WithProperties<P>;
}

/** @experimental */
export declare class NgElementDelegateFactory<T> implements NgElementDelegateFactoryBase<T> {
    constructor(injector: Injector);
    create(componentFactory: ComponentFactory<T>): NgElementDelegate<T>;
}

/** @experimental */
export declare const VERSION: Version;
