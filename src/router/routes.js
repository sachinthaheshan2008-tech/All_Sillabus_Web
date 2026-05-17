const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'mindmap', component: () => import('pages/IndexPage.vue') },
      { path: 'mindmap-view', component: () => import('pages/IndexPage.vue') },
      { path: 'mindmap-edit', component: () => import('pages/IndexPage.vue') }
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
