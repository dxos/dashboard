//
// Copyright 2020 DxOS
//

import moment from 'moment';
import React, { Fragment, useEffect, useState } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';
import MuiTableCell from '@material-ui/core/TableCell';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import RefreshIcon from '@material-ui/icons/Refresh';

import { createId } from '@dxos/crypto';

import { apiRequest } from '../lib/request';
import { withLayout } from '../hooks';

import ControlButtons from '../components/ControlButtons';
import Toolbar from '../components/Toolbar';
import Content from '../components/Content';
import Error from '../components/Error';
import Json from '../components/Json';
import Log from '../components/Log';

const LOG_POLL_INTERVAL = 3 * 1000;

const TableCell = ({ children, ...rest }) => (
  <MuiTableCell
    {...rest}
    style={{
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }}
  >
    {children}
  </MuiTableCell>
);

const useStyles = makeStyles(() => ({
  tableContainer: {
    flex: 1,
    overflowY: 'scroll'
  },

  table: {
    tableLayout: 'fixed',

    '& th': {
      fontVariant: 'all-small-caps',
      fontSize: 18
    }
  },

  colShort: {
    width: 160
  },

  result: {
    flexShrink: 0
  }
}));

const Page = () => {
  const classes = useStyles();
  const [{ ts, result = {}, error }, setStatus] = useState({});
  const { bots = [], ...stats } = result;
  const [log, setLog] = useState([]);

  const resetError = () => setStatus({ ts, error: undefined });

  const handleRefresh = async () => {
    const status = await apiRequest('/api/bots?command=status');
    setStatus({ ...status, ts: Date.now() });
  };

  const handleStart = async () => {
    const { ts, error } = await apiRequest('/api/bots?command=start');
    if (error) {
      setStatus({ ts, error });
    } else {
      await handleRefresh();
    }
  };

  const handleStop = async () => {
    const status = await apiRequest('/api/bots?command=shutdown');
    setStatus(status);
  };

  const handleLogClear = () => setLog([]);

  useEffect(() => {
    handleRefresh();

    // Polling for logs.
    const logInterval = setInterval(async () => {
      const { result } = await apiRequest('/api/bots?command=log');
      setLog(result);
    }, LOG_POLL_INTERVAL);

    return () => {
      clearInterval(logInterval);
    };
  }, []);

  return (
    <Fragment>
      <Toolbar>
        <div>
          <IconButton onClick={handleRefresh} title="Restart">
            <RefreshIcon />
          </IconButton>
        </div>

        <ControlButtons onStart={handleStart} onStop={handleStop} />
      </Toolbar>

      <Content updated={ts}>
        <TableContainer className={classes.tableContainer}>
          <Table stickyHeader size="small" className={classes.table}>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Party</TableCell>
                <TableCell>Spec</TableCell>
                <TableCell>Started</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bots.map(({ type, spec, party, started }) => (
                <TableRow key={createId()} size="small">
                  <TableCell>{type}</TableCell>
                  <TableCell>{party}</TableCell>
                  <TableCell>{spec}</TableCell>
                  <TableCell>{moment(started).fromNow()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <div className={classes.result}>
          <Json json={stats} />
        </div>

        <Log log={log} onClear={handleLogClear} />
      </Content>

      <Error message={error} onClose={resetError} />
    </Fragment>
  );
};

export default withLayout(Page);
