//
// Copyright 2020 DxOS
//

import { createContext } from 'react';

import config from '../lib/config';

const AppContext = createContext({ config });

export default AppContext;