# ID Token の発行と検証

::: tip このページの目標

OP が発行する ID Token を、RP が署名と Claims の検証条件に照らしてどう受け入れるかを説明し、OP が正しく設定すべき値と安定した利用者識別子の条件を説明できるようになる

:::

::: info このページの要点

- **実物**：HTTP 応答の ID Token は、Claims を JWT として表し、教材では JWS で署名する
- **発行と検証の契約**：RP は署名・発行元・宛先・期限・開始した要求との対応を検証するので、OP はそれらの値を根拠に基づいて設定し、公開した鍵で署名する
- **識別**：OP は issuer の下で安定した `sub` と、要求した RP を表す `aud` を発行し、RP は `iss` と `sub` の組で利用者を識別する
- **暗号化**：JWE と HTTPS の保護範囲を分けて設計する

:::

前のページでは、三つのフローがどの経路で ID Token を届けるかを確認しました  
ここでは教材の Code Flow に絞り、OP が発行する文字列の中身と、RP がそれを今回のログインに使える条件を調べます  
RP は OAuth の章で Client と呼んだチャットビューアーで、役割の対応は[OAuth と OIDC の対応表](oidc.md#oidc-roles)で確認できます  
RP が検証して拒否する条件は、OP から見れば発行時に満たすべき契約です  
まず実際の応答を見て、その表現を読むための JWT・JWS・JWK を説明し、RP の検証条件と OP が発行する識別子へ進みます  
最後に、トークン自体を暗号化するかという設計上の選択を確認します  
RP 側でのライブラリの使い方、要求の保存、アカウントの対応付けは、コラム「[OIDC RP の実装](../columns/rp-implementation.md)」で扱います

## ID Token の発行と検証 {#tokens}


通信で届いた文字列を読めることと、今回のログインに使えることは別の判断です  
要求からトークンの発行、RP による内容の検証、RP セッションの確立までを順に追います [OIDC Core §3.1.1・§3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowSteps)

### OIDC Code Flow の手順 {#tokens-oidc-code-flow-の手順}

[Code Flow と PKCE](../chapter-2/oauth-flows.md#code-flow)のブラウザ経由のコード応答と、バックエンドからのコード交換を引き継ぎます  
以下では、OP が ID Token を発行し、サーバー側 RP が利用者を識別してセッションを確立するまでを追います  
手順3・4・6が OP の処理で、RP の手順7は OP が発行した値に対する検証です [OIDC Core §3.1.1](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowSteps)

1. **RP が要求を準備する**  
   信頼する issuer と登録済み client の設定を使い、state、PKCE の verifier、nonce を生成する  
   これらを開始したブラウザセッションとともに保存する（[RP 側の保存](../columns/rp-implementation.md#rp-nonce-storage)）
2. **ブラウザを OP へ送る**  
   `response_type=code`、client ID、登録済み callback、`openid` を含む scope、state、PKCE challenge と方式、nonce を認可要求へ含める
3. **OP が要求と認証状態を確認する**  
   client・callback・要求値を検証したうえで、必要な利用者認証と許可の処理を行う  
   既存セッションの利用可否も、再認証の要求や認証からの経過時間の条件に従って判断する
4. **OP がコードを返す**  
   検証済み callback へ、ブラウザを通じてコードと state を返す  
   この経路で ID Token を直接返す構成にはしない
5. **RP がコードを交換する**  
   開始した処理と state を照合し、バックエンドからコード、verifier、必要な redirect URI とクライアント認証を送る
6. **OP がトークン応答を返す**  
   コードの検証と消費が成立した場合に、Access Token と ID Token を返す  
   ID Token には、この要求で受け取った nonce を含める
7. **RP が ID Token を検証する**  
   信頼する発行者の署名と、ID Token 内の主張である Claims（発行者 `iss`、利用者 `sub`、宛先 `aud` など）、有効期間、保存した nonce との対応を確認する  
   成功後に `iss` と `sub` の組を内部アカウントへ対応付け、RP のセッションを確立する（[RP 側の対応付け](../columns/rp-implementation.md#rp-account-mapping)）
8. **必要なリソースへアクセスする**  
   ユーザー属性が必要なら、OP が利用者情報を返す UserInfo エンドポイントを Access Token で呼び、返された `sub` を ID Token と照合する  
   メッセージ API を呼ぶ場合も Access Token を使い、API 側の認可を受ける

`openid` は OIDC の要求であることを示します  
メッセージへのアクセスも同時に要求するなら、traQ が定義する `read` などを別途含めます  
`openid` を指定したことだけで、メッセージへの権限は与えられません  
UserInfo の呼出しも、RP のセッション作成に常に追加で必要な手順という意味ではありません [OIDC Core §3.1.2.1・§5.3](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest)

教材の RP は毎回 nonce を送る方針ですが、Code Flow の要求すべてで無条件に必須という規範ではありません  
OP から見ると、要求に含まれた nonce を ID Token へ返すことと、nonce を省略した他の RP の要求も扱う条件を区別します  
state・PKCE の責任は認可の章から変わらず、ID Token を追加したことで省略されません

### トークンエンドポイントの HTTP 応答 {#tokens-トークンエンドポイントの-http-応答}

以下は `examples/jose/` の公開教材データです  
RSA 鍵で実際に署名した値ですが、OP との通信記録ではありません  
教材の参照 OP は未実装です  
この署名例は traQ が発行したトークンではありません  
秘密鍵は生成時にだけ使い、保存していません

この例の発行時刻は **2026-09-20 00:00:00 UTC**、有効期限はその600秒後です  
nonce、ユーザー、client ID、Access Token も固定の説明用データです  
現在のログインや本番環境へ流用しません  
以下の表示は実在するファイルから取り込み、検証スクリプトも同じファイルを読みます

Code Flow の成功応答では、JSON の `id_token` に ID Token の文字列が入ります  
隣にある `access_token` はメッセージ API 等へ提示する別の値であり、JSON 応答全体が一つの JWT なのではありません [OIDC Core §3.1.3.3](https://openid.net/specs/openid-connect-core-1_0.html#TokenResponse)

<<< @/../examples/jose/token-response.http{http}

### JWT と周辺仕様の関係 {#tokens-jwt-と周辺仕様の関係}

[JWT](../reference/glossary.md#jwt) は Claims を JSON で表し、JWS や JWE の構造で運ぶ形式です  
[Claims](../reference/glossary.md#claims) は「発行者」「対象者」「期限」などの主張を意味します  
JWT という名前だけで、どの主張を必須とし、誰が何を検証するかが用途を越えてすべて決まるわけではありません  
ID Token には OIDC の追加条件があります [RFC 7519 §3–5](https://www.rfc-editor.org/rfc/rfc7519.html#section-3)

[JWS](../reference/glossary.md#jws) は署名または MAC による完全性の保護を表現します  
教材で採る署名付きの compact 形式は、保護されたヘッダー、ペイロード、署名の三部分です  
前二つは base64url で表現され、暗号化された秘密情報ではありません  
デコードしただけの内容は、まだ攻撃者から渡された未検証の入力です [RFC 7515 §3.1・§5.2](https://www.rfc-editor.org/rfc/rfc7515.html#section-3.1)

[JWE](../reference/glossary.md#jwe) は暗号化した内容を運ぶための形式です  
読まれないようにすることと、改ざんを検出することは異なる目的です  
本教材は JWE の詳細実装を扱いませんが、署名付き ID Token に不要な個人情報を詰め込んでよい理由にはなりません [RFC 7516 §3](https://www.rfc-editor.org/rfc/rfc7516.html#section-3)

[JWK](../reference/glossary.md#jwk) は鍵を JSON で表す形式で、JWKS はその集合です  
JWK は公開鍵だけの形式ではなく、秘密鍵や対称鍵も表現できるため、公開 JWKS に載せる内容は選別が必要です  
また、JWT のすべてが内部に JWK を持つわけでもありません [RFC 7517 §4–5](https://www.rfc-editor.org/rfc/rfc7517.html#section-4)

### ID Token の内容と署名 {#tokens-id-token-の内容と署名}

ここからは、手順6で受け取った ID Token を具体的な値で読みます  
デコード、署名検証、Claims の照合を区別しながら、手順7で受け入れるための条件へ進みます

#### compact JWS の構造 {#tokens-compact-jws-の構造}

`id_token` は、ピリオドを含む一行の文字列です  
下のタブでは、同じ値を二つの表示で比較できます  
**「閲覧用」はピリオドの直後に説明用の改行を加えています**  
実際のトークンには途中の改行はなく、通信や署名検証では「実際の値」の一行を使います

::: code-group

<<< @/../examples/jose/id-token.display.txt{text} [閲覧用：区切りで改行]

<<< @/../examples/jose/id-token.txt{text} [実際の値：改行なし]

:::

閲覧用の1行目がヘッダー、2行目がペイロード、3行目が署名です  
区切りのピリオドは1・2行目の末尾に残してあり、表示のために挿入した改行を除けば、元の一行と同じ文字列になります

ピリオド `.` で区切られた三つの部分は、順に次を表します  
ここでは署名付き JWT を JWS Compact Serialization で表しています [RFC 7515 §3.1](https://www.rfc-editor.org/rfc/rfc7515.html#section-3.1)

1. **保護されたヘッダー**：UTF-8 の JSON を base64url で表現したもの
2. **ペイロード**：この例では Claims の JSON を UTF-8 にして base64url で表現したもの
3. **署名**：署名のバイト列を base64url で表現したもの  
   JSON ではない

JWT の内容をデコードする際、先頭二部分を base64url からバイト列へ戻し、UTF-8 の JSON として読みます  
三つ目の署名を JSON として読む処理はありません

#### デコードしたヘッダーと Claims {#tokens-デコードしたヘッダーと-claims}

ヘッダーをデコードすると次の内容になります  
[`alg`](../reference/glossary.md#alg) は署名方式、[`kid`](../reference/glossary.md#kid) は検証鍵を選ぶ手掛かりです  
`typ` はこの例で JWT として示した型情報であり、この値だけで OIDC の認証結果として信頼できるわけではありません

<<< @/../examples/jose/header.json

ペイロードをデコードすると、発行者・利用者・宛先・時刻・nonce が読めます  
表示用にインデントしていますが、署名は表示用に整形し直した JSON に対するものではありません [RFC 7519 §3–4](https://www.rfc-editor.org/rfc/rfc7519.html#section-3)

<<< @/../examples/jose/payload.json

- `iss` は `https://auth.example`、`sub` はその発行者の下での `alice` を表す
- `aud` は、この認証結果を受け取る RP の client ID `chat-viewer` を表す
- `iat` と `exp` は発行時刻と有効期限  
  `auth_time` は発行の60秒前に行った認証を表す
- `nonce` は、例の認証要求で RP が送った値を表す  
  実際には要求ごとに生成・保存した値と照合する

このように内容は読めるため、署名だけで秘密が隠れるとは考えません  
同時に、ここまで読めたことは署名や Claims の検証が成功したことを意味しません

#### JWS の署名対象 {#tokens-jws-の署名対象}

署名対象は、最初の二部分をピリオドでつないだ文字列の ASCII バイト列です  
元の JSON をデコードして再整形したものでも、三部分をすべて含めた文字列でもありません  
この例の署名対象は次の値です [RFC 7515 §5.1–5.2](https://www.rfc-editor.org/rfc/rfc7515.html#section-5.1)

こちらも、閲覧用の表示だけピリオドの直後に改行を加えています  
署名対象のバイト列には、この改行は含めません

::: code-group

<<< @/../examples/jose/signing-input.display.txt{text} [閲覧用：区切りで改行]

<<< @/../examples/jose/signing-input.txt{text} [実際の署名対象：改行なし]

:::

[RS256](../reference/glossary.md#rs256) は SHA-256 と RSASSA-PKCS1-v1_5 による署名です  
この例は2048ビットの RSA 鍵を使います  
検証時も、受け取ったヘッダーとペイロードのエンコード済み文字列をそのまま結合します [RFC 7518 §3.3](https://www.rfc-editor.org/rfc/rfc7518.html#section-3.3)

#### 公開 JWK と JWKS {#tokens-公開-jwk-と-jwks}

この署名に対応する公開鍵は次の JWKS に含まれます  
一番外側の `keys` が鍵の配列で、その一要素が JWK です [RFC 7517 §5](https://www.rfc-editor.org/rfc/rfc7517.html#section-5)

<<< @/../examples/jose/jwks.json

- `kty: RSA` は鍵の種類を表す
- `n` と `e` は RSA の公開パラメータを base64url で表現したもの  
  `e: AQAB` は公開指数65537に対応する
- `use: sig` と `alg: RS256` は、この例で想定する用途と方式を示す
- `kid` はヘッダーの `lecture-rsa-01` と対応する

秘密のパラメータ `d`、`p`、`q` などは含めません  
公開鍵が token の外にあり、RP がそれを選んで署名を検証する関係を確認してください  
公開 JWK のパラメータは [RFC 7518 §6.3.1](https://www.rfc-editor.org/rfc/rfc7518.html#section-6.3.1)に定義されています

### デコードと検証の違い {#tokens-デコードと検証の違い}

compact JWS を三つに分けてデコードすると JSON が読めますが、それは暗号を解いたという意味ではありません  
base64url はバイト列を URL などでも扱いやすい文字列へ表現する方法で、秘密鍵なしに元のバイト列へ戻せます  
したがって、署名付き ID Token を取得できた人は、通常その Claims を読むこともできます

この性質は、不正利用だけでなくログの設計にも関係します  
トークンを長い乱数のように見てログへ記録しても、後から氏名や識別子を復元できる場合があります  
教材の固定データは公開用に作ったものですが、実際の ID Token を同じように教材や障害報告へ貼ってよいわけではありません  
OP も、発行した Claims は RP 以外にも読まれ得る前提で、載せる属性を選びます

受信側は、整形し直した JSON ではなく受信したトークンをそのまま検証し、検証で得た Claims を使います  
ヘッダーの `alg` や `kid` は検証の候補を選ぶ入力であり、信頼済みの設定ではありません [RFC 7515 §5.2](https://www.rfc-editor.org/rfc/rfc7515.html#section-5.2)・[RFC 8725 §3.1](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.1)  
RP 側で取り違えやすい点は、コラムの[デコードと検証の違い](../columns/rp-implementation.md#rp-decode-vs-verify)で扱います

### JWT の用途別の検証 {#tokens-jwt-の用途別の検証}

ある issuer が ID Token と JWT 形式の Access Token の両方を発行すると仮定します  
両方に `iss`、`sub`、`exp` があり、同じ公開鍵で署名を検証できることもあり得ます  
このとき「署名が正しい JWT ならユーザー ID を取り出す」という共通処理だけでは、違う用途のトークンを受け入れる危険があります

| RP のログイン処理 | API のアクセス処理 |
| --- | --- |
| 自分宛ての認証結果を受け入れる | 自分に対するアクセス権限を受け入れる |
| ID Token の仕様と要求への対応を検証する | 採用する Access Token の仕様と権限を検証する |
| 検証後にアプリの利用者へ対応付ける | 検証後に操作対象の認可を行う |

JWT という共通形式は、右と左の入力を交換可能にするものではありません  
RFC 8725 は、同じ発行者が複数種類の JWT を発行する場合に、異なる用途の値を拒否できる検証規則を求めています [RFC 8725 §3.12](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.12)

`typ` のような型を示す情報は用途の区別に利用できますが、すべての既存仕様が同じ値や必須条件を持つわけではありません  
本教材のヘッダー例に `typ=JWT` があることだけで、それが ID Token だと判断できるわけでもありません  
入力を受け付ける場所で期待する種類を決め、その種類に必要な Claims、宛先、署名方式などを検証する構成が必要です  
発行する側も、ID Token と Access Token を同じ Claims の組で作り、受信側が用途を区別できない状態にしないようにします

**確認問題:** 署名済みの Access Token に RP が使うユーザー ID が含まれていた場合、それを ID Token の代わりにできるでしょうか

::: details 解説
含まれる識別子だけでは代用できません  
API へのアクセス権限として発行された値と、RP 向けの認証結果は用途が違います  
どの契約に従って発行され、誰がどの条件で受け入れるものかを確認する必要があります
:::

### 検証鍵の信頼 {#tokens-検証鍵の信頼}

教材の採用案は、OP が RS256 で ID Token に署名し、公開鍵を JWKS で公開するものです  
RP は信頼する issuer を事前に設定し、その issuer の情報から検証鍵を取得します  
トークンのヘッダーに書かれた任意の URL から鍵を取得して、その鍵で署名が正しいから信頼するという順序では、攻撃者が自分の鍵を差し込めます  
そのため OP は、署名に使う鍵の公開部分を自分の issuer の `jwks_uri` から取得できるようにし、ヘッダーの `kid` をその JWKS の鍵と対応させます（公開設定は[Discovery と issuer の整合性](oidc-provider.md#op-discovery-と-issuer-の整合性)）

`kid` は鍵を選ぶ手掛かりです  
それ自体が信頼を作るものではありません  
`alg` も入力が指定した方式を無条件で受け入れず、RP が許可した方式と整合するかを確認します  
鍵の用途と方式を固定することで、同じ文字列を異なる暗号処理や異なる種類のトークンとして受け入れる混乱を避けます [RFC 8725 §3.1・§3.8–3.12](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.1)

### Claims の検証条件 {#tokens-claims-の検証条件}

署名が正しくても、別の RP に向けた結果や期限切れの結果は受け入れられません  
次の表の「RP の問い」は、RP で ID Token を受け入れるときの観点です  
RP はこの問いに答えられない ID Token を拒否するので、OP は右列のとおり各値を根拠に基づいて設定します  
発行側の根拠は[Claims の設定](oidc-provider.md#op-id-token-の発行根拠)で確認します [OIDC Core §2・§3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)

| 項目 | RP の問い | OP が満たすこと |
|---|---|---|
| 署名・`alg` | 信頼する発行者の鍵と、許可した方式で検証できるか | OP が管理する鍵と許可した方式で署名し、検証用の公開鍵を JWKS で公開する |
| `iss` | 設定した issuer と完全に一致するか | OP が管理する issuer の設定から決める |
| `sub` | その issuer の下で誰を表すか | 認証済みユーザーに対応する識別子を使う |
| `aud` | 自分の client ID を含むか<br>想定しない受信者を受け入れていないか | 検証した要求とコードに結び付く client ID を使う |
| `azp` | 採用する拡張で現れる場合、その拡張が定める検証条件を処理したか | 採用する版と拡張の条件に従う |
| `exp` | 現在時刻が有効期限より前か<br>許容する時計のずれを限定しているか | 発行時刻と設定した有効期間から決める |
| `iat` | 必須の発行時刻があるか<br>古さを制限する場合、RP の方針と整合するか | 実際の発行時刻を載せる |
| `nonce` | 送信した場合、その要求で保存した値と一致するか | 認証要求に含まれていた場合、その要求と結び付けて保持した値を返す |
| `auth_time` | `max_age` を要求した場合など、必要な認証時刻と鮮度を確認したか | 必要な場合に、認証セッションが保持する実際の認証時刻を載せる |

これは JWT の検証処理を自作する手順ではありません  
RP の実装時は OIDC を扱うライブラリを使い、その設定と検証範囲を確認します（[RP 側の検証処理](../columns/rp-implementation.md#rp-id-token-validation)）

まず `iss`、`sub`、`aud`、`exp`、`iat` などの必須 Claims が存在し、用途に合う型であることも確認します  
表は値がある場合だけを調べる一覧ではありません  
また、本教材では署名を検証する方針を採ります  
Code Flow の直接の token 応答について Core が条件付きで認める TLS による代替と、教材で署名を検証する方針は区別します  
`azp` も「複数 audience なら常に必須」と一般化せず、参照する Core の版と採用する拡張の条件へ戻ります [OIDC Core §2・§3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)

<span id="https-signature-validation"></span>

::: details コラム：HTTPS と署名検証

Code Flow では、RP が信頼する OP のトークンエンドポイントと直接通信し、ID Token を受け取ります  
この場合、OIDC Core は、トークンの署名検証の代わりに TLS のサーバー検証で発行元を確認する選択を認めています（MAY）  
接続先の証明書を検証し、意図した OP のエンドポイントから受け取ったと確認できることが前提です [OIDC Core §3.1.3.7 手順6](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)

これは「HTTPS のサイトなら、受け取った JWT を検証しなくてよい」という意味ではありません  
ブラウザ経由で受け取る ID Token や、別の相手から転送された値には、その相手との HTTPS 通信だけを理由にこの例外を適用できません  
また、期待する `iss`、自分の `client_id` を含む `aud`、有効期限、送信した `nonce` との一致など、他の検証条件は残ります

本教材では通信経路とトークン自体の検証をそれぞれ理解するため、HTTPS に加えて署名も検証する方針です  
後述の最初の実習は、この署名検証を手元で確かめるものです  
保存した教材ファイルには、OP から直接受信した HTTPS 通信による発行元の確認もありません

なお、JWT 自体の暗号化を JWE で追加するかどうかは別の判断です  
ページ末尾の[HTTPS と JWE のコラム](#tokens-tls-と-jwe-の保護範囲)で、通信中と受信後の保護範囲を比較します

:::

教材の RP は毎回 `nonce` を生成して送り、OP はその要求から発行する ID Token に同じ値を入れます  
`state` と PKCE も維持し、それぞれの対応先を一つの「ランダム文字列」にまとめません  
RP 側での保存と使用済みの管理は、コラムの[nonce の保存と使用済みの管理](../columns/rp-implementation.md#rp-nonce-storage)で扱います

`iat` はトークンの発行時刻、`auth_time` は利用者を認証した時刻です  
OP の既存セッションを使って新しい ID Token を発行した場合、この二つは一致するとは限りません  
新しく発行されたことを、たったいま再認証した証拠として扱わないようにします

#### 有効期限と認証の鮮度 {#tokens-有効期限と認証の鮮度}

署名済みの ID Token が新しく届いても、利用者が最近認証したとは限りません  
次の時刻は説明用の仮定で、実行結果ではありません  
RP は 10時20分に `max_age=300` を指定し、同じ時刻に次の結果を受け取ったとします

| 項目 | 結果 A | 結果 B |
| --- | --- | --- |
| 署名・発行元・宛先・nonce | 期待する条件に一致 | 期待する条件に一致 |
| `iat` | 10時20分 | 10時20分 |
| `exp` | 10時30分 | 10時30分 |
| `auth_time` | 10時00分 | 10時19分 |

両方とも発行直後で、有効期限も先です  
しかし A の認証は20分前なので、RP が要求した5分以内という条件を満たしません  
B はこの時間条件を満たしますが、それでも他の検証を省略してよいわけではありません  
OP が A を発行してしまった場合も、RP は発行時刻を認証時刻の代用にして救済しません [OIDC Core §3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)

この区別は、重要操作の前に認証のやり直しを求める場合にも役立ちます  
RP の画面を開いた時刻、OP セッションへの最終アクセス、トークンの発行時刻を更新しただけでは、利用者を再認証したという事実は増えません  
どの操作の成功でどの時刻が変わるかを決めてから、Claims を使う必要があります

#### 鍵更新時の検証 {#tokens-鍵更新時の検証}

RP が鍵 K1 をキャッシュしている間に、OP が新しい鍵 K2 で署名を始めることがあります  
このとき初めて見る `kid` は、ただちに偽造の証拠にはなりません  
Core は、未知の `kid` を見た検証側が `jwks_uri` から鍵を取り直す更新方法を説明しています [OIDC Core §10.1.1](https://openid.net/specs/openid-connect-core-1_0.html#RotateSigKeys)  
同じ節は、廃止した署名鍵も移行のため一定期間 JWK Set に残すよう推奨しています  
本教材の OP は、K2 を `jwks_uri` から取得できる状態にしてから署名に使い、K1 で発行した有効なトークンが残る間は K1 の公開鍵も載せておく設計にします

教材の信頼関係に当てはめると、判断は次のようになります

1. 事前に信頼した issuer の設定から、取得先の `jwks_uri` を決める
2. K2 が取得できれば、用途・方式などの条件を確認して署名検証をやり直す
3. 取得できない場合や、取り直しても対応する鍵がない場合は、未検証の結果としてログインを成立させない

鍵が見つからないことを理由に署名検証を省いたり、トークンが示した任意の鍵配布先へ切り替えたりすると、信頼できない鍵でトークンを検証することになります  
鍵を取得できない場合と不正なトークンを受け取った場合を運用上は区別して記録しても、利用者を認証済みと判断できない点は共通です

通常の更新では、新しい鍵を使い始めても、旧鍵で発行した有効なトークンが残ります  
一方、秘密鍵の漏えいが理由なら、旧鍵による結果を受け入れ続けてよいかを別に判断する必要があります  
公開鍵の重複期間を設ける通常の更新と、侵害時の信頼の取り消しを同じ手順と考えないことが重要です  
キャッシュ期間や漏えい対応を含む運用は、この教材データの署名検証スクリプトでは確認していません

### 教材データの署名検証 {#tokens-教材データの署名検証}

OP が発行するトークンは、公開した鍵で RP が検証できなければなりません  
ここまでの署名の説明を、実習編の[最初の課題：ID Token の署名検証](../practice/index.md#段階1署名と-jwt-の検証)で手元の結果と対応付けます  
リポジトリのルートで、次のコマンドを実行します  
追加の依存は不要です

```sh
mise exec -- node examples/jose/verify.mjs
```

このスクリプトは次の対応を確認します

- compact JWS をデコードした結果と、表示用のヘッダー・ペイロードが一致する
- 公開 JWK に秘密パラメータがなく、元の署名が検証できる
- ペイロードまたは署名を改変すると、署名検証が失敗する
- HTTP 応答内の ID Token、単独の compact JWS、署名対象が一致する

署名を検証する処理は、同じスクリプトの次の部分です

<<< @/../examples/jose/verify.mjs#signature-verification{js}

**この確認は OIDC RP の実装試験ではありません**  
固定した公開鍵での暗号処理と、教材データの整合性だけを確かめます  
信頼する issuer の選択、現在時刻、audience、要求に結び付いた nonce、RP セッションの確立は、ここまでに説明した条件に従って別途検証する必要があります

### ID Token の拒否試験 {#tokens-id-token-の拒否試験}

RP は、OP から受け取った ID Token に次の拒否条件を適用します  
OP を作る側から見ると、正常な発行がこのどれにも当たらないことと、独立した RP との接続で各条件が拒否されることを確かめる観点になります  
教材の拒否試験では、正しく署名したうえで `aud` だけを別 client に変えます  
これは audience 検証を試すためです  
署名も同時に壊すと、署名検証だけで拒否していても試験が通ってしまいます  
同じ考え方で、次の条件を別々に試験します

- 正しく署名されているが、issuer が期待する値と異なる
- ほかの条件を満たしているが、有効期限を過ぎている
- 保存した要求の nonce と、ID Token の nonce が一致しない
- RP が許可していない署名方式を使っている

RP 側では、拒否した場合にセッションを作っていないかという状態の変化も試験対象です（[拒否時の状態](../columns/rp-implementation.md#rp-rejection-state)）  
現在、OP/RP の参照実装とこれらのプロトコル試験は未実施です  
上で示した教材データの署名・整合性の確認とは区別します

**確認問題:** 同じ OP が署名した別アプリ向けの ID Token を、自分の RP で受け入れられないのはなぜでしょうか

::: details 解説
発行者が信頼できることと、受信者が自分であることは別条件だからです  
署名に加えて audience、要求との対応、有効期限などを検証して、初めて自分のログイン判断に使えます
:::

## 認証結果と利用者の対応 {#authentication-context}

### nonce による認証結果の照合 {#oidc-nonce}

OIDC の概略で扱った「認証結果を開始したログインに結び付ける」ために、RP は [`nonce`](../reference/glossary.md#nonce) を使えます  
RP は認証要求ごとに予測困難な nonce を作って開始した処理とともに保存し、署名と Claims を検証した ID Token の nonce を、保存した値と照合します  
そのため OP は、認証要求に nonce があれば、その要求から発行する ID Token に同じ値を入れます  
別の要求の nonce を入れたり、要求にあった nonce を省いたりした ID Token は、RP の照合で拒否されます [OIDC Core §3.1.2.1・§3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest)  
OP の中で要求と nonce を結び付けて保持する状態は、[認証状態と同意状態](oidc-provider.md#op-認証状態と同意状態)で扱います

認可応答を開始したブラウザ処理へ結び付ける `state` は、[OAuth のフロー](../chapter-2/oauth-flows.md#code-flow-state)で扱いました  
コード交換を AS 側で保護する PKCE は、認可章末の[PKCE とコード交換の保護](../chapter-2/pkce.md)で扱います  
nonce はこれらの代わりではなく、ID Token という認証結果を RP が照合するための値です

RP が同じブラウザで並行する複数のログインをどう区別するかは、コラムの[並行するログイン要求](../columns/rp-implementation.md#rp-concurrent-logins)で扱います

### scope と発行する属性 {#oidc-共有する属性の選択}

OP は、要求された scope と利用者の許可に応じて、ID Token や UserInfo で返す Claims を決めます  
OIDC の `profile` や `email` の scope は、属性を要求するためのもので、すべての値が常に存在するという約束ではありません [OIDC Core §5.4](https://openid.net/specs/openid-connect-core-1_0.html#ScopeClaims)  
ID Token に多くの属性を詰めるほど、更新の反映、保存期間、ログへの露出も増えます  
RP が安定した識別子として使えるのは `iss` と `sub` の組であり、OP が返す表示用の属性ではありません [OIDC Core §5.7](https://openid.net/specs/openid-connect-core-1_0.html#ClaimStability)

RP がどの属性を求め、受け取った値を何に使うかは、コラムの[共有する属性の選択](../columns/rp-implementation.md#rp-attribute-selection)で扱います

### OP 内部の認証と認証連携 {#oidc-op-内部の認証と認証連携}

OP は、利用者を認証した結果に基づいて ID Token を発行します  
その内部でパスワードを検証するか、パスキーの応答を検証するかは、RP への認証連携と分けて設計します  
OIDC は OP が利用者を認証する責任を定めますが、認証手段の具体的な実装まで一つに指定するものではありません [OIDC Core §3.1.2.3](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequestAuthentication)

RP が受け入れるのは、OP の内部関数が返した成功を示す値ではなく、検証条件を満たした認証結果です  
OP の内部での認証を変更しても、RP は引き続き発行者、宛先、要求との対応などを検証します  
おまけ編①の[パスキーの仕組みと認証の設計](../chapter-ex1/passkeys-background.md)は、OP 内部の認証を具体化する位置付けです

### 利用者の識別 {#oidc-利用者の識別}

RP は ID Token をログインに使う前に、少なくとも自分の client ID が [`aud`](../reference/glossary.md#audience) に含まれることと、[`sub`](../reference/glossary.md#subject) があることを確かめます  
`aud` は「この認証結果をこの RP が受け取ってよいか」を、`sub` は「issuer の下で誰を表すか」を示すため、どちらか片方だけでは足りません  
さらに RP は、外部アカウントを内部ユーザーへ対応付ける識別子として、発行者 [`iss`](../reference/glossary.md#issuer) と `sub` の組を使います

したがって OP は、`aud` に要求した RP の client ID を入れ、`sub` にはその issuer の下で安定した識別子を発行します  
`sub` は issuer の中で一意で、別の利用者へ再割当てしない値でなければなりません  
表示名やメールアドレスが変わるたびに `sub` が変われば、RP は同じ利用者を照合できなくなります [OIDC Core §2・§5.7](https://openid.net/specs/openid-connect-core-1_0.html#ClaimStability)

二つの OP が同じ `sub` を発行しても同じ利用者とは限りません  
メールアドレス、表示名、`preferred_username`、アイコン、所属などの属性は変更・欠落・再割当てされ得ます  
これらを安定した識別子の代わりにしたり、`aud`・`iss`・`sub` の検証を省く理由にしたりしません [OIDC Core §5.1・§5.7](https://openid.net/specs/openid-connect-core-1_0.html#ClaimStability)  
RP が `iss` と `sub` の組を内部ユーザーへどう対応付けるかは、コラムの[外部アカウントと内部ユーザーの対応](../columns/rp-implementation.md#rp-external-account)で扱います

#### メールアドレスの確認とアカウント統合 {#oidc-メール確認とアカウント統合}

[`email_verified=true`](../reference/glossary.md#email-verified) は、OP がそのメールアドレスの制御を確認したという主張です  
そのアドレスを永遠に同じ人物が使うことや、別の OP の同名アカウントと同一であることまでは保証しません [OIDC Core §5.1・§5.7](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims)  
OP がこの値を返すなら、実際に行った確認に基づかせます  
メールアドレスの一致を理由に既存ユーザーへ自動統合しない RP 側の設計は、コラムの[メールアドレスの確認とアカウント統合](../columns/rp-implementation.md#rp-email-account-linking)で扱います

#### public と pairwise の識別子 {#oidc-public-と-pairwise-の識別子}

OIDC には、クライアント間で同じ値を使う public な `sub` と、利用先をまたぐ照合を抑える [pairwise な `sub`](../reference/glossary.md#subject-types) があります  
pairwise の計算単位は Sector Identifier であり、常にクライアント一つにつき異なる値になると単純化はできません [OIDC Core §8・§8.1](https://openid.net/specs/openid-connect-core-1_0.html#SubjectIDTypes)

OP はどちらの方式で `sub` を発行するかを決め、pairwise なら同じ Sector Identifier に属する RP へ同じ値を返します  
したがって、別の RP から受け取った `sub` を、そのまま自分の RP のユーザー一覧と照合する設計にはできません  
`sub` を世界共通の人物番号と見なさず、どの issuer が、どの利用先に対して示した識別子かを保つ必要があります

### 認証結果の拒否条件 {#oidc-認証結果の拒否条件}

別 RP 向けの ID Token を持ってきた人がいても、署名が正しいだけではログインを許可できません  
認証結果の宛先が自分ではないからです  
同様に、メッセージ API へ ID Token を送っても、Access Token として扱いません  
これらは文字列の形式が似ていることによって消えてよい境界ではありません  
OP と API を作る側も、ID Token を API 用の資格情報として受け付けない構成にします

**確認問題:** 「Access Token でユーザー情報が取れたので、そのユーザー情報 API を使う方式はすべて OIDC である」という説明は正しいでしょうか

::: details 解説
正しくありません  
サービス固有の認証連携はあり得ますが、OIDC には要求・ID Token・検証などの共通契約があります
:::

## JWE の暗号化と検証 {#tokens-jwe-の暗号化と検証}

JWS が保護する署名対象は読み取れるため、内容を受信者以外へ見せたくない場合には暗号化を別に考えます  
JOSE で暗号化された内容を表現するのが JWE です  
ただし、JWS の署名部分を暗号文へ置き換えれば JWE になるわけではありません

compact JWE は、ドットで区切られた五つの部分で表現されます [RFC 7516 §3.1](https://www.rfc-editor.org/rfc/rfc7516.html#section-3.1)

| 部分 | 役割 |
| --- | --- |
| 保護されたヘッダー | 鍵管理方式や内容の暗号化方式などを示す |
| 暗号化された鍵 | 内容を暗号化する鍵の受け渡しに使う情報を持つ<br>選んだ方式によっては空になる |
| [初期化ベクトル（IV）](../reference/glossary.md#iv-tag) | 内容の暗号化で使う値 |
| 暗号文 | 読めないように保護した内容 |
| 認証タグ | 暗号文などの完全性を確認するための値 |

ここでの `alg` は鍵管理の方式を示し、[`enc`](../reference/glossary.md#jwe-enc) は内容を暗号化する方式を示します  
JWS の `alg` と同じヘッダー名が登場しても、すべてが署名方式を表すわけではありません  
ライブラリの設定でも、署名用と暗号化用の方式や鍵を混ぜない必要があります

この表は形式を理解するためのもので、初期化ベクトルや鍵の生成処理を自作する手順ではありません  
暗号方式ごとの条件はライブラリと仕様に従い、本教材では JWE の実装例を追加しません

### 復号と発行者の確認 {#tokens-復号と発行者の確認}

公開鍵で受信者宛てに暗号化する方式では、その公開鍵を知る人が暗号文を作れる構成があります  
したがって、受信者が自分の秘密鍵で復号できたことだけから、「信頼する OP が作った」とは判断できません  
内容を誰が読めるかという条件と、誰が発行したかという条件は分けて成立させます

そのため ID Token を署名と暗号化の両方で保護する場合、OIDC は署名してから暗号化する順序を定めています  
OP は発行者の鍵で署名した ID Token を、受信者の鍵で暗号化します  
受信側は外側を復号した後、内側の署名付き ID Token を検証し、さらに Claims を照合します [OIDC Core §2・§16.14](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)、[RFC 7519 §11.2](https://www.rfc-editor.org/rfc/rfc7519.html#section-11.2)  
RP 側で処理を省略してはならない理由は、コラムの[復号と発行者の確認](../columns/rp-implementation.md#rp-decrypt-then-verify)で扱います

### TLS と JWE の保護範囲 {#tokens-tls-と-jwe-の保護範囲}

TLS は通信区間を、JWE はトークンの内容を暗号化します  
どちらを使うかは、誰に内容を見せてよいか、どこまで保護を続ける必要があるかで考えます

::: details コラム：HTTPS を前提とする設計

ここでは JWT 自体の暗号化を追加するかどうかを扱います  
前述の[HTTPS と署名検証](#https-signature-validation)で扱った、発行元の確認方法の選択とは別の論点です

本教材のように、OP と RP が HTTPS で直接 ID Token をやり取りし、通信の終端で内容を扱う主体を信頼できるなら、通信中の盗聴対策を TLS に任せ、JWT 自体の暗号化は採用しないという設計ができます  
署名付き ID Token を HTTPS で受け取り、署名・発行者・宛先・期限などを検証する構成です  
OIDC Core でも ID Token の暗号化は追加の選択肢です [OIDC Core §2](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)

この構成では、JWE 用の受信者の鍵の配布・更新、暗号方式の合意、復号失敗の処理を追加せずに済みます  
HTTPS を利用条件に含め、保護された通信経路へ構成を揃えることは、対応範囲を絞って実装と運用を簡潔にする判断です  
平文 HTTP の接続先を使えなくなることや、証明書の発行・更新、開発環境の信頼設定が必要になることは、その際の制約です  
本教材では、この制約を受け入れて HTTPS を前提にする方針を採ります

HTTPS を前提にするとは、最初から HTTPS の URL へ送信し、証明書と接続先を検証することです  
トークンを HTTP で送ってから HTTPS へ転送しても、最初の通信は保護できません  
証明書エラー時に検証を無効化したり、HTTP へ切り替えたりする実装も、この前提を崩します  
Bearer Token の通信に TLS を使うことは、RFC 6750 自体の要件でもあります [RFC 6750 §1・§5.2](https://www.rfc-editor.org/rfc/rfc6750.html#section-5.2)

ただし、HTTPS が守る範囲は TLS の終端までです  
ロードバランサーで終端するなら、そこからアプリまでの経路も別に保護する必要があります  
TLS を終端する中継者やトークンを運ぶ Client にも内容を見せたくない場合は、最終受信者だけが復号できる JWE など、トークン自体の保護を検討します  
RFC 6750 も、通信経路の保護と Client から内容を隠すための暗号化を区別しています [RFC 6750 §5.2](https://www.rfc-editor.org/rfc/rfc6750.html#section-5.2)

HTTPS は保存済みのトークンやログを暗号化するものではなく、JWE も復号後の漏えいを防ぎません  
不要な Claims を発行せず、トークンをログへ残さないなど、受信後の扱いは別に設計します  
また、暗号化した Bearer Token でも、盗んだ値をそのまま提示できれば悪用され得ます  
JWT の暗号化を省く判断と、署名・Claims の検証やトークンの漏えい対策を省く判断は分けてください

:::
