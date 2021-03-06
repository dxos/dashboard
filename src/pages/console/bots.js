//
// Copyright 2020 DxOS
//

import moment from 'moment';
import React, { useEffect, useState } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import RefreshIcon from '@material-ui/icons/Refresh';

import { JsonTreeView } from '@dxos/react-ux';

import { httpGet } from '../../lib/util';

import ControlButtons from '../../components/ControlButtons';
import Content from '../../components/Content';
import Error from '../../components/Error';
import Log from '../../components/Log';
import TableCell from '../../components/TableCell';
import Toolbar from '../../components/Toolbar';
import Layout from '../../components/Layout';
import { useIsMounted } from '../../hooks';

export { getServerSideProps } from '../../lib/server/config';

const LOG_POLL_INTERVAL = 4 * 1000;

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
  }
}));

const Page = ({ config }) => {
  const classes = useStyles();
  const { ifMounted } = useIsMounted();
  const [{ ts, result = {}, error }, setStatus] = useState({});
  const { bots = [], ...stats } = result;
  const [log, setLog] = useState([]);

  const resetError = () => setStatus({ ts, error: undefined });

  const handleRefresh = async () => {
    // const status = await httpGet('/api/bots', { command: 'status' });
    // ifMounted(() => setStatus(status));
  };

  const handleStart = async () => {
    const { ts, error } = await httpGet('/api/bots', { command: 'start' });
    ifMounted(() => {
      setStatus({ ts, error });
      if (!error) {
        handleRefresh();
      }
    });
  };

  const handleStop = async () => {
    const status = await httpGet('/api/bots', { command: 'stop' });
    ifMounted(() => setStatus(status));
  };

  const handleLogClear = () => setLog([]);

  useEffect(() => {
    handleRefresh();

    // Polling for logs.
    const logInterval = setInterval(async () => {
      const { ts, error, result: { result } } = await httpGet('/api/bots', { command: 'logs' });
      ifMounted(() => {
        if (error) {
          setStatus({ ts, error });
        } else {
          setLog(result ? result.split('\n') : []);
        }
      });
    }, LOG_POLL_INTERVAL);

    return () => {
      clearInterval(logInterval);
    };
  }, []);

  return (
    <Layout config={config}>
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
              {bots.map(({ type, spec, party, started }, i) => (
                // TODO(burdon): Use id for key.
                <TableRow key={i} size="small">
                  <TableCell>{type}</TableCell>
                  <TableCell>{party}</TableCell>
                  <TableCell>{spec}</TableCell>
                  <TableCell>{moment(started).fromNow()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <JsonTreeView data={stats} />

        <Log log={log} onClear={handleLogClear} />
      </Content>

      <Error message={error} onClose={resetError} />
    </Layout>
  );
};

export default Page;
