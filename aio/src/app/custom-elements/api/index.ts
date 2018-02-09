import * as componentNgModuleModule from './api-list.module.ngfactory';
import * as componentNgFactoryModule from './api-list.component.ngfactory';
import { createNgElementConstructor } from '@angular/elements';

const ApiListComponentNgFactory = componentNgFactoryModule['ApiListComponentNgFactory'];
const ApiListModuleNgFactory = componentNgModuleModule['ApiListModuleNgFactory'];
export default createNgElementConstructor(ApiListComponentNgFactory, ApiListModuleNgFactory);
