# 謝辞

::: tip このページの目標

教材が参考にした資料とその用途を確認し、説明上の着想と技術的な根拠の出所を区別できるようになる

:::

::: info このページの要点

- **教材サイト**：traPtitech/naro-text を、VitePress の構成や教材機能の参考にした
- **OAuth / OIDC**：Auth屋さんと川崎貴彦さんの解説を、具体例から役割・通信を説明する際の参考にした
- **パスキー**：Jxck 氏の連載を、認証の課題や移行の背景から説明する構成の参考にした
- **技術的な根拠**：参考にした解説への謝意と、本文の要件を支える一次資料の役割を区別する

:::

教材サイトの構成と VitePress の使い方は、[traPtitech/naro-text](https://github.com/traPtitech/naro-text)を参考にしました  
標準テーマを基礎に、解答の折りたたみや実ファイルからのコード取り込みを使う構成を参考にしています

OAuth / OIDC の説明を見直すにあたり、Auth屋さんの公開資料[「仕様が読めるようになるOAuth2.0 OpenID Connect入門」](https://speakerdeck.com/authyasan/shi-yang-gadu-meruyouninaruoauth2-dot-0-openid-connect-ru-men)のテキストを参考にしました  
具体例から仕様の用語と通信へ進み、OAuth から OIDC への追加を比較する説明の順序を、認可と認証の整理に生かしています

川崎貴彦さんの Qiita 記事[「一番分かりやすい OAuth の説明」](https://qiita.com/TakahikoKawasaki/items/e37caf50776e00e733be)と[「一番分かりやすい OpenID Connect の説明」](https://qiita.com/TakahikoKawasaki/items/498ca08bbfcc341691fe)も参考にしました  
API とトークンの用途から登場主体を理解し、認証結果の発行者と受け手を分けて考える視点を、本文の説明に取り入れています

パスキーの背景を説明する読み物の構成にあたり、Jxck 氏の連載「Passkey への道」を参考にしました  
特に、[「Passkey への道 #0: Intro」](https://blog.jxck.io/entries/2025-07-07/load-to-passkey-0.html)が示す、API の実装方法だけでなく、認証を取り巻く問題や移行の必要性から説明する視点を参考にしています  
利用者とサービスの双方から認証を考えるための解説に感謝します

本教材のおまけ編①は、この視点を踏まえつつ、パスキーの仕組みと認証経路の設計を独立した文章として整理したものです  
技術的な要件や認証要素の説明は、本文に示した W3C・FIDO・NIST などの一次資料を根拠としています  
参考にした解説と規範上の根拠は、[出典と確認状況](./reference/sources.md)でも区別しています
