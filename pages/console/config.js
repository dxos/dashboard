//
// Copyright 2020 DxOS
//

import React from 'react';

import { JsonTreeView } from '@dxos/react-ux';

import { getDyanmicConfig } from '../../lib/config';

import Content from '../../components/Content';
import Layout from '../../components/Layout';
import Toolbar from '../../components/Toolbar';

const Page = ({ config }) => {
  return (
    <Layout config={config}>
      <Toolbar />

      <Content>
        <JsonTreeView data={config} />
      </Content>
    </Layout>
  );
};

Page.getInitialProps = async () => ({ config: await getDyanmicConfig() });

export default Page;