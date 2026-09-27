# PKCE とコード交換の保護

::: tip このページの目標

PKCE が Authorization Code Flow のどの条件を守る拡張かを説明し、`code_verifier` と `code_challenge` を照合する理由を説明できるようになる

:::

::: info このページの要点

- **位置付け**：PKCE は OAuth 2.0 本体の grant ではなく、コード交換を保護する拡張である
- **対応**：Client が保持する verifier と、認可要求で送る challenge を AS がコードへ結び付ける
- **方式**：教材では S256 を使い、交換時に同じ関係を確かめる
- **拒否**：不一致、欠落、使用済みコードは成功へ補正しない

:::

[OAuth のフロー](oauth-flows.md#code-flow)では、ブラウザが持ち帰った交換用の結果を、正当な Client だけが交換できるようにする必要を扱いました  
その条件を満たすための OAuth 拡張が PKCE（Proof Key for Code Exchange）です  
PKCE は OAuth 2.0 の基本仕様が定める grant そのものではなく、Authorization Code Flow の交換を保護する [RFC 7636](https://www.rfc-editor.org/rfc/rfc7636.html) の拡張です

## challenge と verifier

Client は認可要求ごとに、暗号学的に十分な乱数から [`code_verifier`](../reference/glossary.md#pkce-values) を作って保持します  
認可要求には、verifier から作った [`code_challenge`](../reference/glossary.md#pkce-values) と方式を送ります  
AS はそれらを発行するコードに結び付け、交換時に届く verifier から同じ challenge が得られるかを確認します

コードだけを手に入れた者は、対応する verifier を持たなければ交換できません  
時刻や連番を verifier にしたり、要求をまたいで再利用したりすると、この前提を満たせません [RFC 7636 §4.1–§4.6・§7.1](https://www.rfc-editor.org/rfc/rfc7636.html#section-4.1)  
Client 側で verifier を認可要求の情報として保持する方法は[コラム：OAuth Client の実装](../columns/client-implementation.md#client-state)で扱います

### S256

教材では S256 を使います  
S256 は verifier の ASCII 表現を SHA-256 でハッシュし、その結果のバイト列をパディングなしの base64url で表す方式です

```text
code_challenge = BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))

code_verifier  = dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
code_challenge = E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
```

この値は [RFC 7636 Appendix B](https://www.rfc-editor.org/rfc/rfc7636.html#appendix-B) の試験ベクトルです  
**実際の認可要求へ流用してはいけません**  
AS は認可要求で記録した方式に従って、交換時の verifier から challenge を計算して比較します

RFC 9700 は public Client に PKCE を要求し、confidential Client にも利用を推奨しています  
教材では confidential な Web Client にも S256 を必須とする採用案です  
これは発行後に盗まれた Bearer Access Token の利用を防ぐ仕組みではありません [RFC 9700 §2.1.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1.1)

## HTTP の通信例

認可要求で challenge を送り、verifier 自体は Client のバックエンドに残します  
以下は [OAuth のフローの通信例](oauth-flows.md#code-flow-http-の通信例)に、PKCE の値を加えた形です  
認可要求には `code_challenge` と `code_challenge_method`、トークン要求には `code_verifier` が加わります

```http
GET /authorize?response_type=code&client_id=chat-viewer&redirect_uri=https%3A%2F%2Fviewer.example%2Fcallback&scope=read&state=example-state-01&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256 HTTP/1.1
Host: auth.example
```

```http
POST /token HTTP/1.1
Host: auth.example
Authorization: Basic Y2hhdC12aWV3ZXI6ZXhhbXBsZS1zZWNyZXQ=
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=example-code-01&redirect_uri=https%3A%2F%2Fviewer.example%2Fcallback&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

challenge を見た者がその文字列を verifier として送っても、AS は受け取った値を改めてハッシュして保存済み challenge と比較するため交換できません  
この例の `state` は、別の目的である認可応答と開始したブラウザ処理の照合に使います

また、[traQ の PKCE 検証](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/model/oauth2.go#L150-L171)には `plain`・`S256` と PKCE 未指定の処理があります  
本教材が S256 を使う方針と、実装が受け付ける全範囲は区別します

## 拒否条件 {#拒否条件}

AS は Client 認証だけでなく、コードの発行先、`redirect_uri`、期限、未使用状態、PKCE の条件を確認します  
PKCE を使う認可要求について、verifier が異なるか欠けていれば、トークンエンドポイントは交換を拒否します  
RFC 7636 では verifier の不一致を `invalid_grant` として扱います [RFC 7636 §4.6](https://www.rfc-editor.org/rfc/rfc7636.html#section-4.6)

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
Cache-Control: no-store
Pragma: no-cache

{"error":"invalid_grant"}
```

応答の形は[OAuth のフロー](oauth-flows.md#code-flow-不正な要求とエラー応答)の使用済みコードと同じでも、成立しなかった条件は保存した challenge との対応です

また、AS は認可要求で challenge があった場合に verifier を必ず検証し、verifier を伴う交換を challenge なしの認可要求として受け入れません  
この対応により、PKCE を使う処理だけ検証を省く downgrade を防ぎます [RFC 9700 §2.1.1・§4.8.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1.1)

PKCE の不一致を state の不一致と同じ場所で受け入れることはできません  
state は Client が callback を照合し、PKCE は AS がコード交換を照合するため、それぞれの拒否条件は別の処理にあります
