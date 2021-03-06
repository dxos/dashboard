//
// Copyright 2020 DxOS
//

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

import { getServiceUrl, httpGet, ignorePromise } from '../../lib/util';
import { useIsMounted } from '../../hooks';

import Content from '../../components/Content';
import ControlButtons from '../../components/ControlButtons';
import Error from '../../components/Error';
import Layout from '../../components/Layout';
import TableCell from '../../components/TableCell';
import Toolbar from '../../components/Toolbar';

const SERVICE_NAME = 'signal';

export { getServerSideProps } from '../../lib/server/config';

const useStyles = makeStyles(() => ({
  table: {
    tableLayout: 'fixed'
  },

  colShort: {
    width: 160
  }
}));

const Page = ({ config }) => {
  const classes = useStyles();
  const { ifMounted } = useIsMounted();
  const [{ ts, result: { version, channels = [] } = {}, error }, setStatus] = useState({});

  const resetError = () => setStatus({ ts, error: undefined });

  const handleRefresh = async () => {
    const status = await httpGet(getServiceUrl(config, 'signal.api', { absolute: true }));
    ifMounted(() => setStatus(status));
  };

  const handleStart = async () => {
    const status = await httpGet('/api/service', { service: SERVICE_NAME, command: 'start' });
    ifMounted(() => {
      setStatus(status);
      handleRefresh();
    });
  };

  const handleStop = async () => {
    const status = await httpGet('/api/service', { service: SERVICE_NAME, command: 'stop' });
    ifMounted(() => {
      setStatus(status);
      handleRefresh();
    });
  };

  useEffect(ignorePromise(handleRefresh), []);

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
        <TableContainer>
          <Table stickyHeader size="small" className={classes.table}>
            <TableHead>
              <TableRow>
                <TableCell className={classes.colShort}>Channel</TableCell>
                <TableCell className={classes.colShort}>Peers</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {channels.map(({ channel, peers }) => (
                <TableRow key={channel} size="small">
                  <TableCell monospace>{channel}</TableCell>
                  <TableCell monospace>
                    {peers.map(peer => <div key={peer}>{ peer }</div>)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <JsonTreeView data={{ version }} />
      </Content>

      <Error message={error} onClose={resetError} />
    </Layout>
  );
};

export default Page;
