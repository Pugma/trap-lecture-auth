# Implicit / Hybrid Flow

::: tip このページの目標

Code Flow との違いを比較し、既存の Implicit / Hybrid の接続設定と検証条件を仕様へ戻って読めるようになる

:::

::: info このページの要点

- **中心経路**：本教材の実装は Authorization Code + PKCE を使う
- **経路の違い**：認可応答で返す値とコード交換で返す値が異なる
- **検証条件**：フローと返される値に応じて nonce・at_hash・c_hash の条件を確認する

:::

OIDC の中心経路である Code Flow を確認した後、既存の接続設定を読むために Implicit Flow と Hybrid Flow を見ます
本教材が提供側で採用する経路は Code Flow + PKCE です

## 三つのフローの比較

OIDC のフローは、認証結果と API 用のトークンを、どの経路で RP に届けるかが異なります
共通する入口は `openid` を含む要求であり、どの応答を求めるかを `response_type` で指定します [OIDC Core §3](https://openid.net/specs/openid-connect-core-1_0.html#Authentication)

| フロー | ブラウザ経由で受け取るもの | バックエンドで交換して受け取るもの |
| --- | --- | --- |
| Authorization Code | 交換に使う短期間の結果 | 認証結果・API 用の資格情報 |
| Implicit | 認証結果 | 交換なし |
| Implicit | 認証結果・API 用の資格情報 | 交換なし |
| Hybrid | 交換に使う結果・認証結果 | 認証結果・API 用の資格情報 |
| Hybrid | 交換に使う結果・API 用の資格情報 | 認証結果・API 用の資格情報 |
| Hybrid | 交換に使う結果・認証結果・API 用の資格情報 | 認証結果・API 用の資格情報 |

表では、値の名前と技術上の必須条件を省略しています
各方式の `response_type`、認可応答で返る値、nonce・`at_hash`・`c_hash` の条件は、[ID Token の追加検証](id-token-operations.md#tokens-claims-の検証条件)で扱います [OIDC Core §3.2.2.1](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitAuthRequest)・[§3.3.2.1](https://openid.net/specs/openid-connect-core-1_0.html#HybridAuthRequest)

**フロントチャネル**はブラウザを介して要求・応答を運ぶ経路です
**バックチャネル**は RP と OP が直接通信する経路で、本教材では RP バックエンドから token endpoint を呼びます
どちらも通信の保護が必要で、バックチャネルなら受け取った値を無条件に信頼できるという意味ではありません

## ブラウザ経由の応答

各図は、OAuth の図と同じく、左からブラウザ・RP（Client）・OP（AS）・RS を配置します  
上から下へ追うと、要求・応答と、各役割が行う検証を対応付けられます  
RP の処理場所はフローごとに列の説明へ記載しています  
横幅が足りない場合は図を横にスクロールできます

以下の図は Code の既定の query 応答と、Implicit / Hybrid の既定の fragment 応答を描きます  
query は URL の `?` 以降に置くパラメータで、callback サーバーへの要求にも含まれます  
fragment は URL の `#` 以降であり、callback サーバーへの HTTP 要求には送られません  
ブラウザ内の RP の処理が読み取り、必要ならバックエンドへ別の要求で渡します  
別の response mode を選ぶ構成もありますが、図では扱いません [OIDC Core §3.2.2.5](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitAuthResponse)・[§3.2.2.7](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitCallback)

## Implicit Flow

Implicit Flow は、コード交換を挟まず、認可応答で ID Token を受け取る構成です
`id_token` なら認証結果だけを受け取り、`id_token token` なら API 用の Access Token も受け取ります
図は後者を示し、RP の処理をブラウザ内に置いています [OIDC Core §3.2.1](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitFlowSteps)

<div class="sequence-diagram" tabindex="0" role="region" aria-label="oidc-implicit のシーケンス図">

![Implicit Flow：ブラウザ内の RP が OP へ認証要求を送り、認証結果と API 用の資格情報をブラウザ経由で受け取る。RP は認証結果を検証し、資格情報で API を呼ぶ。コード交換は行わない](/diagrams/oidc-implicit.svg)

</div>

ブラウザ経由で認証結果を受け取るため、RP は開始したログインとの対応と認証結果の検証を行います
値の名前と必須条件は、ID Token の検証で扱います [OIDC Core §3.2.2.9](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitTokenValidation)・[§3.2.2.10](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitIDToken)・[§3.2.2.11](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitIDTokenValidation)

## Hybrid Flow

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

## 検証とフローの選択

どのフローでも、RP は ID Token の発行元・宛先・期限・要求との対応などを条件に従って検証します
本教材の RP は信頼する OP の鍵と許可した署名方式を使い、nonce の不一致や宛先の違いを拒否します
そのため OP は、公開鍵に対応する秘密鍵と宣言した方式で署名し、要求の nonce と RP の client ID を ID Token に正しく載せます
フローごとに必須となる `at_hash` や `c_hash` も、OP が同時に返す値から計算して含めます
`at_hash` / `c_hash` の計算による検証は Core が SHOULD として示す手順で、図では実施する構成を示しています
Claim を含めることが必須となる条件と、RP の検証手順に対する MUST・SHOULD の指定は区別してください [OIDC Core §3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)・[§3.2.2.9](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitTokenValidation)・[§3.3.2.10](https://openid.net/specs/openid-connect-core-1_0.html#HybridCodeValidation)

現在の選択には OAuth Security BCP も適用します
RFC 9700 は、トークン注入と漏えいの対策がない限り、Access Token を認可応答で返す方式を使うべきではないとしています
代わりに `code` や `code id_token` のように token endpoint で Access Token を得る方式を推奨します
これは `id_token` 単独や Hybrid 全体を一律禁止する記述ではありません [RFC 9700 §2.1.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1.2)

三つを知ることで既存の接続設定を読めますが、教材の OP が提供し RP が使うフローの採用案は、引き続き Code Flow + PKCE です
図は仕様の説明であり、三つのフローを実装・接続試験した記録ではありません
