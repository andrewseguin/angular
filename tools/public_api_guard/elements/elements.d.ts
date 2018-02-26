/** @experimental */
export declare function createNgElementConstructor<T, P>(componentFactory: ComponentFactory<T>, config: NgElementConfig<T>): NgElementConstructor<P>;

/** @experimental */
export interface NgElementConfig<T> {
    getAttributeToPropertyInputs?: (factory: ComponentFactory<any>) => Map<string, string>;
    strategyFactory: NgElementStrategyFactoryBase;
}

/** @experimental */
export interface NgElementConstructor<P> {
    readonly observedAttributes: string[];
    new (): NgElement & WithProperties<P>;
}

/** @experimental */
export declare class NgElementStrategyFactory implements NgElementStrategyFactoryBase {
    constructor(injector: Injector);
    create<T>(componentFactory: ComponentFactory<T>): NgElementStrategy<T>;
}

/** @experimental */
export declare const VERSION: Version;
