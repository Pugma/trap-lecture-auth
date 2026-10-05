# 実装・検証状況

::: tip このページの目標

教材に含まれるものと未実装・未検証のものを区別し、記載された確認結果から何が言えるかを判断できるようになる

:::

::: info このページの要点

- **提供済み**：全章の本文の初稿と、公開データを使った署名・JWT の実習を収録している
- **サイトの検証**：固定した Node.js・pnpm・VitePress の環境と、ビルド・内部リンクなどの確認結果を記録する
- **未実証**：Go/Fosite の OP、WebAuthn の参照実装、別の実装の RP との接続、適合試験は未実施である
- **次の実装**：コード交換から API の認可までを小さく実証し、正常系と拒否条件を確かめる

:::

記録日：2026-09-21  
本文の初稿、サイトのビルド、認証サーバーの試験は別々に記録します

## 収録内容

「認証・認可とは」「認可」「認証」の3章構成で、基本経路と追加機能のまとまりごとにページを分けています  
別途、おまけ編①のパスキーと WebAuthn の2ページ、仕様書の読み方の付録、コラム9本とリファレンスを収録しています  
提供側の設計と OP の要件・WebAuthn の節も、処理の意味、設計上の責務、拒否条件まで文章として説明しています

Go の参照サーバー、演習用ユーザー DB、固定版の Fosite / WebAuthn の API 呼び出し、ブラウザでの確認結果は含みません  
実装に必要な設計を説明した初稿であり、コマンドを順番に実行して OP が完成する実習版ではありません

[JWT を読む・検証する実習](../practice/index.md)は提供済みです  
Node.js 標準機能で取り組めます  
API・OP/RP を使う実習は未提供です

## 方針と今回の変更

初期指示書から Go/Fosite と OAuth 2.0 + PKCE + OAuth Security BCP、OIDC 1.0 の技術方針を引き継ぎ、後続の要望に従って仕組みと背景の理解を中心にしています  
Go/Fosite 固有の説明は実習編に置き、座学では実装言語やライブラリに依存しない仕組みを扱います  
パスキーはおまけ編①に置き、実習にはブラウザ API を直接呼ぶ課題を含めます  
単一 issuer、事前登録したサーバー側 Web Client、opaque な Access Token / Refresh Token、RS256 は教材の採用案として区別します

元の指示書は初回作業を導入と最初の章までとしていましたが、今回の「最初から最後まで一旦仕上げる」という依頼に合わせ、全章の本文を執筆しました  
実行できるコードを確認前に創作しない方針は維持しています

package manager は追加依頼により、元の npm 案から pnpm へ変更しました  
ランタイムと package manager を mise で固定し、依存の公開後7日間の待機期間を設定しています

本文へのフィードバックに基づき、内容別のページへ整理し、全体像と正常な通信を詳細な設計より先に説明する順序へ改稿しました  
HTTP・Cookie・セッションの入門的な説明は冒頭から除き、実装に必要な条件を後続の章で扱います

traQ の公開ソースは commit `b08db60b239677913380af450541c1c1952b5898` を参照しました  
OAuth/OIDC のハンドラーを読んだ結果を本文に反映しています  
traQ の起動・本番接続・試験は実施していません  
Code Flow と PKCE の HTTP 例は簡略化した架空の通信、ID Token の JOSE データは独立に生成した教材用データです

## サイトの固定環境

| 対象 | 採用版・設定 | 根拠 |
| --- | --- | --- |
| Node.js | 26.8.2 | mise.toml にパッチ番号まで含むバージョンを記録<br>26 系 Current を使用 |
| pnpm | 12.4.1 | mise.toml と package.json の packageManager / engines に同じ版を記録 |
| VitePress | 2.0.0-alpha.20 | Vite 8 対応のプレリリース版<br>package.json と pnpm-lock.yaml で固定 |
| テーマ | 既定テーマ | 独自 Vue コンポーネントなし |
| 検索 | VitePress のローカル検索 | 検索データを静的生成 |
| minimumReleaseAge | 10,080分 = 7日 | pnpm-workspace.yaml に記録<br>除外設定なし |
| strict / missing time | strict=true、IgnoreMissingTime=false | 待機期間不足や公開日時の欠落で条件を緩めない |
| Vite | 8.3.0 | 通常の依存としてパッチ番号まで含むバージョンを固定<br>overrides なし |
| 依存のビルドスクリプト | 許可なし（allowBuilds: {}） | 現在の依存グラフでは install script 不要 |

採用版の手順には [VitePress の公式文書](https://vitepress.dev/guide/getting-started)を参照しました  
Node.js の状態は [26.8.2 リリース](https://nodejs.org/en/blog/release/v26.8.2)、待機期間は [pnpm の設定](https://pnpm.io/settings/dependency-resolution#minimumreleaseage)、スクリプト許可は [allowBuilds](https://pnpm.io/settings/build#allowbuilds)を確認しました

mise では `pnpm = "12.4.1"` と指定し、標準の aqua バックエンドを使用します  
aqua 版 pnpm の内蔵 Node.js 26 も許容するため、`engines.node` は `^26.0.0` としています  
プロジェクトで使用する Node.js は引き続き mise で26.8.2に固定しています

Vite 8 系を使う依頼に合わせ、VitePress も対応する2系へ変更しました  
採用した alpha.20 の公開日は2026-09-04、Vite 8.3.0 は2026-09-10です  
`pnpm view` の公開日時と依存定義を調べ、間接依存も含めて7日間の条件を適用しました  
例えば Vue プラグインは、公開から7日未満の6.0.9ではなく6.0.8へ解決されています

VitePress 1.6.4 と Vite 8 の試行では、終了コードが成功でも Rolldown の非互換エラーが出て、ページ遷移に必要な lean ファイルが欠落しました  
この組み合わせは採用していません  
現構成は VitePress 自身が宣言する Vite 8 の依存範囲内であり、互換性のための上書きは不要です  
[Vite 8 移行ガイド](https://vite.dev/guide/migration)、[VitePress alpha.20](https://github.com/vuejs/vitepress/releases/tag/v2.0.0-alpha.20)

pnpm 12 への移行時は package manager 自身の依存記録を追加するため、通常の install でロックファイルを更新しました  
その後、空の環境から frozen-lockfile で再現しました  
アプリの依存バージョンは維持しています

## 文書サイトの確認

Linux 環境で次を実施しました  
内部リンク検査は有効なままです  
ビルド・JOSE・生成物検査は、mise が配置した固定版の実行ファイルを PATH に指定しました（上位設定の無関係なツールの自動導入を避けるため）

| 確認 | コマンド・方法 | 結果 |
| --- | --- | --- |
| ツール版 | `mise exec -- node --version` / `mise exec -- pnpm --version` | v26.8.2 / 12.4.1 |
| 待機期間 | `mise exec -- pnpm config get minimumReleaseAge` | 10080 |
| 依存の再現 | 新規の一時ディレクトリへ manifest・設定・lockfile をコピーして `pnpm install --frozen-lockfile` | 成功<br>既存 node_modules を流用せず取得 |
| 公開用のビルド | `mise exec -- pnpm docs:build` | 成功 |
| シーケンス図 | `pnpm docs:diagrams`、XML の構文解析、`rsvg-convert` による描画 | OAuth Code + PKCE と OIDC の3フロー、計4図を生成・描画<br>確認環境に日本語フォントがないため、日本語文字の見た目は未確認 |
| JOSE の教材用データ | `mise exec -- pnpm examples:check` | デコード結果・公開 JWK・RS256 署名・改変時の拒否・HTTP 応答との一致を確認<br>OP/RP の動作試験ではない |
| 生成物の整合性 | `mise exec -- pnpm docs:check` | 25 HTML（本文24ページと404）の内部リンク・アンカー・アセット1514件、および48個のページ JS を検査し成功 |
| 検査の拒否動作（旧ツール版で確認） | 一時コピーから lean ページ JS を一つ退避して `docs:check` を実行 | 欠落を検出して失敗<br>確認後に復元 |
| peer dependency | `mise exec -- pnpm peers check` | 不整合なし |
| 開発・プレビュー配信（旧ツール版で確認） | `pnpm docs:dev` / `pnpm docs:preview` を localhost で一時起動 | 各4ページで HTTP 200 と HTML を確認<br>確認後に終了 |
| 依存監査 | `mise exec -- pnpm audit --json` | 報告0件（totalDependencies: 145）<br>将来の安全性を保証する結果ではない |

minimumReleaseAge の除外、期間の短縮、strict 設定の解除、検査を省く install オプションは使用していません  
現在は esbuild 自体が依存グラフに不要になったため、以前のビルドスクリプト許可も削除しました

この環境には表示確認用ブラウザがないため、画面描画、スマートフォン幅、検索 UI の操作は未確認です  
HTTP 応答の確認を目視確認とは扱いません  
本文の一次資料は[出典台帳](./sources.md)で確認状態を管理し、外部 URL 全件への接続は自動検査していません

## 実装側の未実施項目

| 領域 | 対象 | 現在の状態 |
| --- | --- | --- |
| OAuth / API | T-O01〜T-O09：正常な委譲、callback、PKCE、コード再利用、scope とチャンネルへのアクセス権 | Go 実装なし・未実施 |
| トークン更新 | T-R01〜T-R05：更新、権限維持、旧 RT、競合、終了状態 | Go 実装なし・未実施 |
| OIDC / JOSE | T-I01〜T-I09：署名と Claims、metadata、prompt/max_age、UserInfo | Go 実装なし・未実施 |
| パスキー | T-P01〜T-P06：登録、ログイン、challenge、origin、RP ID、UV | 実装・fixture・実機確認なし |
| 別の実装の RP | 固定版の別実装との接続 | 対象のバージョンは未選定・未実施 |
| Conformance Suite | OP テスト<br>Basic OP / Config OP を参照対象とする案 | suite 版・plan/variant/module 未固定・未実施 |
| 保存層の競合 | コード消費と RT 更新の原子性・失敗時の状態 | 保存方式未確定・未実施 |

試験 ID は制作指示書の試験計画に対応します  
期待する拒否条件は各章に記述しています  
Conformance Suite の具体的な記録項目は[適合試験の進め方](./conformance-testing.md)にあります  
未実施は suite の SKIPPED という実行結果を意味しません

## 次の検証対象

### 2026-10-05 の再構成の確認

S1 の既存ファイルを変更せず JWT の導入を追加し、S2 は Code の検証→PKCE→AT / RS→寿命と更新、S3 は Code / ID Token の基本経路→追加仕様の順へ整理しました  
既存の仕様説明と拒否条件を移動して保持し、JWT 実習をデコードと検証・受入判断の二段階にしています

この作業時の固定環境は Node.js 26.10.0 / pnpm 12.6.0 です  
`docs:build` と `docs:check` は現行の package.json に未定義のため、既存の `mise exec -- pnpm build` と `mise exec -- node scripts/check-built-links.mjs` を実行しました  
ビルドと内部リンク・アンカー・ページ JS の検査は成功しました  
`mise exec -- node examples/jose/read.ts` で三部分のデコードと書き換えを確認し、`mise exec -- node examples/jose/verify.mjs` で元の署名の成功と改変後の拒否を確認しました

Claims の受入判断は固定の設定・検証時刻を用いる机上課題で、Claims 検証コードの動作試験ではありません  
独立 RP 接続、仕様適合試験、WebAuthn 実機確認は追加実施していません

## 実装の次の検証対象

Go と Fosite の版を固定し、既存のダミーユーザー、登録 client、Code + PKCE のコード交換、メッセージ一件の取得までを作ります  
同時に誤った verifier、使用済みの認可コード、閲覧できないチャンネルのメッセージの拒否を確認します  
そこで判明した保存層とセッションの契約を提供側の設計へ戻し、実在する参照ファイルからコードを取り込めるようにします

その後に RT 更新、ID Token と別の実装の RP、suite、パスキーの実機確認へ進みます  
公開先、base path、ライセンス、受講者に近い人による通読は未確定・未実施です  
開催時間・回数は固定せず、座学を中心とします。実習の段階や具体的な提供内容は、参照実装の設計時に確定します
