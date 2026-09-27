# OIDC の目的とフロー

::: tip このページの目標

OAuth の登場人物と OIDC の役割を対応付け、OP が発行する認証結果と、RP の検証に備えて OP が満たす条件、三つのフローの違いを説明できるようになる

:::

::: info このページの要点

- **目的**：OAuth が共通化しない利用者の認証結果を外部アプリへ伝える
- **役割の対応**：認証結果を利用する Client を RP、その結果を発行する AS を OP と呼ぶ
- **OP の契約**：RP が発行元・宛先・要求との対応を検証するので、OP はそれらを ID Token に正しく載せる
- **三つのフロー**：Code・Implicit・Hybrid は、認可応答とコード交換で受け取る値と経路が異なる
- **採用判断**：仕様上の違いと現在の安全性の条件を確認し、教材では Code + PKCE を採用する

:::

認可の章と同じ A さん・チャットビューアー・traQ を使い、API の利用に加えて、ビューアーへのログインを実現する場合を考えます  
本編では traQ 側で認証結果を発行する OP を作る視点で進め、RP を作る側の処理はコラム「[OIDC RP の実装](../columns/rp-implementation.md)」で扱います

## OAuth と OIDC {#oidc}


OAuth が扱うアクセス権限の委譲に、認証結果を伝える共通の契約を加えるのが OIDC です  
API を呼ぶ設計から、外部アプリが利用者を識別する設計へ進みます [OIDC Core §1](https://openid.net/specs/openid-connect-core-1_0.html#Introduction)

### OAuth と OIDC の役割 {#oidc-roles}

[OAuth の登場人物の対応表](../chapter-2/oauth.md#oauth-oauth-の登場主体)を、認証結果を伝える側と利用する側という観点で読み直します  
この例ではサービスを追加するのではなく、これまでの Client と AS が OIDC の役割も担います

| OIDC での用語・役割 | OAuth での対応 | 例での登場人物 | 担当すること |
| --- | --- | --- | --- |
| End-User（エンドユーザー） | 人間の Resource Owner | A さん | 認証を受け、外部アプリへの情報提供を許可する |
| [RP（Relying Party）](../reference/glossary.md#oidc-rp) | Client | チャットビューアー | 認証結果を要求し、受け取った結果を検証して利用者をログインさせる |
| [OP（OpenID Provider）](../reference/glossary.md#openid-provider) | Authorization Server（AS） | traQ 側の認可サーバー | 利用者を認証し、RP に向けて認証結果を発行する |
| メッセージ API の役割は引き続き RS | Resource Server（RS） | traQ のメッセージ API | Access Token とアクセス権を確認し、許可されたメッセージを返す |

RP は、利用者の認証結果を OP に求める OAuth の Client です  
OP は、利用者を認証し、その認証や利用者についての情報を RP に伝えられる OAuth の AS です  
すべての Client や AS を単に改名するのではなく、OIDC の機能を担うときの呼び方です [OIDC Core §1.2](https://openid.net/specs/openid-connect-core-1_0.html#Terminology)

Resource Owner と End-User の対応は、この例の A さんについてのものです  
OAuth の Resource Owner は人間に限りませんが、OIDC の End-User は認証の対象となる人間を指します  
メッセージ API が OP に置き換わるわけでもなく、RS としてのアクセス権の確認は引き続き必要です

ブラウザの役割も変わりません  
A さんが操作し、ビューアーと traQ 側の画面を行き来するために使います

### End-User と利用者の操作 {#oidc-end-user-と利用者の操作}

OIDC Core は、認証の対象となる End-User を人間の参加者として定義しています  
本編では、A さんが OP で認証を受け、その結果と必要な利用者情報を RP へ伝える流れを扱います  
OP は利用者の認証に加えて、RP へ情報を開示してよいかという認可判断も必要とします [OIDC Core §1.2・§3.1.2.4](https://openid.net/specs/openid-connect-core-1_0.html#Terminology)

人間を対象とすることと、毎回人間の操作を要求することは別です  
OP は要求の条件に応じて既存の認証状態や事前の同意を利用でき、常にログイン画面や同意画面を表示するわけではありません  
例えば `prompt=none` は画面を表示しない要求であり、必要な認証や同意を満たせなければエラーにします  
操作が見えない場合にも、認証結果と情報開示の根拠が必要です [OIDC Core §3.1.2.1・§3.1.2.4](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest)

### API アクセスとログイン {#oidc-api-アクセスとログイン}

認可の章では、クライアントが利用者の許可に基づいてメッセージ API を呼ぶ設計を扱いました  
ここからは、チャットサービスが外部アプリへ認証結果を伝える OIDC の設計へ進みます  
traQ の公開実装にも OIDC の処理があり、「OP の設計と相互接続」で教材の設計と対応付けます  
Access Token の取得だけをログインの証拠にできるかが論点です

Access Token が表すのは、保護されたリソースへアクセスするための認可です  
どの利用者をどう識別し、その認証結果がどのクライアント向けなのかを、OAuth 単体が共通形式で定めているわけではありません  
AS 内部での利用者認証や token endpoint でのクライアント認証が存在することと、認証結果をアプリ間で伝える契約があることは別です [RFC 6749 §1.1・§1.4](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.1)

### OAuth と認証連携の契約 {#oidc-oauth-と認証連携の契約}

チャットビューアーへ「traQ のアカウントでログインする」機能を付けるなら、API の利用許可に加えて、次を確かめる必要があります

- **誰か**：どの発行元の、どのアカウントか  
  表示名が変わっても同じ利用者を識別できるか
- **誰に向けた結果か**：別のアプリに渡された証拠を、自分のアプリへのログインに使っていないか
- **どの要求に対する結果か**：いまログインを開始したブラウザの処理と結び付いているか
- **どの認証に基づくか**：必要に応じて、認証がいつ行われたか、再認証を求められるか

OAuth はコード交換や要求との対応を保護する仕組みを持ちます  
しかし、ユーザー情報 API の場所・応答形式や、クライアントが受け取る認証結果の意味・検証方法までは共通化していません  
Access Token の有効期限も、利用者が最後に認証された時刻とは別です  
OIDC Core 自身も、OAuth だけでは利用者の識別・認証情報を伝える標準的な方法が定まらないことを出発点にしています [OIDC Core §1](https://openid.net/specs/openid-connect-core-1_0.html#Introduction)

#### ユーザー情報とトークンの差し替え {#oidc-ユーザー情報とトークンの差し替え}

次は、任意の Access Token をブラウザから受け取り、ユーザー情報 API の応答だけでログインさせる、誤った設計の例です

1. 利用者 A が、別のアプリ X にユーザー情報を読む権限を許可する
2. X が得た A のトークンを、チャットビューアーのログイン処理に持ち込む
3. チャットビューアーがそのトークンでユーザー情報を取得し、提示者を A としてログインさせてしまう

API は正しく A の情報を返していても、A がチャットビューアーへのログインを開始したことや、そのトークンがチャットビューアー用に発行されたことは示せていません  
これは [トークンの差し替え](../reference/glossary.md#token-substitution)をログインに利用する問題です  
RFC 6749 も、別クライアントに渡されたトークンを利用者認証に転用する危険を説明しています [RFC 6749 §10.16](https://www.rfc-editor.org/rfc/rfc6749.html#section-10.16)

この問題は、正しく検証された Code Flow がすべて同じ攻撃に弱いという意味ではありません  
自分のアプリ向けのコードを安全に交換し、開始した処理と結び付けることは対策の一部です  
それでも、取得したユーザー情報の意味やログインへの使い方は、サービス固有の契約または OIDC のような追加仕様で定める必要があります  
提供側から見ると、ユーザー情報 API の成功だけをログインの証拠として受け入れさせるのではなく、どの RP 向けの、どの要求に対する結果かを RP が検証できる形で発行する責任があります

### OIDC による認証連携 {#oidc-oidc-の認証契約}

この不足をサービスごとに独自設計すると、接続先を増やすたびに識別子や検証方法を調べ直すことになります  
[OIDC](../reference/glossary.md#oidc) は、OAuth 2.0 の上で利用者の認証結果を相互運用可能な形で伝えるために標準化された認証連携の層です  
先ほどの対応では、traQ 側の OP が認証結果を発行し、チャットビューアーの RP がその結果を利用します [OIDC Core §1](https://openid.net/specs/openid-connect-core-1_0.html#Introduction)

OIDC は、認証結果を **[ID Token](../reference/glossary.md#id-token)** という形式で定義し、受信側が何を検証するかも揃えます

| ログインで必要な確認 | OIDC で定める情報・手順 | OP が発行時に満たすこと |
| --- | --- | --- |
| 発行元と利用者 | `iss` と `sub` の意味、識別子の安定性 | 自分の issuer と、利用者ごとに安定した `sub` を載せる |
| 受け取り手 | `aud` と RP の client ID の照合 | 要求した RP の client ID を `aud` に載せる |
| 証拠の正当性と期限 | ID Token の検証手順、`exp` などの条件 | 公開した鍵で署名し、有効期限を設定する |
| 開始した要求との対応 | 認証結果を、開始したログインにだけ対応付ける | 要求に含まれた nonce を返す |
| 認証の時刻ややり直し | `auth_time`、`max_age`、`prompt` の意味と処理条件 | 実際の認証時刻を保持し、要求の条件に従って再認証やエラーを返す |

RP はこれらを検証し、条件を満たさない結果を拒否します  
そのため、右列は OP が満たすべき契約になります  
各項目には必須となる条件があり、すべての要求・トークンに全項目が必須という意味ではありません  
検証の詳細は次のページで、認証時刻や再認証を扱う OP の処理は「OP の設計と相互接続」で確認します [OIDC Core §2・§3.1.2.1・§3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)

本教材では Authorization Code Flow + PKCE を保ち、要求の scope に `openid` を含めます  
認可コードを token endpoint で交換すると、Access Token に加えて ID Token を受け取ります  
ID Token は、発行者が誰について認証結果を伝え、どの RP が利用するものかを表します  
RP はその内容を検証してから、自分のアプリのログインセッションを作ります [OIDC Core §2・§3.1](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)  
RP のログイン判定やセッションの設計は、コラムの[RP のログイン判定](../columns/rp-implementation.md#rp-login-decision)で扱います

この構成では、次の三段階で判断します

1. OP が利用者を認証する
2. RP が OP の認証結果を検証し、利用者を識別する
3. RP やメッセージ API が、自分のリソースに対する権限を判定する

ID Token を受け入れたことから、閲覧できない DM のメッセージを読む許可まで導いてはいけません

| 証拠・状態 | 主な利用者 | 教材での用途 |
|---|---|---|
| OP のログインセッション | OP | 次の認証要求で認証状態を判断する |
| ID Token | RP | OP から伝えられた認証結果を検証する |
| Access Token | API | 許可された API アクセスを判断する |
| RP のログインセッション | RP | 検証後のログイン状態を維持する |

同じブラウザ操作で作られても、それぞれの寿命や終了条件は異なります  
RP の Cookie を削除しただけで、OP のセッションや発行済みの全トークンが消えるとは考えないでください

## OIDC のフロー

OIDC の三つのフローは、認証結果と API 用のトークンを、どの経路で RP に届けるかが異なります  
共通する入口は `openid` を含む要求であり、どの応答を求めるかを `response_type` で指定します [OIDC Core §3](https://openid.net/specs/openid-connect-core-1_0.html#Authentication)

### 三つのフローの比較

認可の章では、ブラウザがコードを持ち帰り、Client が交換して Access Token を得ました  
以下の図では、その Client が RP、コードを発行・交換する AS が OP に対応します  
OIDC では、この流れに ID Token を追加する方法に加え、ブラウザ経由で ID Token を直接返す方法も定義します  
以下の表は、まず「認可応答で返す値」と「後から交換して得る値」の違いを読むためのものです

**フロントチャネル**はブラウザを介して要求・応答を運ぶ経路です  
**バックチャネル**は RP と OP が直接通信する経路で、本教材では RP バックエンドから token endpoint を呼びます  
どちらも通信の保護が必要で、バックチャネルなら受け取った値を無条件に信頼できるという意味ではありません

| フロー | ブラウザ経由で受け取るもの | バックエンドで交換して受け取るもの |
| --- | --- | --- |
| Authorization Code | 交換に使う短期間の結果 | 認証結果・API 用の資格情報 |
| Implicit | 認証結果 | 交換なし |
| Implicit | 認証結果・API 用の資格情報 | 交換なし |
| Hybrid | 交換に使う結果・認証結果 | 認証結果・API 用の資格情報 |
| Hybrid | 交換に使う結果・API 用の資格情報 | 認証結果・API 用の資格情報 |
| Hybrid | 交換に使う結果・認証結果・API 用の資格情報 | 認証結果・API 用の資格情報 |

表では、値の名前と技術上の必須条件を省略しています  
各方式の `response_type`、認可応答で返る値、nonce・`at_hash`・`c_hash` の条件は、ID Token の検証で扱います [OIDC Core §3.2.2.1](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitAuthRequest)・[§3.3.2.1](https://openid.net/specs/openid-connect-core-1_0.html#HybridAuthRequest)

各図は、OAuth の図と同じく、左からブラウザ・RP（Client）・OP（AS）・RS を配置します  
上から下へ追うと、要求・応答と、各役割が行う検証を対応付けられます  
RP の処理場所はフローごとに列の説明へ記載しています  
横幅が足りない場合は図を横にスクロールできます

以下の図は Code の既定の query 応答と、Implicit / Hybrid の既定の fragment 応答を描きます  
query は URL の `?` 以降に置くパラメータで、callback サーバーへの要求にも含まれます  
fragment は URL の `#` 以降であり、callback サーバーへの HTTP 要求には送られません  
ブラウザ内の RP の処理が読み取り、必要ならバックエンドへ別の要求で渡します  
別の response mode を選ぶ構成もありますが、図では扱いません [OIDC Core §3.2.2.5](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitAuthResponse)・[§3.2.2.7](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitCallback)

### Authorization Code Flow

Code Flow は、ブラウザ経由ではコードを受け取り、RP が OP と直接通信してコードをトークンへ交換する構成です  
本教材では RP バックエンドに秘密とトークンを置き、PKCE S256 を使います  
RP は開始した処理との対応を確認してコードを交換し、ID Token を検証してからログインを成立させます [OIDC Core §3.1.1](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowSteps)

<div class="sequence-diagram" tabindex="0" role="region" aria-label="oidc-code のシーケンス図">

![Code Flow：RP がブラウザを OP に送り、OP が認証・許可後に code と state を返す。RP バックエンドがコードと verifier を送り、ID Token と Access Token を直接受け取る。検証後に API を呼ぶ](/diagrams/oidc-code.svg)

</div>

[OAuth の Code Flow の図](../chapter-2/oauth-flows.md#code-flow-ブラウザー経由とサーバー間の通信)と、同じ番号の矢印を比較してください  
矢印3では認証結果を求め、矢印9では API 用の資格情報に加えて認証結果を受け取ります  
RP による ID Token の検証とログイン状態の確立が加わる一方、矢印10〜11の API アクセスには引き続き Access Token を使います

ID Token 内の発行者や期限などの項目を Claims と呼びます  
その一つである `at_hash` は、Access Token から計算したハッシュ値の一部を記録する項目です  
ハッシュは入力から一定長の値を計算するもので、OP は同時に発行する Access Token から計算した値を、署名で保護された ID Token に入れます  
RP は受け取った Access Token から同じ計算を行い、ID Token 内の値と照合して、二つが対応するかを検証します  
Code Flow の token 応答では、OP が `at_hash` を含めることは任意です [OIDC Core §3.1.3.6](https://openid.net/specs/openid-connect-core-1_0.html#CodeIDToken)

Code Flow の技術上の値と検証条件は、次の ID Token のページで説明します [OIDC Core §3.1.3.6](https://openid.net/specs/openid-connect-core-1_0.html#CodeIDToken)・[§3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)

#### OAuth と OIDC の Code Flow {#oidc-oauth-と-oidc-の-code-flow}

OAuth の Code Flow と同じ通信経路を使いながら、OIDC では認証結果を要求・発行・検証する処理が加わります  
この教材の二つの構成を比較すると、差分は次のようになります [OIDC Core §3.1.1・§3.1.3.3](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowSteps)

| 処理 | 第2章の OAuth | 第3章の OIDC |
| --- | --- | --- |
| 要求する内容 | メッセージの読み取り権限 | 読み取り権限に加え、`openid` で認証結果を要求 |
| ブラウザ経由の応答 | 認可コードと state | 同じく認可コードと state |
| バックエンドでのコード交換 | Access Token を受け取る | Access Token と ID Token を受け取る |
| クライアント側の処理 | Access Token を API に提示する | さらに ID Token を検証し、RP のセッションを作る |
| API 側の処理 | Access Token と操作対象の権限を確認 | 引き続き同じ認可が必要 |

この比較は本教材の Code Flow に限定しています  
ブラウザがコードを運ぶ経路と、バックエンドでコードを交換する経路は保たれます  
追加されるのは、認証結果を要求し、その結果を RP のログイン判断へ使うための条件です

### Implicit Flow

Implicit Flow は、コード交換を挟まず、認可応答で ID Token を受け取る構成です  
`id_token` なら認証結果だけを受け取り、`id_token token` なら API 用の Access Token も受け取ります  
図は後者を示し、RP の処理をブラウザ内に置いています [OIDC Core §3.2.1](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitFlowSteps)

<div class="sequence-diagram" tabindex="0" role="region" aria-label="oidc-implicit のシーケンス図">

![Implicit Flow：ブラウザ内の RP が OP へ認証要求を送り、認証結果と API 用の資格情報をブラウザ経由で受け取る。RP は認証結果を検証し、資格情報で API を呼ぶ。コード交換は行わない](/diagrams/oidc-implicit.svg)

</div>

ブラウザ経由で認証結果を受け取るため、RP は開始したログインとの対応と認証結果の検証を行います  
値の名前と必須条件は、ID Token の検証で扱います [OIDC Core §3.2.2.9](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitTokenValidation)・[§3.2.2.10](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitIDToken)・[§3.2.2.11](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitIDTokenValidation)

### Hybrid Flow

Hybrid Flow は、認可応答でコードとトークンを受け取り、さらにコード交換を行う構成です  
図の `code id_token` では認証結果を先に受け取り、Access Token はバックチャネルで取得します  
他の二つの組合せでは、比較表のとおり Access Token も認可応答に含まれます [OIDC Core §3.3.1](https://openid.net/specs/openid-connect-core-1_0.html#HybridFlowSteps)

<div class="sequence-diagram" tabindex="0" role="region" aria-label="oidc-hybrid のシーケンス図">

![Hybrid Flow の code id_token：OP が code・ID Token・state を fragment で返し、ブラウザ内の RP 処理がバックエンドへ渡す。RP は ID Token と c_hash を検証し、コード交換で ID Token と Access Token を受け取る。両 ID Token の iss と sub の一致も確認する](/diagrams/oidc-hybrid.svg)

</div>

`c_hash` は、at_hash と同様の考え方で認可コードから計算する値です  
認可応答の ID Token には、同時に返すコードに対応する `c_hash` が必須です  
`code id_token token` なら、同時に返す Access Token に対応する `at_hash` も必須です  
これらは値の差し替えを検出するための結び付きで、署名・発行元・宛先の検証を代替しません [OIDC Core §3.3.2.10](https://openid.net/specs/openid-connect-core-1_0.html#HybridCodeValidation)・[§3.3.2.11](https://openid.net/specs/openid-connect-core-1_0.html#HybridIDToken)

両方の endpoint から ID Token を受け取った場合、`iss` と `sub` は一致しなければなりません  
token endpoint 側では `at_hash` と `c_hash` を省略できるため、認可応答と同じ Claim 一覧を要求するわけではありません [OIDC Core §3.3.3.6](https://openid.net/specs/openid-connect-core-1_0.html#HybridIDToken2)

### 検証とフローの選択

どのフローでも、RP は ID Token の発行元・宛先・期限・要求との対応などを条件に従って検証します  
本教材の RP は信頼する OP の鍵と許可した署名方式を使い、nonce の不一致や宛先の違いを拒否します  
そのため OP は、公開した鍵と宣言した方式で署名し、要求の nonce と RP の client ID を ID Token に正しく載せます  
フローごとに必須となる `at_hash` や `c_hash` も、OP が同時に返す値から計算して含めます  
`at_hash` / `c_hash` の計算による検証は Core が SHOULD として示す手順で、図では実施する構成を示しています  
Claim を含めることが必須となる条件と、RP の検証手順に対する MUST・SHOULD の指定は区別してください [OIDC Core §3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)・[§3.2.2.9](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitTokenValidation)・[§3.3.2.10](https://openid.net/specs/openid-connect-core-1_0.html#HybridCodeValidation)

現在の選択には OAuth Security BCP も適用します  
RFC 9700 は、トークン注入と漏えいの対策がない限り、Access Token を認可応答で返す方式を使うべきではないとしています  
代わりに `code` や `code id_token` のように token endpoint で Access Token を得る方式を推奨します  
これは `id_token` 単独や Hybrid 全体を一律禁止する記述ではありません [RFC 9700 §2.1.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1.2)

三つを知ることで既存の接続設定を読めますが、教材の OP が提供し RP が使うフローの採用案は、引き続き Code Flow + PKCE です  
図は仕様の説明であり、三つのフローを実装・接続試験した記録ではありません
