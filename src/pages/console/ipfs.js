//
// Copyright 2020 DxOS
//

import IpfsHttpClient from 'ipfs-http-client';
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

import ControlButtons from '../../components/ControlButtons';
import Content from '../../components/Content';
import Error from '../../components/Error';
import Layout from '../../components/Layout';
import TableCell from '../../components/TableCell';
import Toolbar from '../../components/Toolbar';

export { getServerSideProps } from '../../lib/server/config';

const SERVICE_NAME = 'ipfs';

const useStyles = makeStyles(() => ({
  tableContainer: {
    flex: 1,
    overflowY: 'scroll'
  },

  table: {
    tableLayout: 'fixed',

    '& th': {
      fontVariant: 'all-small-caps',
      fontSize: 18,
      cursor: 'ns-resize'
    }
  }
}));

/**
 * NOTE: Must set-up CORS first.
 * https://github.com/ipfs/js-ipfs-http-client#in-a-web-browser
 * https://github.com/ipfs/js-ipfs-http-client/tree/master/examples/bundle-webpack#setup
 * https://github.com/ipfs/js-ipfs-http-client/blob/master/examples/bundle-webpack/src/App.js
 * ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin "[\"*\"]"
 * ipfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials "[\"true\"]"
 *
 * @constructor
 */
const Page = ({ config }) => {
  const classes = useStyles();
  const { ifMounted } = useIsMounted();
  const [{ ts, result, error }, setStatus] = useState({});

  const resetError = () => setStatus({ ts, result, error: undefined });

  const handleRefresh = async () => {
    try {
      // https://github.com/ipfs/js-ipfs-http-client#api
      const ipfs = IpfsHttpClient(getServiceUrl(config, 'ipfs.server', { absolute: true }));
      const version = await ipfs.version();
      const status = await ipfs.id();

      // All local files.
      // TODO(burdon): Join with WNS query?
      let files = 0;
      const refs = [];
      for await (const ref of ipfs.refs.local()) {
        if (ref.err) {
          console.error(ref.err);
        } else {
          files++;
          // refs.push(ref.ref);
        }
      }

      ifMounted(() => {
        status.addresses = status.addresses.map(address => String(address));
        setStatus({ ts: Date.now(), result: { version, status, refs, files } });
      });
    } catch (error) {
      let message = String(error);
      if (String(error).match(/Failed to fetch/)) {
        message = [
          message, 'Make sure CORS is enabled.'
        ];
      }

      ifMounted(() => setStatus({ ts: Date.now(), error: message }));
    }
  };

  // TODO(burdon): Link to Chrome extension (info panel).
  // https://chrome.google.com/webstore/detail/ipfs-companion/nibjojkomfdiaoajekhjakgkdhaomnch?hl=en
  const handleStart = async () => {
    // TODO(burdon): Can we detach after matching.
    const { ts, error } = await httpGet('/api/service', { service: SERVICE_NAME, command: 'start' });
    setStatus({ ts, error });
    if (!error) {
      setTimeout(() => {
        handleRefresh();
      }, 5000);
    }
  };

  const handleStop = async () => {
    const status = await httpGet('/api/service', { service: SERVICE_NAME, command: 'stop' });
    setStatus(status);
  };

  const handleOpen = () => {
    // TODO(burdon): Convert link.
    window.open(config.services.ipfs.webui, '_ipfs_');
  };

  useEffect(ignorePromise(handleRefresh), []);

  const { refs = [], files, ...rest } = result || {};

  return (
    <Layout config={config}>
      <Toolbar>
        <div>
          <IconButton onClick={handleRefresh} title="Restart">
            <RefreshIcon />
          </IconButton>
        </div>

        <ControlButtons onStart={handleStart} onStop={handleStop} onOpen={handleOpen} />
      </Toolbar>

      <Content updated={ts}>
        {refs.length > 0 && (
          <TableContainer className={classes.tableContainer}>
            <Table stickyHeader size="small" className={classes.table}>
              <TableHead>
                <TableRow>
                  <TableCell>Hash</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {refs.map((ref) => (
                  <TableRow key={ref} size="small">
                    <TableCell monospace>{ref}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <JsonTreeView data={{ ...rest, stats: { files } }} />
      </Content>

      <Error message={error} onClose={resetError} />
    </Layout>
  );
};

export default Page;
