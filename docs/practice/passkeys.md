# パスキーの実装

::: tip このページの目標

WebAuthn の登録と認証で、ブラウザ側とサーバー側の処理を接続する実装範囲を確認する

:::

::: info このページの要点

- **ブラウザ**：TypeScript から `navigator.credentials.create()` と `navigator.credentials.get()` を呼び出す
- **サーバー**：Go / go-webauthn で challenge、origin、RP ID、署名、UV を検証する
- **状態**：開始時の情報を要求と結び付け、完了後に一回だけ消費する
- **現在の状態**：実装内容は整理済みだが、参照サーバー、起動手順、実機試験は未提供である

:::

パスキーの実装では、ブラウザの API 呼び出しだけでなく、登録・認証を確定するサーバー側の検証も扱います  
登録、認証、challenge の保存、認証済みセッションの確立、拒否条件は [WebAuthn の登録と認証](../chapter-ex1/passkeys-implementation.md) で説明します

