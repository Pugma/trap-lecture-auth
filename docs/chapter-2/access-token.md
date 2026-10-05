# Access Token と Resource Server

::: tip このページの目標

コード交換で取得した Access Token を API 利用につなげ、RS がトークンの有効性・scope・対象への権限を確認する理由を説明できるようになる

:::

::: info このページの要点

- **形式**：OAuth は Access Token を JWT に限定しない
- **提示**：Bearer Token を取得した Client は、対象の RS へその値を提示する
- **認可**：有効なトークンでも、scope や対象への権限が不足する操作は拒否する

:::

[Code Flow](oauth-flows.md) と [PKCE](pkce.md) でコード交換の条件を確認しました  
ここでは発行した Access Token を使い、許可された API 操作までを成立させます

## OAuth と JWT

第1章で JWT を読める形式として紹介しましたが、OAuth 自体は Access Token を JWT に限定していません  
AS と RS が利用できる資格情報として発行し、Client は中身を解釈せずに利用できます [RFC 6749 §1.4](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.4)  
本教材では opaque Access Token を設計例とし、RS が保存された発行情報と照合する構成を考えます  
JWT 形式の Access Token を定める [RFC 9068](https://www.rfc-editor.org/rfc/rfc9068.html) もありますが、OAuth Core のフローとトークン形式の選択は別です

### Access Token の性質 {#oauth-access-token-の性質}

本教材は Bearer Token を使います  
[Bearer](../reference/glossary.md#bearer-token) とは、そのトークンを持つ者が利用できる性質を指します  
Client を最初に認証したとしても、盗まれた Access Token を API へ提示する者が同じ Client であると、それだけで保証されるわけではありません [RFC 6750 §1.2](https://www.rfc-editor.org/rfc/rfc6750.html#section-1.2)

教材の API は、`Authorization` ヘッダーで提示されたトークンを受け付ける設計にします  
URL へ埋め込むと履歴やログに残る経路が増えるため、教材の通常経路にはしません  
トークンの形式は Client から見て [opaque](../reference/glossary.md#opaque-token)、つまり中身を解釈しない文字列を採用案とします  
JWT でなければ OAuth ではない、ということはありません [RFC 6750 §2.1・§5.3](https://www.rfc-editor.org/rfc/rfc6750.html#section-2.1)

API は、無効・期限切れなどのトークンと、トークンは有効だが必要な scope がない状況を区別します  
Bearer のエラー仕様では、それぞれ `invalid_token` と `insufficient_scope` が整理されています  
対象へのアクセス権がない場合に何を利用者へ返すかは、存在の開示も含めたアプリ側の方針として決めます [RFC 6750 §3.1](https://www.rfc-editor.org/rfc/rfc6750.html#section-3.1)

#### Bearer Token の受渡し {#oauth-bearer-token-の受渡し}

チャットビューアーが受け取った Access Token を、別のサービスへそのまま渡したとします  
API が通常の Bearer Token として受け付ける構成なら、渡された側もその値を提示できるようになります  
トークンを渡すことは、トークンに認められた操作を実行する能力を別のサービスへ渡すことです [RFC 6750 §5.1・§5.3](https://www.rfc-editor.org/rfc/rfc6750.html#section-5.1)  
Client がトークンをログや別サービスへ渡さないための扱いは、[コラム：OAuth Client の実装](../columns/client-implementation.md#client-token-handling)で扱います

提供側は、Bearer Token の提示だけでは、提示した者が発行先の Client であるかを区別できないことを前提にします  
どの Resource Server を対象に発行し、どのサーバーが受け入れるかという制限は、scope の操作範囲とは別の観点です  
RFC 9700 は Access Token を特定の Resource Server や操作に制限する方針を整理しています [RFC 9700 §2.3](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.3)

本教材は一つのメッセージ API を主例にするため、複数 API 向けのトークン取得手順までは増やしません  
ただし、実装を拡張するときには「同じ AS が発行したからどの API でも受け入れる」と一般化しないようにします  
発行元が信頼できること、対象 API に使えること、要求した操作とリソースへアクセスできることは、それぞれ確認する条件です

### Access Token による API アクセス {#code-flow-access-token-による-api-アクセス}

メッセージ API は、Client のバックエンドが提示した Access Token を受け取ります  
ここでも通信は HTTPS を前提とします  
以下は前節から続く架空の通信例で、`/api/messages/42` と返却する JSON の構造は教材の設計です  
AS とメッセージ API は同じ参照アプリに置く構成を想定していますが、認可とリソースの提供の役割は区別します  
Bearer Token の提示方法は RFC 6750 に従います [RFC 6750 §2.1](https://www.rfc-editor.org/rfc/rfc6750.html#section-2.1)

```http
GET /api/messages/42 HTTP/1.1
Host: auth.example
Authorization: Bearer example-access-token-01
```

API はこの要求で、トークンの有効性と `read` を検証し、トークンに対応するユーザーが、メッセージ42のあるチャンネルを閲覧できることを確認します  
要求のユーザー ID を信用して閲覧可否を判定するのではなく、検証済みトークンに結び付いたユーザーを使って判断します  
すべての条件を満たす場合、メッセージを返します

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{"id":42,"text":"講習会を始めます"}
```

この応答を受けた Client が、ブラウザへメッセージを表示します  
ユーザーのパスワードを Client へ渡すことなく、許可された読み取りを実行するところまでが、一連の委譲の結果です

API は、トークンが期限切れなら `invalid_token`、必要な scope が不足するなら `insufficient_scope` を返します  
例えば期限切れの場合の応答は次の形です [RFC 6750 §3.1](https://www.rfc-editor.org/rfc/rfc6750.html#section-3.1)

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer error="invalid_token"
```

トークンが有効でも、利用者が閲覧できないチャンネルのメッセージは返しません  
例えば自分が参加していない DM が該当します  
拒否時のステータスや対象の存在を開示するかは、アプリケーションの方針として定めます

traQ の実 API は [`/api/v3/messages/:messageID`](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/router/v3/router.go#L217-L224) に対応し、[scope とユーザー権限](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/router/middlewares/access_control.go#L21-L54)、[対象チャンネルへのアクセス](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/service/channel/manager_impl.go#L415-L430)を確認します  
上の `/api/messages/42` と最小 JSON は、通信の役割を追うために簡略化したものです

#### API エラーの区別 {#code-flow-api-エラーへの対応}

API が期限切れのトークンと権限不足を区別して返すのは、Client が取るべき対応が異なるためです  
前者では有効なトークンの取得が必要ですが、後者では同じ許可のままトークンを取り直しても操作範囲は増えません  
対象の DM を利用者が閲覧できない場合も、scope は Client への委譲範囲であり、利用者自身のリソースへの権限を作り出すものではありません [RFC 6750 §3.1](https://www.rfc-editor.org/rfc/rfc6750.html#section-3.1)  
Client がこれらのエラーを受けてどう処理を止めるかは[コラム：OAuth Client の実装](../columns/client-implementation.md#client-errors-api)で扱います

### 認可の責任分担 {#oauth-認可の責任分担}

AS はユーザーの認証とは別に、Client に認める scope と利用者の許可を確認し、実際に許可した範囲を発行結果へ反映します  
メッセージ API は、そのトークンの有効性、操作に必要な scope、対象の閲覧・編集権限を確認します  
要求された権限、トークンに認められた権限、個々の操作の許可は、それぞれ異なる段階の判断です

人がその場で許可の操作を行わないアクセスには、Client Credentials Grant などの方式もあります  
[マシンアカウントと mTLS のコラム](../columns/machine-authentication.md)で、プログラム自身の認証と、そのプログラムへのアクセスの許可を補足します

## HTTP と業務 API の通信方式

本教材の通信例と実習は HTTP / REST API を中心にします  
OAuth / OIDC の標準エンドポイントが HTTP(S) を使うことに加え、サークルで使われる REST API に例を揃えやすいための選択です  
標準エンドポイントと、その後に Access Token を提示する業務 API の通信方式は区別します

業務 API は REST API に限定されません  
例えば gRPC metadata の `authorization` に Access Token を載せ、gRPC の Resource Server 側でトークンと対象への権限を検証する構成も可能です  
metadata は認証情報を運ぶ用途も持ちますが、提示できることだけで認可が成立するわけではありません [gRPC Metadata](https://grpc.io/docs/guides/metadata/)  
この教材では gRPC の具体的な実装手順まで広げず、HTTP の標準エンドポイントと業務 API を混同しないための例として扱います

## 基本経路から継続利用へ

ここまでで、利用者の許可、コード交換の保護、Access Token の発行、RS での認可がつながりました  
まずこの経路の正常系と拒否条件を [認可サーバーの実習](../practice/authorization-server.md) で確認する設計です  
実行可能な AS / RS は未提供なので、本文の通信例を実証済みの動作とは扱いません  
次は、短命な Access Token の期限が切れるたびに再認可する負担を考え、[寿命と Refresh Token](token-lifecycle.md) へ進みます
