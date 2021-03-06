//
// Copyright 2020 DxOS
//

import get from 'lodash.get';
import moment from 'moment';
import React, { Fragment, useEffect, useState } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import IconButton from '@material-ui/core/IconButton';
import Link from '@material-ui/core/Link';
import TableContainer from '@material-ui/core/TableContainer';
import Table from '@material-ui/core/Table';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableBody from '@material-ui/core/TableBody';
import RefreshIcon from '@material-ui/icons/Refresh';

import { JsonTreeView } from '@dxos/react-ux';

import { getServiceUrl, httpGet, ignorePromise } from '../../lib/util';
import { useRegistry, useIsMounted } from '../../hooks';

import ControlButtons from '../../components/ControlButtons';
import Content from '../../components/Content';
import Error from '../../components/Error';
import Layout from '../../components/Layout';
import Log from '../../components/Log';
import Section from '../../components/Section';
import TableCell from '../../components/TableCell';
import Toolbar from '../../components/Toolbar';

export { getServerSideProps } from '../../lib/server/config';

const LOG_POLL_INTERVAL = 3 * 1000;

const SERVICE_NAME = 'wns-lite';

const useStyles = makeStyles(theme => ({
  buttons: {
    marginLeft: theme.spacing(2)
  },

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
  },

  colShort: {
    width: 160
  },

  selected: {},
}));

const types = [
  { key: null, label: 'ALL' },
  { key: 'wrn:app', label: 'App' },
  { key: 'wrn:bot', label: 'Bot' },
  { key: 'wrn:resource', label: 'Resource' },
  { key: 'wrn:service', label: 'Service' },
  { key: 'wrn:type', label: 'Type' },
  { key: 'wrn:xbox', label: 'XBox' },
];

/**
 * Render IPFS links in package.
 * @param {Object} config
 * @param {string} [type]
 * @param {string} pkg
 */
const PackageLink = ({ config, type, pkg }) => {

  // TODO(burdon): Pass in expected arg types.
  if (typeof pkg === 'string') {
    const ipfsUrl = getServiceUrl(config, 'ipfs.gateway', { path: `${pkg}` });
    return <Link href={ipfsUrl} target="ipfs">{pkg}</Link>;
  }

  // eslint-disable-next-line default-case
  switch (type) {
    case 'wrn:bot': {
      const packageLinks = [];
      Object.keys(pkg).forEach(platform => {
        Object.keys(pkg[platform]).forEach(arch => {
          const cid = pkg[platform][arch];
          const ipfsUrl = getServiceUrl(config, 'ipfs.gateway', { path: `${cid}` });

          packageLinks.push(
            <Fragment>
              <Link
                key={cid}
                href={ipfsUrl}
                title={cid}
                target="ipfs"
              >
                {platform}/{arch}: {cid}
              </Link>
            </Fragment>
          );
        });
      });

      return <Fragment>{packageLinks}</Fragment>;
    }
  }

  return null;
};

const Page = ({ config }) => {
  const classes = useStyles();
  const { ifMounted } = useIsMounted();
  const [{ ts, result, error } = {}, setStatus] = useState({});
  const [type, setType] = useState(types[0].key);
  const [records, setRecords] = useState([]);
  const [log, setLog] = useState([]);
  const [{ sort, ascend }, setSort] = useState({ sort: 'type', ascend: true });
  const { registry, webui } = useRegistry(config);

  const handleRefresh = async () => {
    // TODO(burdon): Format records.
    registry.getStatus()
      .then(result => {
        ifMounted(() => setStatus({ ts: Date.now(), result }));
      })
      .catch(() => {
        // TODO(burdon): Should return an Error.
        // const errors = [new Error('HTTP Error')];
        const errors = [{ message: 'HTTP Error' }];
        ifMounted(() => setStatus({ ts: Date.now(), error: errors.map(({ message }) => message) }));
      });

    registry.queryRecords({ type })
      .then(records => {
        ifMounted(() => setRecords(records));
      })
      .catch(() => {
        // TODO(burdon): Should return an Error.
        const errors = [{ message: 'HTTP Error' }];
        ifMounted(() => setStatus({ error: errors.map(({ message }) => message) }));
      });
  };

  const handleStart = async () => {
    const { ts, error } = await httpGet('/api/service', { service: SERVICE_NAME, command: 'start' });
    ifMounted(async () => {
      setStatus({ ts, error });
      if (!error) {
        await handleRefresh();
      }
    });
  };

  const handleStop = async () => {
    await httpGet('/api/service', { service: SERVICE_NAME, command: 'stop' });
    ifMounted(() => setStatus({}));
  };

  const handleOpen = () => {
    window.open(webui, '_wns_');
  };

  // TODO(burdon): Set polling timestamp to now.
  const handleLogClear = () => setLog([]);

  const handleResetErrors = () => setStatus({ ts, result, error: undefined });

  useEffect(ignorePromise(handleRefresh), [type]);

  // Polling for logs.
  useEffect(() => {
    const logInterval = setInterval(async () => {
      const { ts, error, result: { result: rawLog } } = await httpGet('/api/service', { service: SERVICE_NAME, command: 'logs' });
      if (error) {
        setStatus({ ts, result, error });
      } else {
        const log = rawLog.split('\n');
        setLog(log);
      }
    }, LOG_POLL_INTERVAL);

    return () => {
      clearInterval(logInterval);
    };
  }, []);

  // TODO(burdon): Factor out.
  const sortBy = field => () => setSort({ sort: field, ascend: (field === sort ? !ascend : true) });
  const sorter = (item1, item2) => {
    const a = get(item1, sort);
    const b = get(item2, sort);
    const dir = ascend ? 1 : -1;
    return (a < b) ? -1 * dir : (a > b) ? dir : 0;
  };

  return (
    <Layout config={config}>
      <Toolbar>
        <div>
          <IconButton onClick={handleRefresh} title="Restart">
            <RefreshIcon />
          </IconButton>
          <ButtonGroup
            className={classes.buttons}
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

        <ControlButtons onStart={handleStart} onStop={handleStop} onOpen={handleOpen} />
      </Toolbar>

      <Content updated={ts}>
        <TableContainer className={classes.tableContainer}>
          <Table stickyHeader size="small" className={classes.table}>
            <TableHead>
              <TableRow>
                <TableCell onClick={sortBy('type')} className={classes.colShort}>Type</TableCell>
                <TableCell onClick={sortBy('name')}>Name</TableCell>
                <TableCell onClick={sortBy('version')} className={classes.colShort}>Version</TableCell>
                <TableCell onClick={sortBy('attributes.displayName')}>Description</TableCell>
                <TableCell onClick={sortBy('attributes.package')}>Package Hash</TableCell>
                <TableCell onClick={sortBy('createTime')} className={classes.colShort}>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.sort(sorter)
                .map(({ id, type, name, version, createTime, attributes: { displayName, package: pkg } }) => (
                  <TableRow key={id} size="small">
                    <TableCell monospace>{type}</TableCell>
                    <TableCell monospace>{name}</TableCell>
                    <TableCell monospace>{version}</TableCell>
                    <TableCell>{displayName}</TableCell>
                    <TableCell title={JSON.stringify(pkg)} monospace>
                      {pkg && (
                        <PackageLink config={config} type={type} pkg={pkg} />
                      )}
                    </TableCell>
                    <TableCell>{moment.utc(createTime).fromNow()}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Section label="Properties">
          <JsonTreeView data={result} expanded={['sync']} label="status" />
        </Section>

        <Section label="Log">
          <Log log={log} onClear={handleLogClear} />
        </Section>
      </Content>

      <Error message={error} onClose={handleResetErrors} />
    </Layout>
  );
};

export default Page;
