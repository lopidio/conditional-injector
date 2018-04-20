import * as Options from "./options";

let injectableContainer: any = {};
export class Container {
    public static subclassesOf(superClass: any): ParentClassContainer {
        const superClassName: string = superClass.prototype.constructor.name;
        return injectableContainer[superClassName] || { create: () => null};
    }
}

const getSuperClassContainer = (superClassName: string): any => {
    if (!injectableContainer[superClassName])
        injectableContainer[superClassName] = new ParentClassContainer();

    return injectableContainer[superClassName];
}

export function Injectable(options?: Options.Options) {
    return function(constructor: any) {
        var superClassName = Object.getPrototypeOf(constructor.prototype).constructor.name;
        const className = constructor.prototype.constructor.name;
        const injectableContainer: ParentClassContainer = getSuperClassContainer(superClassName);

        let mergedOption = Options.createdDefaultOption(options);
        injectableContainer
            .addInjectable(
                {
                    name: className,
                    constructor: constructor,
                    options: mergedOption
                });
    };
}

type Injectable = {
    name: string;
    options: Options.Options;
    constructor: ObjectConstructor;
    singletonInstance?: any;
}

export class ParentClassContainer {

    private injectables: any = {};
    private default?: Injectable;

    public create = (argument?: any): any => {

        for (const injectable in this.injectables) {
            const factoryPredicate = this.injectables[injectable].options.predicate;
            let predicateResult = false;
            try {
                predicateResult = factoryPredicate(argument);
            }
            catch (err) {}
            if (factoryPredicate && predicateResult) {
                if (this.injectables[injectable].singletonInstance) {
                    return this.injectables[injectable].singletonInstance;
                }
                else if (this.injectables[injectable].options.scope == Options.Scope.Singleton) {
                    this.injectables[injectable].singletonInstance = new this.injectables[injectable].constructor(argument);
                    return this.injectables[injectable].singletonInstance;
                } else {
                    return new this.injectables[injectable].constructor(argument);
                }
            }

        }
        if (this.default) {
            if (this.default.singletonInstance) {
                console.log("Using singleton")
                return this.default.singletonInstance;
            }
            else if (this.default.options.scope == Options.Scope.Singleton) {
                this.default.singletonInstance = new this.default.constructor(argument) as Injectable;
                return this.default.singletonInstance;
            } else {
                return new this.default.constructor(argument);
            }
        }
        return null;
    }

    public createAll = (argument?: any): any[] => {
        console.log("Creating all")
        let returnList = [];
        for (const injectable in this.injectables) {
            if (this.injectables[injectable].singletonInstance) {
                returnList.push(this.injectables[injectable].singletonInstance);
            }
            else if (this.injectables[injectable].options.scope == Options.Scope.Singleton) {
                this.injectables[injectable].singletonInstance = new this.injectables[injectable].constructor(argument);
                returnList.push(this.injectables[injectable].singletonInstance);
            } else {
                returnList.push(new this.injectables[injectable].constructor(argument));
            }
        }
        if (this.default) {
            if (this.default.singletonInstance) {
                returnList.push(this.default.singletonInstance);
            }
            else if (this.default.options.scope == Options.Scope.Singleton) {
                console.log("Creating singleton")
                this.default.singletonInstance = new this.default.constructor(argument) as Injectable;
                returnList.push(this.default.singletonInstance);
            } else {
                returnList.push(new this.default.constructor(argument));
            }
        }

        return returnList;
    }

    public addInjectable = (injectable: Injectable): any => {
        if (!injectable.options.predicate) {
            this.default = injectable;
        }
        else {
            if (this.injectables[injectable.name])
                return null;
            this.injectables[injectable.name] = injectable;
        }
        return injectable;
    }
}
