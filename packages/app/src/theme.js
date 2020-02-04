//
// Copyright 2019 Wireline, Inc.
//

import { createMuiTheme } from '@material-ui/core/styles';

const theme = createMuiTheme({
  props: {
    MuiButtonBase: {
      disableRipple: true
    },
  },

  overrides: {
    MuiCssBaseline: {
      '@global': {
        body: {
          margin: 0
        }
      }
    }
  }
});

export default theme;
