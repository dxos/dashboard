//
// Copyright 2020 DxOS
//

import debug from 'debug';
import moment from 'moment';
import pick from 'lodash.pick';
import os from 'os';
import si from 'systeminformation';

import config from '../../lib/config';
import { exec } from './exec';

const log = debug('dxos:dashboard');

const num = new Intl.NumberFormat('en', { maximumSignificantDigits: 3 });

const size = (n, unit) => {
  const units = {
    K: 3,
    M: 6,
    G: 9,
    T: 12,
  };

  const power = units[unit] || 0;

  return num.format(Math.round(n / (10 ** power))) + (unit ? ` ${unit}` : '');
};

export default async (req, res) => {
  log(JSON.stringify(config));

  //
  // System
  // https://www.npmjs.com/package/systeminformation
  //
  let system;
  {
    // https://nodejs.org/api/os.html
    const opsys = {
      arch: os.arch(),
      type: os.type(),
      platform: os.platform(),
      version: os.version ? os.version() : undefined, // Node > 13
      uptime: moment().subtract(os.uptime(), 'seconds').fromNow()
    };

    const ifaces = os.networkInterfaces();
    const addresses = Object.entries(ifaces).reduce((result, [, values]) => {
      values.forEach(({ family, address }) => {
        if (family === 'IPv4' && address !== '127.0.0.1') {
          result.push(address);
        }
      });
      return result;
    }, []);

    const cpu = await si.cpu();
    const memory = await si.mem();
    const device = await si.system();

    system = {
      cpu: pick(cpu, 'brand', 'cores', 'manufacturer', 'vendor'),
      mem: {
        total: size(memory.total, 'M'),
        free: size(memory.free, 'M'),
        used: size(memory.used, 'M'),
        swaptotal: size(memory.swaptotal, 'M')
      },
      device: pick(device, 'model', 'serial', 'version'),
      network: {
        address: addresses.length === 1 ? addresses[0] : addresses
      },
      os: opsys
    };
  }

  //
  // Framework
  //
  const dxos = {
    dashboard: config.build,
    cli: await exec('wire', { args: ['--version'] })
  };

  const result = {
    system,
    dxos
  };

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ result }));
};
