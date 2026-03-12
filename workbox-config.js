module.exports = {
  globDirectory: 'dist',
  globPatterns: [
    '**/*.{html,js,css,ico,png,jpg,jpeg,svg,json}'
  ],
  swDest: 'dist/sw.js',
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
      },
    },
    {
      urlPattern: ({ request }) =>
        ['script', 'style', 'image'].includes(request.destination),
      handler: 'CacheFirst',
      options: {
        cacheName: 'assets',
      },
    },
  ],
};