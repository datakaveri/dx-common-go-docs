import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'dx-common-go',
  tagline: 'The shared Go foundation for every Data Exchange microservice',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  url: 'https://datakaveri.github.io',
  baseUrl: '/dx-common-go-docs/',

  organizationName: 'datakaveri',
  projectName: 'dx-common-go-docs',

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themes: [
    '@docusaurus/theme-mermaid',
    [
      // Offline/local full-text search — no external service, works on
      // GitHub Pages, indexes every docs version at build time.
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexBlog: false,
        docsRouteBasePath: '/',
        highlightSearchTermsOnTargetPage: true,
      },
    ],
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/datakaveri/dx-common-go-docs/tree/main/',
          // Versioning: `npm run docusaurus docs:version X.Y.Z` snapshots the
          // current docs/ as version X.Y.Z. The working tree ("Next") tracks
          // unreleased changes; the latest release is the default version.
          lastVersion: '1.0.0',
          versions: {
            current: {
              label: 'Next',
              path: 'next',
              banner: 'unreleased',
            },
          },
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/iudx-novo-social-card.png',
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    // Mermaid restyled to the CDPG palette (same values as go-learning and
    // cdpg-docs) so diagrams share the platform design language.
    mermaid: {
      theme: {light: 'base', dark: 'base'},
      options: {
        fontFamily: "Poppins, 'Segoe UI', system-ui, sans-serif",
        themeVariables: {
          fontSize: '14px',
          primaryColor: '#eef1f8',
          primaryTextColor: '#1f3569',
          primaryBorderColor: '#8794b8',
          secondaryColor: '#fdf0e3',
          tertiaryColor: '#f5f6f9',
          lineColor: '#8794b8',
          signalColor: '#8794b8',
          signalTextColor: '#5a6680',
          actorBkg: '#eef1f8',
          actorBorder: '#1f3569',
          actorTextColor: '#1f3569',
          labelBoxBkgColor: '#fdf0e3',
          labelBoxBorderColor: '#f57e20',
          labelTextColor: '#1f3569',
          loopTextColor: '#6a7488',
          noteBkgColor: '#fff4e8',
          noteBorderColor: '#f57e20',
          noteTextColor: '#1f3569',
          activationBkgColor: '#fdf0e3',
          activationBorderColor: '#f57e20',
          clusterBkg: '#f5f6f9',
          clusterBorder: '#d9deeb',
          edgeLabelBackground: '#ffffff',
        },
      },
    },
    navbar: {
      title: 'dx-common-go',
      logo: {
        alt: 'DX — dx-common-go documentation',
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {to: '/modules', label: 'Modules', position: 'left'},
        {to: '/api', label: 'API Reference', position: 'left'},
        {type: 'docsVersionDropdown', position: 'right'},
        {
          href: 'https://pkg.go.dev/github.com/datakaveri/dx-common-go',
          label: 'pkg.go.dev',
          position: 'right',
        },
        {
          href: 'https://github.com/datakaveri/dx-common-go',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'Getting Started', to: '/getting-started'},
            {label: 'Modules', to: '/modules'},
            {label: 'Migration Guides', to: '/migration'},
          ],
        },
        {
          title: 'Library',
          items: [
            {label: 'GitHub', href: 'https://github.com/datakaveri/dx-common-go'},
            {label: 'pkg.go.dev', href: 'https://pkg.go.dev/github.com/datakaveri/dx-common-go'},
            {label: 'Release Notes', to: '/release-notes'},
          ],
        },
        {
          title: 'Platform',
          items: [
            {label: 'CDPG Docs', href: 'https://datakaveri.github.io/cdpg-docs/'},
            {label: 'Go Learning Path', href: 'https://datakaveri.github.io/go-learning/'},
            {label: 'CDPG', href: 'https://dataforpublicgood.org.in'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Centre for Data for Public Good (CDPG), IISc. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'go', 'yaml', 'docker', 'sql'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
