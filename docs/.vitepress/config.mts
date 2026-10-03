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
      {
        text: '第3章 認証', items: [
          { text: 'OIDC の目的とフロー', link: '/chapter-3/oidc' },
          { text: 'ID Token の発行と検証', link: '/chapter-3/id-token' },
          { text: 'OP の設計と相互接続', link: '/chapter-3/oidc-provider' },
          { text: '認証方式の比較と運用', link: '/chapter-3/federation' },
        ]
      },
      {
        text: 'おまけ編① パスキーと WebAuthn', items: [
          { text: 'パスキーの仕組みと認証の設計', link: '/chapter-ex1/passkeys-background' },
          { text: 'WebAuthn の登録と認証', link: '/chapter-ex1/passkeys-implementation' },
        ]
      },
      {
        text: 'おまけ編② E2EE', items: [
          { text: 'パスキーによる E2EE の設計', link: '/chapter-ex2/e2ee' },
        ]
      },
      {
        text: '実習', items: [
          { text: '署名と JWT の検証', link: '/practice/' },
          { text: '認可サーバーの実装', link: '/practice/authorization-server' },
          { text: 'パスキーの実装', link: '/practice/passkeys' },
          { text: 'パスキーによる E2EE', link: '/practice/e2ee' },
        ]
      },
      {
        text: 'コラム', items: [
          { text: 'Web 標準の形成', link: '/columns/web-standards' },
          { text: 'OAuth Client の実装', link: '/columns/client-implementation' },
          { text: 'OIDC RP の実装', link: '/columns/rp-implementation' },
          { text: 'UV の意味と検証範囲', link: '/columns/user-verification' },
          { text: 'テンプレートと安全性', link: '/columns/operational-boundaries' },
          { text: 'マシンアカウントと mTLS', link: '/columns/machine-authentication' },
          { text: 'GitHub Actions の OIDC', link: '/columns/github-actions-oidc' },
          { text: '権限管理と scope', link: '/columns/permissions' },
          { text: 'IdP とユーザー管理の分離', link: '/columns/identity-architecture' },
          { text: 'LDAP・SAML・OIDC の使われ方', link: '/columns/enterprise-authentication' },
        ]
      },
      {
        text: '付録・リファレンス', items: [
          { text: 'RFC・仕様書の読解', link: '/reference/reading-specifications' },
          { text: '用語集', link: '/reference/glossary' },
          { text: '参考資料', link: '/reference/sources' },
          { text: '実装・検証状況', link: '/reference/implementation-status' },
          { text: 'OIDC 適合試験', link: '/reference/conformance-testing' },
        ]
      },
      { text: '謝辞', link: '/acknowledgements' },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Pugma/trap-lecture-auth' }
    ]
  }
})
