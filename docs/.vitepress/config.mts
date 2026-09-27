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
    ],
    outline: { level: [2, 3], label: 'このページの内容' },
    docFooter: { prev: '前のページ', next: '次のページ' },
    sidebarMenuLabel: '目次',
    returnToTopLabel: 'ページの先頭へ',
    darkModeSwitchLabel: '表示テーマ',
    search: {
      provider: 'local',
      options: {
        locales: { root: { translations: {
          button: { buttonText: '検索', buttonAriaLabel: '本文を検索' },
          modal: {
            displayDetails: '詳細を表示',
            resetButtonTitle: '検索をクリア',
            backButtonTitle: '検索を閉じる',
            noResultsText: '見つかりませんでした',
            footer: { selectText: '選択', navigateText: '移動', closeText: '閉じる' },
          },
        } } },
      },
    },
  },
})
