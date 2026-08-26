import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'dx-common-go',
  tagline: 'Reusable Go platform SDK for Data Exchange services',
  favicon: 'img/favicon.svg',
  future: {v4: true},
  url: 'https://datakaveri.github.io',
  baseUrl: '/dx-common-go-docs/',
  organizationName: 'datakaveri',
  projectName: 'dx-common-go-docs',
  onBrokenLinks: 'throw',
  markdown: {
    mermaid: true,
    hooks: {onBrokenMarkdownLinks: 'throw'},
  },
  themes: [
    '@docusaurus/theme-mermaid',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexBlog: false,
        docsRouteBasePath: '/',
        highlightSearchTermsOnTargetPage: true,
      },
    ],
  ],
  i18n: {defaultLocale: 'en', locales: ['en']},
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/datakaveri/dx-common-go-docs/tree/main/',
        },
        blog: false,
        theme: {customCss: './src/css/custom.css'},
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    image: 'img/iudx-novo-social-card.png',
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    mermaid: {
      theme: {light: 'base', dark: 'dark'},
      options: {
        fontFamily: "Poppins, 'Segoe UI', system-ui, sans-serif",
        themeVariables: {
          primaryColor: '#eef1f8',
          primaryTextColor: '#1f3569',
          primaryBorderColor: '#8794b8',
          secondaryColor: '#fdf0e3',
          lineColor: '#8794b8',
        },
      },
    },
    navbar: {
      title: 'dx-common-go',
      logo: {
        alt: 'dx-common-go documentation',
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
        {to: '/platform/bootstrap-config', label: 'Platform APIs', position: 'left'},
        {to: '/foundation/package-catalogue', label: 'Packages', position: 'left'},
        {to: '/reference/public-api', label: 'API index', position: 'left'},
        {to: '/versions', label: 'Versions', position: 'right'},
        {
          href: 'https://pkg.go.dev/github.com/datakaveri/dx-common-go',
          label: 'pkg.go.dev',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Use the SDK',
          items: [
            {label: 'Getting started', to: '/getting-started'},
            {label: 'Build a service', to: '/guides/service-integration'},
            {label: 'Public API', to: '/reference/public-api'},
          ],
        },
        {
          title: 'Project',
          items: [
            {label: 'Versions', to: '/versions'},
            {label: 'Release notes', to: '/release-notes'},
            {label: 'Contributing', to: '/contributing'},
          ],
        },
        {
          title: 'Platform',
          items: [
            {label: 'Platform docs', href: 'https://datakaveri.github.io/cdpg-docs/'},
            {label: 'Go learning path', href: 'https://datakaveri.github.io/go-learning/'},
            {label: 'GitHub', href: 'https://github.com/datakaveri'},
          ],
        },
      ],
      copyright:
        'Centre for Data for Public Good (CDPG), IISc. Built with Docusaurus.',
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'go', 'yaml', 'docker', 'sql'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
