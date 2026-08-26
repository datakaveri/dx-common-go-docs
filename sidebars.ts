import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'index',
    'getting-started',
    'architecture',
    'versions',
    {
      type: 'category',
      label: 'Platform APIs',
      collapsed: false,
      items: [
        'platform/bootstrap-config',
        'platform/http',
        'platform/errors-paging',
        'platform/sql',
        'platform/cache',
        'platform/events',
        'platform/identity',
        'platform/health-grpc',
      ],
    },
    {
      type: 'category',
      label: 'Foundation packages',
      collapsed: true,
      items: [
        'foundation/package-catalogue',
        'foundation/search-storage-security',
        'foundation/observability-testing',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: true,
      items: [
        'guides/service-integration',
        'guides/testing',
        'guides/extension-points',
        'guides/operations',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: true,
      items: [
        'reference/public-api',
        'reference/generated-api',
      ],
    },
    'troubleshooting',
    'release-notes',
    'contributing',
  ],
};

export default sidebars;
