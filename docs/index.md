---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: traP認証・認可講習会
  tagline: OAuth2.0 / OIDC1.0を基本から理解する
  actions:
    - theme: brand
      text: 座学編
      link: /chapter-1/intro
    - theme: alt
      text: 実習編 (制作予定)

features:
  - title: 第1章 認証・認可とは
    details: 認証と認可の概念を理解し、共通点や相違点を説明できるようになる
    link: /chapter-1/intro
  - title: 第2章 認可
    details: OAuth2.0による権限委譲の仕組みを学ぶ
    link: /chapter-2/oauth
  - title: 第3章 認証
    details: OIDC1.0によるアカウントの識別と、OAuth2.0との違いを学ぶ
  - title: おまけ編① PasskeyとWebAuthn
    details: Passkeyをはじめとするパスワードレス認証の仕組みを学ぶ
  - title: おまけ編② E2EE (エンドツーエンド暗号化)
    details: 利用者の端末以外で情報が常に暗号化された状態を保つ仕組みを学ぶ
---
