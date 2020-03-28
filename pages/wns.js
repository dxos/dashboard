//
// Copyright 2020 DxOS
//

import moment from 'moment';
import React, { Fragment, useContext, useEffect, useState } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import grey from '@material-ui/core/colors/grey';
import Button from '@material-ui/core/Button';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import MuiLink from '@material-ui/core/Link';
import TableContainer from '@material-ui/core/TableContainer';
import Table from '@material-ui/core/Table';
import MuiTableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableBody from '@material-ui/core/TableBody';
import OpenIcon from '@material-ui/icons/OpenInBrowser';

import { Registry } from '@wirelineio/registry-client';

import { apiRequest } from '../src/request';
import { withLayout } from '../src/components/Layout';
import AppContext from '../src/components/AppContext';
import Toolbar from '../src/components/Toolbar';
import Json from '../src/components/Json';
import Content from '../src/components/Content';
import Error from '../src/components/Error';

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

const useStyles = makeStyles(theme => ({

  tableContainer: {
    flex: 1,
    overflowY: 'scroll'
  },

  table: {
    tableLayout: 'fixed',
  },

  logContainer: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden'
  },

  logScroller: {
    display: 'flex',
    flex: 1,
    overflow: 'scroll',
    backgroundColor: grey[100],
  },

  log: {
    padding: theme.spacing(1),
    fontFamily: 'monospace'
  },

  result: {
    flexShrink: 0
  },

  colShort: {
    width: 160
  },

  types: {
    display: 'flex',
    flex: 1,
    marginLeft: theme.spacing(3)
  },

  selected: {
    backgroundColor: grey[300]
  },
}));

const types = [
  { key: null, label: 'ALL' },
  { key: 'wrn:bot-factory', label: 'Bot Factory' },
  { key: 'wrn:bot', label: 'Bot' },
  { key: 'wrn:app', label: 'App' },
  { key: 'wrn:type', label: 'Type' }
];

const joinErrors = errors => {
  return errors ? errors.map(({ message }) => message).join('; ') : '';
};

const Page = () => {
  const { config } = useContext(AppContext);
  const classes = useStyles();
  const [{ registry, endpoint }, setRegistry] = useState({});
  const [{ ts, result, error } = {}, setStatus] = useState({});
  const [type, setType] = useState(types[0].key);
  const [records, setRecords] = useState([]);
  const [log, setLog] = useState([]);

  const resetError = () => setStatus({ ts, result, error: undefined });

  useEffect(() => {
    // eslint-disable-next-line prefer-destructuring
    let endpoint = config.services.wns.endpoint;
    if (typeof window !== 'undefined') {
      const { protocol, hostname } = window.location;
      const { port, graphql } = config.routes.wns;
      endpoint = `${protocol}//${hostname}:${port || 80}${graphql}`;
    }

    setRegistry({ registry: new Registry(endpoint), endpoint });
  }, []);

  const handleRefresh = () => {
    registry.getStatus()
      .then(result => {
        setStatus({ ts: Date.now(), result });

        registry.queryRecords({ type })
          .then(records => setRecords(records))
          .catch(({ errors }) => setStatus({ ts: Date.now(), result, error: joinErrors(errors) }));
      })
      .catch(error => {
        setStatus({ ts: Date.now(), error: error.statusText || 'Connection error.' });
      });
  };

  const handleStart = async () => {
    const { ts, error } = await apiRequest('/api/wns?command=start');
    if (error) {
      setStatus({ ts, error });
    } else {
      await handleRefresh();
    }
  };

  const handleStop = async () => {
    const status = await apiRequest('/api/wns?command=shutdown');
    setStatus(status);
  };

  // TODO(burdon): Need to set polling timestamp to now.
  const handleLogClear = () => {
    setLog([]);
  };

  useEffect(() => {
    // Polling for logs.
    const logInterval = setInterval(async () => {
      const { result = [] } = await apiRequest('/api/wns?command=log');
      setLog(result);
    }, LOG_POLL_INTERVAL);

    return () => {
      clearInterval(logInterval);
    };
  }, []);

  useEffect(() => {
    if (registry) {
      registry.queryRecords({ type })
        .then(records => setRecords(records))
        .catch(({ errors }) => setStatus({ error: joinErrors(errors) }));
    }
  }, [registry, type]);

  return (
    <Fragment>
      <Toolbar>
        <div>
          <Button color="primary" onClick={handleRefresh}>Refresh</Button>
          <Button onClick={handleStart}>Start</Button>
          <Button onClick={handleStop}>Stop</Button>
        </div>
        <div className={classes.types}>
          <ButtonGroup
            disableRipple
            disableFocusRipple
            variant="outlined"
            color="primary"
            size="small"
            aria-label="text primary button group"
          >
            {types.map(t => (
              <Button
                key={t.key}
                className={t.key === type && classes.selected}
                onClick={() => setType(t.key)}
              >
                {t.label}
              </Button>
            ))}
          </ButtonGroup>
        </div>
        <div>
          <MuiLink href={endpoint} rel="noreferrer" target="_blank">
            <OpenIcon />
          </MuiLink>
        </div>
      </Toolbar>

      <Content updated={ts}>
        <div className={classes.tableContainer}>
          <TableContainer>
            <Table stickyHeader size="small" className={classes.table}>
              <TableHead>
                <TableRow>
                  <TableCell className={classes.colShort}>ID</TableCell>
                  <TableCell className={classes.colShort}>Type</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell className={classes.colShort}>Version</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map(({ id, type, name, version, createTime }) => (
                  <TableRow key={id} size="small">
                    <TableCell>{id}</TableCell>
                    <TableCell>{type}</TableCell>
                    <TableCell>{name}</TableCell>
                    <TableCell>{version}</TableCell>
                    <TableCell>{moment.utc(createTime).fromNow()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>

        <div className={classes.result}>
          <Json json={result} />
        </div>

        <div className={classes.logContainer}>
          <Toolbar variant="dense">
            <div>
              <Button size="small" onClick={handleLogClear}>Clear Log</Button>
            </div>
          </Toolbar>
          <div className={classes.logScroller}>
            <div className={classes.log}>
              { log.reverse().map((line, i) => <div key={i}>{line}</div>) }
            </div>
          </div>
        </div>
      </Content>

      <Error message={error} onClose={resetError} />
    </Fragment>
  );
};

export default withLayout(Page);
