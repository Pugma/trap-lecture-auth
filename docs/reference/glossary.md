# 用語集

::: tip このページの目標

分からない用語や略称の意味を確認し、使われる条件を説明した本文へ戻れるようになる

:::

::: info このページの要点

- **用語と略称**：認証・認可の主体、トークン、検証に使う値、暗号技術に関わるデータ形式などの意味と主要な英語名称を確認する
- **区別する概念**：用途と形式、認証と認可、利用者とクライアントなど、混同しやすい概念を分ける
- **本文との対応**：適用条件や具体例は、各項目に対応する本文の説明へ戻って確かめる

:::

本書の用語を、誰が何のために利用し、何を検証するかという観点から整理します  
主要な略称には元の英語名称を併記しています  
各語の適用条件と根拠は、対応する本文を参照してください

## 認証・認可と主体 {#判断と主体}

| 用語 | この教材での意味 | 区別するもの |
| --- | --- | --- |
| <span id="authentication">認証 / Authentication</span> | アカウントに結び付いた認証手段の制御などを確認すること | 現実の氏名の確認や、操作の許可そのものではない |
| <span id="authorization">認可 / Authorization</span> | 誰が何をどの条件でできるかを決めること | ログイン成功だけで全操作を許可しない |
| <span id="resource-owner">Resource Owner</span> | 保護されたリソースへのアクセスを許可できる主体<br>例ではチャットの利用者 | Client と同じ主体とは限らない |
| <span id="client">Client</span> | 保護されたリソースへのアクセスを要求するアプリ<br>本教材では利用者の許可に基づいて API を使う | ブラウザというプログラムの別名ではない |
| <span id="authorization-server">AS（Authorization Server）</span> | Client にトークンを発行する側 | API での各チャンネルへのアクセス権の確認まで代行するとは限らない |
| <span id="resource-server">RS（Resource Server）</span> | トークンを受け取り保護されたリソースを提供する側 | AS と同じプロセスでも役割は別 |
| <span id="client-types">confidential / public</span> | Client が資格情報の機密性を保てるかという分類 | 利用者に公開されているか、ソースが公開されているかではない |
| <span id="openid-provider">OP（OpenID Provider）</span> | 利用者を認証し、その認証結果を RP へ伝える OAuth の AS | OP 内部のログイン方式は OIDC の外に残る |
| <span id="oidc-rp">OIDC RP（Relying Party）</span> | OP の認証結果を検証し利用する Client | WebAuthn RP とは位置が違う |
| <span id="webauthn-rp">WebAuthn RP（Relying Party）</span> | WebAuthn の登録・認証結果を検証するサービス | 本教材では OP がこの役割も担う |

各主体の役割は [RFC 6749 §1.1・§2.1](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.1)、[OIDC Core §1.2](https://openid.net/specs/openid-connect-core-1_0.html#Terminology)、[WebAuthn §4](https://www.w3.org/TR/webauthn-3/#terminology)で確認できます  
OAuth と OIDC の用語の対応は[登場人物の対応表](../chapter-3/oidc.md#oidc-roles)で確認できます  
認証と認可の違いは[認証と認可の定義](../chapter-1/overview.md#definitions)から説明しています

## 権限管理

| 用語 | この教材での意味 | 本文 |
| --- | --- | --- |
| <span id="rbac">RBAC（Role-Based Access Control）</span> | ロールに操作権限をまとめ、主体をロールへ割り当てて管理する方式 | [説明](../columns/permissions.md#oauth-rbac-と-abac) |
| <span id="abac">ABAC（Attribute-Based Access Control）</span> | 主体・リソース・操作・環境の属性をポリシーに照らして認可する方式<br>ロールを使う判断とも組み合わせられる | [説明](../columns/permissions.md#oauth-属性による認可) |

## OIDC の通信経路

| 用語 | 意味 | 本文 |
| --- | --- | --- |
| <span id="implicit-flow">Implicit Flow</span> | OIDC ではコード交換なしで認可応答から ID Token を受け取る方式 | [説明](../chapter-3/oidc-other-flows.md#implicit-flow) |
| <span id="hybrid-flow">Hybrid Flow</span> | 認可応答でコードとトークンを受け取り、コード交換も行う方式 | [説明](../chapter-3/oidc-other-flows.md#hybrid-flow) |
| <span id="front-back-channel">フロントチャネル / バックチャネル</span> | ブラウザを介する経路と、RP・OP が直接通信する経路 | [比較](../chapter-3/oidc-other-flows.md#三つのフローの比較) |
| <span id="token-hash">at_hash / c_hash</span> | Access Token / 認可コードから計算した値<br>ID Token と同時に受け取った値の対応を検証するために使う | [説明](../chapter-3/oidc.md#authorization-code-flow) |

## 状態とトークン

<span id="logout-channels"></span>
**Front-Channel Logout / Back-Channel Logout**：OP から RP へログアウトを伝える仕様  
前者はブラウザを介し、後者はサーバー間で直接通知する  
RP から OP へ終了を求める RP-Initiated Logout と組み合わせて考える → [通知経路の説明](../chapter-3/federation.md#comparison-rp-間のログアウト連携)

| 用語 | 提示先・役割 | 混同しないもの |
| --- | --- | --- |
| <span id="authorization-code">認可コード</span> | Client が AS でトークンに交換する一回限りの値 | API に直接提示する Access Token |
| <span id="access-token">Access Token</span> | RS へのアクセスに使う資格情報 | RP のログインのための ID Token |
| <span id="refresh-token">Refresh Token</span> | AS に提示し Access Token の更新に使う資格情報 | RS に送るものではない |
| <span id="id-token">ID Token</span> | OP が RP へ伝える認証についての Claims を持つ JWT | API の読み取り権限そのもの |
| <span id="bearer-token">Bearer Token</span> | 所持して提示できれば利用できる性質のトークン | JWT/opaque という表現形式とは別軸 |
| <span id="opaque-token">opaque token</span> | Client が内容を解釈せず扱うトークン | AS や RS も検証できない、という意味ではない |
| <span id="scope">scope</span> | 要求・許可するアクセス範囲を表す文字列 | チャンネルへのアクセス権などの個々のリソースへのアクセス権をすべて表すものではない |
| <span id="grant">grant</span> | 仕様ではトークン取得のための認可を表すもの | 本文の grant の保存方法は教材上の設計で、標準 DB スキーマではない |
| <span id="session">OP / RP セッション</span> | それぞれのアプリがブラウザとの間に保つ状態 | 一方のログアウトで他方や全トークンが終了するとは限らない |

トークンの役割は [RFC 6749 §1.3–§1.5](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.3)、[RFC 6750 §1.2](https://www.rfc-editor.org/rfc/rfc6750.html#section-1.2)、[OIDC Core §2](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)へ戻れます  
状態の寿命は[トークンの寿命](../chapter-2/token-lifecycle.md#lifecycle)で比較します

## 要求と応答の対応付け {#要求と応答の結合}

| 値 | 教材での検証担当 | 結び付ける対象 |
| --- | --- | --- |
| <span id="state">state</span> | RP / Client | 開始時のブラウザセッション・処理と認可応答 |
| <span id="pkce-values">code_verifier / code_challenge</span> | AS | 認可要求に対応するコードと交換要求 |
| <span id="nonce">nonce</span> | RP | 開始した OIDC 認証要求と ID Token |
| <span id="redirect-uri">redirect_uri</span> | AS | 事前登録した Client の戻り先と認可要求・交換要求 |
| <span id="issuer">issuer / iss</span> | RP | 信頼する OP と発行元の識別子 |
| <span id="subject">subject / sub</span> | RP | issuer の下で識別されるユーザー<br>外部アカウントは iss と sub の組で対応付ける |
| <span id="audience">audience / aud</span> | RP または RS | そのトークンが想定する受け取り手 |

この表は、本教材が state と nonce を併用する構成を示します  
仕様上の必須条件を一律に定める表ではありません  
[Code Flow と PKCE](../chapter-2/oauth-flows.md#code-flow)・[ID Token の検証](../chapter-3/id-token.md#tokens)で適用条件を確認してください

## 表現・鍵・ユーザー検証

| 用語 | 意味 | 注意点 |
| --- | --- | --- |
| <span id="jwt">JWT（JSON Web Token）</span> | Claims を運ぶ形式 | デコード成功と検証成功は別 |
| <span id="jws">JWS（JSON Web Signature）</span> | 署名または MAC で保護する表現 | 暗号化ではなく、内容を読める場合がある |
| <span id="jwe">JWE（JSON Web Encryption）</span> | 暗号化で保護する表現 | JWS と役割が違う |
| <span id="jwk">JWK（JSON Web Key）/ JWKS（JSON Web Key Set）</span> | 鍵の表現 / 鍵集合 | 秘密鍵も表現可能なので公開時に秘密部分を含めない |
| <span id="kid">kid（Key ID）</span> | 鍵を選ぶ手がかりとなる識別子 | 信頼する発行元の証明そのものではない |
| <span id="up">UP（User Presence）</span> | ユーザーの関与を示す結果 | ユーザー検証を意味する UV とは別 |
| <span id="uv">UV（User Verification）</span> | 認証器側でユーザー検証を実施した結果 | 通常のフラグだけで PIN と生体を区別できない |
| <span id="mfa">MFA（Multi-Factor Authentication）</span> | 異なる種類の要素を組み合わせる認証 | 画面数やタップ回数で分類しない |

JOSE は[ID Token の検証](../chapter-3/id-token.md#tokens)、UP/UV と認証要素は[パスキーの読み物](../chapter-ex1/passkeys-background.md#passkeys)と[UV のコラム](../columns/user-verification.md)で根拠と一緒に扱います

## 仕様・方式・実装

| 用語 | この教材での意味 | 本文 |
| --- | --- | --- |
| <span id="oauth">OAuth 2.0</span> | 保護されたリソースへのアクセスを委譲するための枠組み<br>エンドユーザーの認証結果を Client へ伝える契約は単体では定まらない | [説明](../chapter-2/oauth.md#oauth) |
| <span id="oauth-one">OAuth 1.0</span> | 要求への署名などを扱う、OAuth 2.0 とは異なるプロトコル | [説明](../chapter-2/token-lifecycle.md#oauth-1-column) |
| <span id="oidc">OIDC（OpenID Connect）</span> | OAuth 2.0 の上に、認証結果の発行・伝達・検証の契約を加える仕様 | [説明](../chapter-3/oidc.md#oidc) |
| <span id="code-flow">Authorization Code Flow</span> | ブラウザ経由で受け取った認可コードを、トークンエンドポイントで交換するフロー | [説明](../chapter-2/oauth-flows.md#code-flow) |
| <span id="oauth-implicit">Implicit Grant</span> | コード交換を行わず、認可応答で Access Token を受け取る OAuth の方式<br>OIDC の Implicit Flow とは返すトークンの条件が異なる | [説明](../chapter-2/oauth-flows.md#oauth-grant-types) |
| <span id="password-grant">ROPC（Resource Owner Password Credentials）Grant</span> | Client が利用者のパスワードを受け取ってトークンを要求する方式<br>Password Grant とも呼ぶが、RFC 9700 では使用禁止 | [説明](../chapter-2/oauth-flows.md#oauth-grant-types) |
| <span id="device-authorization">Device Authorization Grant</span> | 入力やブラウザ利用が制限された機器のために、別端末で利用者が認証・許可する方式<br>RFC 8628 による OAuth の拡張 | [説明](../chapter-2/oauth-flows.md#oauth-grant-types) |
| <span id="pkce">PKCE（Proof Key for Code Exchange）</span> | 認可要求で送った challenge と、コード交換時の verifier を対応付ける仕組み | [説明](../chapter-2/oauth-flows.md#code-flow) |
| <span id="s256">S256</span> | PKCE で verifier を SHA-256 により変換し、base64url で challenge を表す方式 | [説明](../chapter-2/oauth-flows.md#code-flow) |
| <span id="authorization-endpoint">認可エンドポイント</span> | Client の認可要求を受け付ける場所<br>教材ではブラウザを介してアクセスする | [説明](../chapter-2/oauth-flows.md#code-flow) |
| <span id="token-endpoint">トークンエンドポイント</span> | 認可コードの交換やトークンの更新要求を受け付ける場所 | [説明](../chapter-2/oauth-flows.md#code-flow) |
| <span id="client-secret">client secret</span> | Client の認証に利用する秘密<br>教材では Client バックエンドが保持する | [説明](../chapter-2/oauth-flows.md#code-flow) |
| <span id="client-secret-basic">client_secret_basic</span> | 教材が採用案とする、HTTP Basic を使った Client 認証方式 | [説明](../chapter-2/oauth-flows.md#code-flow) |
| <span id="fosite">Fosite</span> | Go 向けの OAuth 2.0 / OIDC フレームワーク<br>ユーザー認証や保存処理などの責任はアプリケーション側にも残る | [説明](../practice/authorization-server.md) |
| <span id="discovery">Discovery</span> | OP のエンドポイントや対応機能などの公開設定を取得する仕組み<br>設定の issuer と信頼する issuer の整合性を確認する | [説明](../chapter-3/oidc-provider.md#op) |
| <span id="userinfo">UserInfo</span> | Access Token を提示し、利用者についての Claims を取得する保護されたリソース | [説明](../chapter-3/oidc-provider.md#op) |
| <span id="introspection">Introspection</span> | 保護されたリソース側が AS にトークンの状態を問い合わせる HTTP の契約 | [説明](../chapter-2/token-lifecycle.md#lifecycle) |
| <span id="revocation">Revocation</span> | Client が AS にトークンの失効を要求する HTTP の契約 | [説明](../chapter-2/token-lifecycle.md#lifecycle) |
| <span id="rotation">ローテーション</span> | 値を新しいものへ更新すること<br>Refresh Token の交換と署名鍵の更新では、管理する状態や有効期間が異なる | [説明](../chapter-2/token-lifecycle.md#lifecycle) |
| <span id="saml">SAML（Security Assertion Markup Language）</span> | Assertion、Protocol、Binding、Profile などで構成される仕様群<br>本書では Web Browser SSO を比較対象にする | [説明](../chapter-3/federation.md#comparison) |
| <span id="sso">Web Browser SSO（Single Sign-On）</span> | 本書では、ブラウザを介して IdP から SP へ認証結果を伝える SAML の利用形態 | [説明](../chapter-3/federation.md#comparison) |
| <span id="idp">IdP（Identity Provider）</span> | 利用者の認証結果を提供する側<br>SAML では IdP、OIDC では OP という役割名を使う | [説明](../chapter-3/federation.md#comparison) |
| <span id="sp">SP（Service Provider）</span> | SAML の認証結果を受け取り、利用する側 | [説明](../chapter-3/federation.md#comparison) |
| <span id="assertion">Assertion</span> | SAML で認証などについての主張を運ぶもの<br>署名だけでなく宛先や時間条件なども確認する | [説明](../chapter-3/federation.md#comparison) |
| <span id="saml-components">Protocol / Binding / Profile</span> | SAML の要求・応答、通信への載せ方、用途ごとの組合せをそれぞれ定めるもの | [説明](../chapter-3/federation.md#comparison) |
| <span id="jpki">JPKI（Japanese Public Key Infrastructure、公的個人認証サービス）</span> | 電子証明書を利用し、オンライン申請やログインなどで本人確認を行う仕組み | [説明](../chapter-3/federation.md#comparison) |

## Claims と暗号技術 {#claims-と暗号表現}

| 用語 | この教材での意味 | 本文 |
| --- | --- | --- |
| <span id="jose">JOSE（JSON Object Signing and Encryption）</span> | 本書で JWS・JWE・JWK などの JSON に関わる暗号技術とデータ形式をまとめて扱う際の呼び名 | [説明](../chapter-3/id-token.md#tokens) |
| <span id="jwe-enc">enc</span> | JWE の内容暗号化方式を示すヘッダーパラメータ<br>鍵管理方式を示す JWE の alg とは役割が異なる | [説明](../chapter-3/id-token-operations.md#tokens-jwe-の暗号化と検証) |
| <span id="iv-tag">IV（Initialization Vector）と認証タグ</span> | IV は暗号化で使う初期化ベクトル、認証タグは暗号文などの完全性を確認する値<br>具体的な条件は暗号方式に従う | [説明](../chapter-3/id-token-operations.md#tokens-jwe-の暗号化と検証) |
| <span id="claims">Claims</span> | 発行者・対象者・期限などについての主張<br>用途によって必須項目と検証条件が決まる | [説明](../chapter-3/id-token.md#tokens) |
| <span id="subject-types">public / pairwise な sub</span> | OIDC の利用者識別子の種類<br>public はクライアント間で同じ値、pairwise は Sector Identifier を単位に値を分けて異なる利用先の間での照合を抑える | [説明](../chapter-3/id-token.md#oidc-public-と-pairwise-の識別子) |
| <span id="email-verified">email_verified</span> | true は OP がメールアドレスの制御を確認したことを示す<br>利用者を継続して識別したり、アカウントを統合したりする根拠とは別 | [説明](../chapter-3/id-token.md#oidc-メール確認とアカウント統合) |
| <span id="base64url">base64url</span> | バイト列を URL で扱える文字列に表すエンコード<br>教材の PKCE と compact JWS では末尾のパディングを付けない | [説明](../chapter-3/id-token.md#tokens) |
| <span id="rs256">RS256</span> | SHA-256 と RSASSA-PKCS1-v1_5 による署名方式<br>教材の ID Token 例で使う | [説明](../chapter-3/id-token.md#tokens) |
| <span id="alg">alg（Algorithm）</span> | JOSE ヘッダーなどで方式を示す値<br>受信した値を無条件に採用せず、許可した方式と照合する | [説明](../chapter-3/id-token.md#tokens) |
| <span id="token-times">exp（Expiration Time）/ iat（Issued At）</span> | トークンの有効期限と発行時刻をそれぞれ表す Claims | [説明](../chapter-3/id-token.md#tokens) |
| <span id="auth-time">auth_time（Authentication Time）</span> | 実際にユーザー認証を行った時刻<br>トークンの発行時刻とは区別する | [説明](../chapter-3/oidc-provider.md#op) |
| <span id="max-age">max_age</span> | 認証時刻からの最大経過時間を指定する OIDC の要求パラメータ | [説明](../chapter-3/oidc-provider.md#op) |
| <span id="prompt">prompt</span> | 再認証や画面を出さない処理などを要求する OIDC のパラメータ | [説明](../chapter-3/oidc-provider.md#op) |
| <span id="offline-access">offline_access</span> | 利用者が不在でもアクセスするための OIDC の要求<br>Refresh Token の発行すべてと同一視しない | [説明](../chapter-3/oidc-provider.md#op) |

## パスキーと防御

<span id="e2ee"></span>
**E2EE（End-to-End Encryption、エンドツーエンド暗号化）**：通信の両端で暗号化・復号し、仲介するサーバーに内容を読ませない仕組み  
パスキーでは、資格情報を端末間で同期する際の保護に使われる例がある  
ログイン時の署名検証とは役割が異なる → [同期の説明](../chapter-ex1/passkeys-background.md#passkeys-資格情報の同期と紛失時の回復)・[E2EE の設計](../chapter-ex2/e2ee.md#e2ee)

| 用語 | この教材での意味 | 本文 |
| --- | --- | --- |
| <span id="webauthn">WebAuthn（Web Authentication）</span> | Web アプリケーションで公開鍵資格情報を登録・利用するための API と手順 | [説明](../chapter-ex1/passkeys-background.md#passkeys) |
| <span id="passkey">パスキー</span> | WebAuthn などの仕組みを使う、パスワードに代わる公開鍵資格情報 | [説明](../chapter-ex1/passkeys-background.md#passkeys) |
| <span id="ctap">CTAP（Client to Authenticator Protocol）</span> | クライアントと認証器の間の通信を扱う仕組み | [説明](../chapter-ex1/passkeys-background.md#passkeys) |
| <span id="fido">FIDO2</span> | FIDO は Fast IDentity Online の略<br>FIDO2 は WebAuthn と CTAP に関わる枠組み | [説明](../chapter-ex1/passkeys-background.md#passkeys) |
| <span id="authenticator">認証器</span> | 利用者が制御していることを認証で確かめる対象<br>WebAuthn では公開鍵資格情報を扱い、ユーザーの関与や検証を伴う認証操作を行う | [認証](../chapter-1/overview.md#definitions)・[WebAuthn](../chapter-ex1/passkeys-background.md#passkeys) |
| <span id="rp-id">RP ID（Relying Party Identifier）</span> | WebAuthn の資格情報を利用先と結び付ける識別子 | [説明](../chapter-ex1/passkeys-background.md#passkeys) |
| <span id="prf">PRF 拡張（`prf`）</span> | WebAuthn の拡張の一つ。資格情報に結び付いた擬似乱数関数の 32 バイトの出力を RP のページが得る<br>ログインの署名とは別の値で、E2EE の鍵の導出に使える | [説明](../chapter-ex2/e2ee.md#e2ee-prf-拡張) |
| <span id="key-slot">鍵スロット</span> | この教材での呼び方。パスキーごとの鍵暗号化鍵で包んだデータ鍵<br>パスキーを増やしてもデータを暗号化し直さずに済む | [説明](../chapter-ex2/e2ee.md#e2ee-鍵の階層) |
| <span id="challenge">challenge</span> | WebAuthn では、その登録・認証要求に対応する応答かを確かめるための値<br>PKCE の code_challenge とは文脈が異なる | [説明](../chapter-ex1/passkeys-implementation.md#webauthn) |
| <span id="origin">origin</span> | WebAuthn の応答が想定した利用元からのものかを確認する対象<br>RP ID とともに検証する | [説明](../chapter-ex1/passkeys-implementation.md#webauthn) |
| <span id="credential">credential</span> | 認証やアクセスで提示・利用する情報<br>WebAuthn では登録した公開鍵資格情報とユーザーの対応を管理する | [説明](../chapter-ex1/passkeys-implementation.md#webauthn) |
| <span id="otp">OTP（One-Time Password）</span> | 短時間・一回の利用などを想定するコード<br>手入力のコードは、偽サイトによる中継への対策と同一ではない | [説明](../chapter-ex1/passkeys-background.md#passkeys) |
| <span id="pin">PIN（Personal Identification Number）</span> | 認証器でのローカルなユーザー検証に利用される秘密の一例<br>サービスに送るパスワードと同一視しない | [説明](../chapter-ex1/passkeys-background.md#passkeys) |
| <span id="csrf">CSRF（Cross-Site Request Forgery）</span> | 利用者のブラウザを介した不正な要求に対する防御で扱う脅威<br>教材では要求とセッションの結合などを確認する | [説明](../chapter-2/oauth-flows.md#code-flow) |

## 標準化と適合試験

| 用語 | この教材での意味 | 本文 |
| --- | --- | --- |
| <span id="rfc">RFC（Request for Comments）</span> | 公開文書のシリーズ<br>すべてが Internet Standard というわけではなく、文書の位置付けと更新関係を確認する | [説明](../reference/reading-specifications.md) |
| <span id="bcp">BCP（Best Current Practice）</span> | RFC の位置付けの一つ<br>本書では OAuth の安全性の要件・推奨をまとめる RFC 9700 を扱う | [説明](../reference/reading-specifications.md#specifications) |
| <span id="internet-draft">Internet-Draft</span> | 作業中の文書<br>公開済み RFC と同じ状態として扱わない | [説明](../reference/reading-specifications.md) |
| <span id="standards-track">Standards Track</span> | RFC の標準化上の位置付けを示す区分<br>文書の状態を確認する際に読む | [説明](../reference/reading-specifications.md#specifications) |
| <span id="iana">IANA（Internet Assigned Numbers Authority）registry</span> | パラメータ名などの登録値と、根拠となる仕様への参照を調べる入口 | [説明](../reference/reading-specifications.md) |
| <span id="normative-keywords">MUST / SHOULD / OPTIONAL</span> | 仕様の要件を読む際の規範用語<br>対象・条件・要求される処理を含む文全体で読む | [説明](../reference/reading-specifications.md) |
| <span id="conformance-suite">OIDF（OpenID Foundation）Conformance Suite</span> | 仕様の要求を外部の試験で確かめるためのソフトウェア<br>部分的な成功と正式認定は区別する | [説明](../reference/conformance-testing.md) |

## 実装で扱う識別子と追加情報

| 用語 | この教材での意味 | 本文 |
| --- | --- | --- |
| <span id="client-id">client_id</span> | Client を区別する公開の識別子<br>それだけでは Client の真正性を証明しない | [説明](../chapter-2/oauth.md#oauth) |
| <span id="authentication-claims">amr（Authentication Methods References）/ acr（Authentication Context Class Reference）</span> | 認証の方式や認証コンテキストを表すための OIDC の Claims<br>独自の値を標準値として扱わない | [説明](../chapter-ex1/passkeys-implementation.md#webauthn) |
| <span id="azp">azp（Authorized Party）</span> | ID Token に現れる場合、採用する Core の版と拡張に応じて検証条件を確認する Claim | [説明](../chapter-3/id-token.md#tokens) |
| <span id="credential-id">credential ID</span> | 登録した WebAuthn 資格情報の識別子<br>保存済みのユーザーとの対応を確認する | [説明](../chapter-ex1/passkeys-implementation.md#webauthn) |
| <span id="user-handle">user handle</span> | WebAuthn でユーザーとの対応付けに利用する値<br>表示名やメールアドレスだけからログインするアカウントを決めない | [説明](../chapter-ex1/passkeys-implementation.md#webauthn) |
| <span id="conditional-ui">Conditional UI</span> | WebAuthn の資格情報を選ぶ UI の方式<br>本教材の明示的なログインボタンによる最小実装では必須にしない | [説明](../chapter-ex1/passkeys-implementation.md#webauthn) |
| <span id="attestation">attestation</span> | WebAuthn の登録時に認証器についての情報を証明・検証する仕組み<br>網羅的な対応は教材の範囲外 | [説明](../chapter-ex1/passkeys-implementation.md#webauthn) |

## 認証と暗号の基礎

| 用語 | この教材での意味 | 本文 |
| --- | --- | --- |
| <span id="openid-scope">openid</span> | OIDC の認証要求であることを示す scope 値<br>API の個々の操作に必要な権限を与えるものではない | [説明](../chapter-3/id-token.md#tokens) |
| <span id="authentication-factor">認証要素</span> | 知識（something you know）・所持（something you have）・生体（something you are）という、認証に用いる証拠の性質による区分 | [基本の説明](../chapter-1/overview.md#認証要素)・[組合せ](../chapter-ex1/passkeys-background.md#definitions-認証手段と認証要素) |
| <span id="authentication-method">認証手段</span> | パスワードやパスキーなど、認証に用いる具体的な方式 | [説明](../chapter-ex1/passkeys-background.md#definitions-認証手段と認証要素) |
| <span id="public-key">公開鍵</span> | 本教材の署名・公開鍵認証では、対応する秘密鍵で作られた署名を検証するための鍵 | [説明](../chapter-ex1/passkeys-background.md#passkeys) |
| <span id="private-key">秘密鍵</span> | 本教材の署名・公開鍵認証では、認証する側やトークン発行側が署名を作るために保持する鍵 | [説明](../chapter-3/id-token.md#tokens) |
| <span id="phishing-resistance">フィッシングと耐性</span> | フィッシングは偽サイトなどで認証情報を取得したり応答を中継したりする攻撃<br>認証の証拠を本来の利用先に結び付けて抵抗する性質をフィッシング耐性と呼ぶ | [説明](../chapter-ex1/passkeys-background.md#passkeys) |
| <span id="aal2">AAL2（Authenticator Assurance Level 2）</span> | NIST が定める認証の保証レベルの一つ<br>UV の真偽だけで全要件への適合を判断できない | [説明](../columns/user-verification.md) |
| <span id="password-grant">Password Grant</span> | Client に利用者のパスワードを渡してトークンを取得する方式<br>OP 内部でのパスワード認証と区別する | [説明](../chapter-2/token-lifecycle.md#provider) |
| <span id="mac">MAC（Message Authentication Code）</span> | メッセージ認証コード<br>JWS ではデジタル署名とは別の、完全性を保護する方式として扱われる | [説明](../chapter-3/id-token.md#tokens) |
| <span id="rsa">RSA（Rivest・Shamir・Adleman）</span> | 公開鍵暗号の方式の一つ<br>本教材では RS256 による署名と公開鍵での検証に利用する | [説明](../chapter-3/id-token.md#tokens) |
| <span id="sha256">SHA-256</span> | SHA は Secure Hash Algorithm の略で、SHA-256 は256ビットの出力を持つハッシュ関数<br>教材では PKCE S256 の challenge 計算と RS256 の署名方式で使う | [説明](../chapter-2/oauth-flows.md#code-flow) |
| <span id="webauthn-client">WebAuthn クライアント</span> | WebAuthn のサービスと認証器の間で処理を仲介する側<br>OAuth の Client とは別の役割 | [説明](../chapter-ex1/passkeys-background.md#passkeys) |
| <span id="signature">電子署名</span> | 本教材では、秘密鍵で作成し、対応する公開鍵で検証する証拠<br>トークンや認証応答の検証で用いる | [説明](../chapter-3/id-token.md#tokens) |

略称・英語名称は各仕様の表記に従います  
PKCE は [RFC 7636 §3](https://www.rfc-editor.org/rfc/rfc7636.html#section-3)、JOSE は [RFC 7520](https://www.rfc-editor.org/rfc/rfc7520.html)、OIDC の Claims は [OIDC Core §2](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)、JPKI は[デジタル庁の英語表記](https://www.digital.go.jp/en/policies/mynumber/private-business/jpki-introduction)を参照してください

## マシン間のアクセス

| 用語 | この教材での意味 | 本文 |
| --- | --- | --- |
| <span id="m2m">M2M（Machine-to-Machine）</span> | プログラム同士の通信<br>人間のログイン操作を介さないアクセスにも認証と認可が必要 | [説明](../columns/machine-authentication.md) |
| <span id="machine-account">マシンアカウント</span> | プログラムが使う主体を表すアカウント<br>資格情報や権限と区別して管理する | [説明](../columns/machine-authentication.md) |
| <span id="client-credentials">Client Credentials Grant</span> | Client 自身の資格情報に基づいてトークンを取得する OAuth の方式<br>confidential client に限定される | [説明](../columns/machine-authentication.md) |
| <span id="mtls">mTLS（mutual Transport Layer Security）</span> | サーバーに加えてクライアントも証明書と秘密鍵で認証する TLS の利用形態 | [説明](../columns/machine-authentication.md) |
| <span id="service-account">ServiceAccount</span> | Kubernetes でプログラムなどのための主体を表すリソース<br>具体的な API 権限は別途付与する | [説明](../columns/machine-authentication.md) |
| <span id="token-request">TokenRequest API</span> | Kubernetes の ServiceAccount の有効期限付きトークンを発行する API | [説明](../columns/machine-authentication.md) |
| <span id="istio">Istio</span> | サービス間通信の管理、ワークロードの認証、アクセス制御などを担うサービスメッシュ | [説明](../columns/machine-authentication.md) |
| <span id="service-mesh">サービスメッシュ</span> | サービス間の通信を管理する基盤<br>Istio はその実装の一つ | [説明](../columns/machine-authentication.md) |
| <span id="workload">ワークロード</span> | 基盤上で動くアプリケーションや処理<br>ここでは認証されるプログラム側の主体を考える単位 | [説明](../columns/machine-authentication.md) |
| <span id="peer-authentication">PeerAuthentication</span> | Istio で mTLS 接続を受け入れる条件を定める認証ポリシーのリソース | [説明](../columns/machine-authentication.md) |
| <span id="authorization-policy">AuthorizationPolicy</span> | Istio でリクエストを許可・拒否する条件などを定める認可ポリシーのリソース | [説明](../columns/machine-authentication.md) |

## チャットの題材

| 用語 | この教材での意味 | 本文 |
| --- | --- | --- |
| <span id="direct-message">DM（Direct Message）</span> | 参加する利用者を限定したメッセージのやり取り<br>参加していない利用者による閲覧を、リソースへのアクセスを拒否する例に使う | [説明](../chapter-2/oauth.md#oauth) |
| <span id="bot">Bot</span> | 自動で処理するプログラム<br>本書では traQ の専用ユーザーと資格情報を持つ Bot を例示し、OAuth Client Credentials と区別する | [説明](../columns/machine-authentication.md) |

## 認証連携の取り違え

| 用語 | この教材での意味 | 本文 |
| --- | --- | --- |
| <span id="token-substitution">トークンの差し替え（Token Substitution）</span> | 別のアプリや処理に渡されたトークンを持ち込み、受信側に誤った利用者や要求の証拠として受け入れさせること | [説明](../chapter-3/oidc.md#oidc) |


## ユーザー管理の連携

| 用語 | 意味 | 本文 |
| --- | --- | --- |
| <span id="scim">SCIM（System for Cross-domain Identity Management）</span> | サービス間でユーザーやグループの作成・更新・削除などを扱うプロトコル<br>ログインの認証結果を伝える OIDC とは役割が違う | [参照と同期](../columns/identity-architecture.md#参照と同期) |
