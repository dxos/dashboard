//
// Copyright 2020 DxOS
//

import debug from 'debug';
import React from 'react';
import Document, { Head, Main, NextScript } from 'next/document';
import { ServerStyleSheets } from '@material-ui/core/styles';

import logo from '../../config/logo.txt';
import config from '../lib/config';
import createTheme from '../lib/theme';

const log = debug('dxos:dashboard');

/**
 * Server-side document rendering.
 * https://nextjs.org/docs/advanced-features/custom-document
 */
class DashboardDocument extends Document {
  render() {
    return (
      <html lang="en">
        <Head>
          {/* PWA primary color */}
          <meta name="theme-color" content={createTheme(config).palette.primary} />
          <link rel="shortcut icon" href="/console/favicon.ico" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </html>
    );
  }
}

/**
 * Resolution order:
 *
 * On the server:
 * 1. app.getInitialProps
 * 2. page.getInitialProps
 * 3. document.getInitialProps
 * 4. app.render
 * 5. page.render
 * 6. document.render
 *
 * On the server with error:
 * 1. document.getInitialProps
 * 2. app.render
 * 3. page.render
 * 4. document.render
 *
 * On the client:
 * 1. app.getInitialProps
 * 2. page.getInitialProps
 * 3. app.render
 * 4. page.render
 *
 * @param {Object} ctx
 */
DashboardDocument.getInitialProps = async ctx => {
  const { build: { name, version } } = config;

  console.log();
  console.log(logo);
  console.log(`  ${name} ${version}`);
  console.log();

  log('Config:', JSON.stringify(config, undefined, 2));

  // Render app and page and get the context of the page with collected side effects.
  const sheets = new ServerStyleSheets();
  const originalRenderPage = ctx.renderPage;

  ctx.renderPage = () => originalRenderPage({
    enhanceApp: App => props => sheets.collect(<App {...props} />),
  });

  const initialProps = await Document.getInitialProps(ctx);

  return {
    ...initialProps,

    // Styles fragment is rendered after the app and page rendering finish.
    styles: [...React.Children.toArray(initialProps.styles), sheets.getStyleElement()],
  };
};

export default DashboardDocument;