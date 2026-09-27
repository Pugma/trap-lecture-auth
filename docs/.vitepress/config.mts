import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'ja-JP',
  title: 'traP認証・認可講習会',
  description: 'OAuth2.0 / OIDC1.0を基本から理解する',
  base: '/',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    siteTitle: 'traP認証・認可講習会',
    nav: [],
    sidebar: [
      { text: 'トップ', link: '/' },
      {
        text: '第1章 認証・認可とは',
        items: [
          { text: 'はじめに', link: '/chapter-1/intro' },
          { text: '認証・認可とは', link: '/chapter-1/overview' },
        ]
      },
      {
        text: '第2章 認可', items: [
          { text: 'OAuth による権限の委譲', link: '/chapter-2/oauth' },
          { text: 'OAuth のフロー', link: '/chapter-2/oauth-flows' },
          { text: 'トークンの寿命と提供側の設計', link: '/chapter-2/token-lifecycle' },
          { text: 'PKCE とコード交換の保護', link: '/chapter-2/pkce' },
        ]
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Pugma/trap-lecture-auth' }
    ]
  }
})
