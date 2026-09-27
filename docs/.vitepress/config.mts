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
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Pugma/trap-lecture-auth' }
    ]
  }
})
