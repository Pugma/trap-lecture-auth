# OAuth のフロー

::: tip このページの目標

OAuth の各方式の用途を区別し、Authorization Code Flow の全体像と、後続の技術が守る条件を説明できるようになる

:::

::: info このページの要点

- **方式の選択**：利用者の権限を委譲する場合と、アプリ自身の権限でアクセスする場合では手順が異なる
- **Code Flow**：ブラウザで認可コードを受け取り、検証条件を満たした場合にトークンへ交換する
- **実装方針**：教材ではバックエンドを持つ Client を使い、コード交換を保護する
- **検証**：要求と応答の対応、戻り先、コードの発行先・期限・一回限りの使用を確かめる

:::

前のページでは、誰が何を許可するかと、Client・AS・RS の役割を確認しました  
ここでは、その許可を Access Token の取得につなげる通信手順を扱います  
[登場人物と役割の対応表](oauth.md#oauth-oauth-の登場主体)の Client はチャットビューアー、AS と RS は traQ 側の役割です

## Authorization Code Flow {#code-flow}


利用者の許可を API の利用へつなげるには、認可要求、コード交換、トークンの提示という通信が必要です  
各段階の HTTP 例と、値を照合する側の処理を対応付けます

### Authorization Code Flow の全体像 {#code-flow-authorization-code-flow-の全体像}

[登場人物と役割の対応表](oauth.md#oauth-oauth-の登場主体)を使い、細かな値の名前を省いて、メッセージを取得するまでの通信の目的を追います  
以下は理解のための概略で、検証を省いた実装例ではありません

1. ビューアーが、利用者のブラウザを traQ 側の認可サーバーへ送る
2. 認可サーバーが利用者の認証とビューアーへの許可を確認する
3. ブラウザが、短時間だけ交換に使える結果をビューアーへ持ち帰る
4. ビューアーのバックエンドがその結果を認可サーバーへ送り、API に提示する資格情報を受け取る
5. ビューアーが資格情報をメッセージ API に提示する
6. API が資格情報と対象への権限を確認し、許可されたメッセージを返す

ブラウザが持ち帰る結果と、API に提示する資格情報は用途が違います  
この流れでは、戻ってきた結果を開始したブラウザ処理にだけ対応付け、交換を正当な Client だけに限定し、API 側で操作対象への権限も確認する必要があります  
後の節で、それぞれを満たす技術と値の名前を扱います


[Authorization Code Flow](../reference/glossary.md#code-flow) では、ブラウザ経由の応答に認可コードを返し、その後 Client のバックエンドがコードをトークンへ交換します  
コードを受け取った時点で、API の呼び出し権限を得たとは扱いません  
トークンエンドポイントで交換条件を検証する段階が残っています [RFC 6749 §4.1](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1)

以下は教材の構成を表す通信順です  
この段階では、値の名前ではなく、どの処理が何を確認するかを追います

1. Client が開始したブラウザ処理を記録し、あとで戻る結果と照合できるようにする
2. ブラウザを AS へ転送し、Client、戻り先、希望する操作を伝える
3. AS が要求を検証し、ユーザーの認証と許可を確認する
4. AS が短時間だけ交換に使える結果を、検証済みの callback へ返す
5. Client が開始時の処理との対応を確認し、バックエンドから結果と必要な条件を送って交換する  
   この構成では Client 自身も認証する
6. AS が交換条件を検証してコードを一回限りで消費し、トークンを返す

実際の値の名前、保存形式、ライブラリの関数名は、この後の節で扱います

#### ブラウザ経由とサーバー間の通信 {#code-flow-ブラウザー経由とサーバー間の通信}

次の図は、この教材のサーバー側 Client の通信を表します  
後の OIDC では同じ Client が RP になります  
この段階は OAuth の認可要求であり、まだ ID Token は発行しません

<div class="sequence-diagram" tabindex="0" role="region" aria-label="OAuth Authorization Code Flow のシーケンス図">

![OAuth Code Flow：A さんのブラウザ、Client のチャットビューアー、AS、RS の順に配置。ブラウザで認可コードを受け取り、Client と AS が直接コードを交換し、Access Token でメッセージ API を呼ぶ](/diagrams/oauth-code.svg)

</div>

図は上から下へ進みます  
縦線は各登場人物、横の矢印は通信や処理の受渡し、枠はその場所で行う生成・検証などの処理です  
横幅が足りない場合は図を横にスクロールできます

- **矢印3〜7**：ブラウザを介して許可を得て、認可コードを持ち帰る
- **矢印8〜9**：Client のバックエンドが AS と直接通信し、コードを Access Token に交換する
- **矢印10〜11**：Client が RS にトークンを提示し、許可されたメッセージを取得する

ログイン・同意の画面は必要になる場合を描いています  
既存の認証状態や許可を利用できる場合も、AS による確認は必要です

ブラウザは callback へ交換用の結果を運びますが、この構成の token endpoint への要求は Client バックエンドが送ります  
Client の秘密や、交換を保護する値、受け取った token をブラウザの URL や画面へ載せる必要はありません  
AS のログイン・同意の画面はこの間に挟まるアプリケーションの処理であり、その内部フォームを OAuth の標準メッセージと呼ぶわけではありません

#### 認可コードの役割 {#code-flow-認可コードの役割}

ブラウザ経由の通信は、利用者を AS の認証・許可画面へ導き、Client へ結果を戻すために使います  
一方、トークンの取得はバックエンドから AS へ直接要求します  
この二段階により、ブラウザが持ち帰った値を、そのまま API への資格情報として扱わずに済みます

コードは、後半の交換条件と組み合わせて初めて利用できます  
この教材では Client の認証と、後で扱う交換保護の検証をどちらも通過する必要があり、callback を開けたことだけではトークンは発行されません  
ただし「コードはトークンではないから公開してよい」という結論にもなりません  
コードの漏えいは交換を試みる機会を与えるため、期限と一回限りの利用を制限し、不要な場所へ残さない必要があります [RFC 6749 §4.1・§10.5](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1)

また、通信が二段階あること自体が安全性を保証するわけではありません  
後半でコードの発行先や期限を調べず、送られた値を何でも交換するなら、分離した意味が失われます  
Code Flow を理解する際は、矢印の数だけでなく、前半で記録した条件が後半のどの検証に使われるかを対応付けます

### HTTP の通信例 {#code-flow-http-の通信例}

次は traQ のようなチャットサービスを題材にした、教材用の架空の通信例です  
エンドポイント、scope、JSON は説明用に単純化しており、そのまま本番 traQ に送る要求ではありません  
ドメイン、client secret、state、コード、token は説明用で、動作ログではありません  
Cookie と Content-Length など、一部の HTTP ヘッダーは省略しています  
各 URL・フォーム本文は一行で送る形にし、パラメータの値を URL エンコードしています  
ここでは RFC 6749 が定める基本形を示します  
現在の新規実装では、コード交換を保護する拡張である PKCE の値を認可要求とトークン要求に加えます  
その差分は[PKCE とコード交換の保護](pkce.md)で扱います

事前登録は `client_id=chat-viewer`、callback は `https://viewer.example/callback` とします  
Client は `state=example-state-01` を生成して保持した後、次の応答でブラウザを AS へ向けます  
例の短い state は値の対応を読むための名前で、実際には十分に推測困難な値が必要です

```http
HTTP/1.1 302 Found
Location: https://auth.example/authorize?response_type=code&client_id=chat-viewer&redirect_uri=https%3A%2F%2Fviewer.example%2Fcallback&scope=read&state=example-state-01
```

ブラウザは Location の URL へアクセスし、AS は次の要求を受け取ります  
`redirect_uri` はデコードすると `https://viewer.example/callback` になり、要求 scope は `read` です

```http
GET /authorize?response_type=code&client_id=chat-viewer&redirect_uri=https%3A%2F%2Fviewer.example%2Fcallback&scope=read&state=example-state-01 HTTP/1.1
Host: auth.example
```

AS はこの要求で、`client_id` が登録済みであること、`redirect_uri` が登録した callback と一致すること、scope を許可できることを確かめます  
そのうえで利用者の認証と許可が成立したとします  
AS は発行したコードに、client、callback、ユーザー、許可 scope、有効期限を結び付けます  
成功時はブラウザを callback へ戻し、受け取った `state` を変更せずに含めます [RFC 6749 §4.1.1–4.1.2](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1.1)

```http
HTTP/1.1 302 Found
Location: https://viewer.example/callback?code=example-code-01&state=example-state-01
```

ブラウザは Client の callback へ次を送ります

```http
GET /callback?code=example-code-01&state=example-state-01 HTTP/1.1
Host: viewer.example
```

Client は保存した要求の情報と state を照合した後、バックエンドから AS のトークンエンドポイントへ次を送ります  
Client 側での照合の方法は[コラム：OAuth Client の実装](../columns/client-implementation.md#client-state)で扱います  
Basic の値は説明用の `chat-viewer:example-secret` を base64 表現したものです  
これは暗号化ではないため HTTPS が前提です  
実際の [`client_secret_basic`](../reference/glossary.md#client-secret-basic) は client ID と secret を規定どおりフォームエンコードしてから Basic に載せます  
この例の二つの値には、その処理で変化する文字がありません [RFC 6749 §2.3.1・§4.1.3](https://www.rfc-editor.org/rfc/rfc6749.html#section-2.3.1)

```http
POST /token HTTP/1.1
Host: auth.example
Authorization: Basic Y2hhdC12aWV3ZXI6ZXhhbXBsZS1zZWNyZXQ=
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=example-code-01&redirect_uri=https%3A%2F%2Fviewer.example%2Fcallback
```

AS はこの要求で、Client の認証だけでなく、コードと各値の結び付き、期限、未使用状態などを確かめます  
すべて満たしてコードの消費が成立した場合に、バックエンドへ token を返します  
以下の有効期間 600 秒は例の設定であり、仕様が一律に定めた寿命ではありません  
Refresh Token の発行・更新は[トークンの寿命](token-lifecycle.md#lifecycle)で扱い、この最小例には含めません [RFC 6749 §5.1](https://www.rfc-editor.org/rfc/rfc6749.html#section-5.1)

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store
Pragma: no-cache

{"access_token":"example-access-token-01","token_type":"Bearer","expires_in":600,"scope":"read"}
```

Client はこの応答で、API に提示する Access Token を受け取ります  
コードの受領とトークンの取得の間には、AS による交換条件の検証があります  
同じコードの再送や、認可要求と異なる `redirect_uri` は、この段階で拒否します

#### 不正な要求とエラー応答 {#code-flow-不正な要求とエラー応答}

前節の一往復を基準にすると、異常系は新しいフローを丸ごと覚える必要はありません  
例えば一度交換したコードをもう一度送った要求は、形式上は同じトークン要求ですが、一回限りの利用という条件が成立しません  
無効・期限切れ・使用済みのコードや、発行先と異なる Client によるコードに対して、トークンエンドポイントは `invalid_grant` を返します [RFC 6749 §5.2](https://www.rfc-editor.org/rfc/rfc6749.html#section-5.2)

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
Cache-Control: no-store
Pragma: no-cache

{"error":"invalid_grant"}
```

これは教材のエラー応答の例であり、実行ログではありません  
AS はこの応答でトークンを発行しないため、Client が後続のメッセージ API の要求へ進む根拠はありません  
エラー後の Client 側の扱いは[コラム：OAuth Client の実装](../columns/client-implementation.md#client-errors-token)で扱います

他の値を変えた場合も、要求を拒否する側と処理の箇所は同じとは限りません

| 正常例からの変更 | 検証する側 | 成立しない条件 |
| --- | --- | --- |
| callback の `state` が開始時と異なる | Client | ブラウザで開始した処理との対応 |
| 認可要求の `redirect_uri` が登録内容と異なる | AS の認可エンドポイント | 結果を返してよい宛先 |
| コード交換の `redirect_uri` だけが異なる | AS のトークンエンドポイント | コードを発行した認可要求との対応 |
| 一度交換したコードを再送する | AS のトークンエンドポイント | 一回限りの利用 |

この表は、ある検証を通ったことが他の検証を代替しないことも示します  
Client で state が一致していても、AS がコードを受け付ける保証にはなりません  
AS で Client 認証が成功しても、そのブラウザが Client で開始した処理との対応までは AS が確認したことになりません

### state による認可応答の照合 {#code-flow-state}

全体像で扱った「戻ってきた結果を開始したブラウザ処理にだけ対応付ける」ために、OAuth では [`state`](../reference/glossary.md#state) を使えます  
state は Client が認可要求ごとに作る値で、認可応答で戻った値を照合するのも Client です  
本教材では `state` を使って要求とブラウザセッションの対応を確認します [RFC 9700 §4.7](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.7)

この照合のため、AS は受け取った state を変更せずに認可応答へ返します [RFC 6749 §4.1.2](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1.2)  
検証済みの戻り先へエラーを返す場合も、認可要求に state があれば同じ値を含めます [RFC 6749 §4.1.2.1](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1.2.1)  
state の照合は Client の処理であり、AS のトークンエンドポイントが行うコード交換の検証とは別です  
コード交換を保護する PKCE は、次のページの[PKCE とコード交換の保護](pkce.md)で扱います

Client 側での state の保存方法、並行する認可要求の扱い、照合に失敗したときの対応は[コラム：OAuth Client の実装](../columns/client-implementation.md#client-state)で扱います

### リダイレクト先の検証 {#code-flow-リダイレクト先の検証}

AS は `redirect_uri` を登録済みの値と比較します  
本教材のサーバー側 Web Client では完全一致で検証し、前方一致や任意のサブドメイン許可に置き換えません  
RFC 9700 の native app 向け localhost ポートの例外を、この構成へ広げることもしません [RFC 9700 §2.1・§4.1.3](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1)

不正な callback の場合は、エラーを返すためであってもそこへ転送しません  
未検証の URL へエラーを転送できる設計は、AS を任意の宛先への転送装置にしてしまいます  
一方、Client と戻り先が検証済みで、利用者が許可を拒否した場合は、定められたエラー応答をその戻り先へ返せます [RFC 6749 §4.1.2.1](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1.2.1)

コード交換時には、次の条件を確認します [RFC 6749 §4.1.3](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1.3)

- コードが有効期限内であること
- コードが未使用であること
- コードが要求元の Client に発行されたものであること
- `redirect_uri` が認可要求時に送った値と一致すること
- PKCE を使う場合は、その照合に成功すること

Client の認証成功は、他の Client に発行されたコードを交換する権限にはなりません  
使用済みのコードは拒否し、並行する交換でも一つだけ成功するようにします

#### リダイレクト URI の完全一致 {#code-flow-リダイレクト-uri-の完全一致}

例えば登録済みの値が `https://viewer.example/callback` のとき、先頭の文字列が一致することだけを条件にすると、後ろへ別の文字列を加えた URL まで許可する実装になり得ます  
また、同じホストであっても、別パスに任意の URL へ転送する機能があれば、そこでコードが別の場所へ運ばれる可能性があります  
戻り先の登録は、単に運営者のドメインを確認する作業ではなく、結果を渡す具体的な受信先を限定するためのものです

URL を受け付ける側の「気を利かせた補正」にも注意が必要です  
末尾のパスやクエリを無視して同じとみなす、登録時には確認したが要求時にはホストしか比較しない、といった処理は、仕様の比較条件を独自に広げます  
本教材の Web Client では登録した具体的な URI と比較し、別の受信先が必要ならその受信先を登録する設計にします [RFC 9700 §4.1.3](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.1.3)

AS が `redirect_uri` を正しく検証しても、Client の callback 以降に無制限の転送が残れば別の漏えい経路になります [RFC 9700 §4.11.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.11.1)  
callback 後の Client 側の画面の移動は[コラム：OAuth Client の実装](../columns/client-implementation.md#client-post-callback-redirect)で扱います

### 拒否条件の検証 {#code-flow-拒否条件の検証}

Client の認証が成立しても、コードの発行先や戻り先が違えば交換を拒否します  
PKCE 固有の不一致と欠落は、[PKCE とコード交換の保護](pkce.md#拒否条件)で扱います  
正常な交換に加えて、別 Client、異なる callback、コードの再利用、同時交換を試験対象とします  
一回限りの条件については、逐次的な再送の拒否だけでなく、並行する二つの要求が両方成功しないことを確認します

仕様の文書構成や要件の読み方は、[RFC・仕様書の読解](../reference/reading-specifications.md#specifications)で確認できます

## フローの種類 {#oauth-grant-types}

OAuth 2.0 の基本仕様には、四つの authorization grant が定義されています  
[authorization grant](../reference/glossary.md#grant) は、Client が Access Token を取得するために使う、認可を表す資格情報です  
それを取得・提示する通信手順を、ここではフローとして比較します [RFC 6749 §1.3](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.3)

| 方式 | 主な流れと用途 | この教材での位置付け |
| --- | --- | --- |
| Authorization Code | 利用者が AS で許可し、Client が受け取ったコードをトークンへ交換する | 本ページの中心経路<br>コード交換を保護する拡張の PKCE は次のページで扱う |
| Client Credentials | 利用者に代わるのではなく、Client が自身の資格情報でトークンを取得する | 自身が管理するリソースや事前に認められた範囲へのアクセスを扱う<br>[マシンアカウントのコラム](../columns/machine-authentication.md)で補足する |
| [Implicit](../reference/glossary.md#oauth-implicit) | コード交換を行わず、ブラウザ経由の認可応答で Access Token を受け取る | 漏えい・差し替えへの懸念から、教材では採用しない |
| [Resource Owner Password Credentials（Password Grant）](../reference/glossary.md#password-grant) | Client が利用者のパスワードを受け取り、AS へ送ってトークンを取得する | 現在の安全性の基準では使用してはならない |

基本仕様に掲載されていることと、現在の新規実装に適していることは別です  
RFC 9700 は、漏えいとトークンの差し替えへの対策がある場合を除き、Implicit など認可応答で Access Token を返す方式を使わないよう推奨しています  
Password Grant は使用禁止です  
AS 自身のログイン画面にパスワードを入力することは、外部の Client にパスワードを渡す Password Grant とは異なります [RFC 9700 §2.1.2・§2.4](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1.2)

また、OAuth 2.0 は grant の拡張を認めています  
例えば [Device Authorization Grant](../reference/glossary.md#device-authorization) は、入力操作やブラウザの利用が制限された機器のための方式です  
テレビなどに表示したコードを使って別端末のブラウザで利用者が認証・許可し、元の機器がトークンを取得します  
この教材では用途の紹介にとどめます [RFC 6749 §4.5](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.5)、[RFC 8628 §1・§3](https://www.rfc-editor.org/rfc/rfc8628.html#section-1)

取得済みの Refresh Token による更新も、最初に利用者の許可を得る手順とは分けて、[トークンの寿命](token-lifecycle.md)で後から扱います  


次は [PKCE とコード交換の保護](pkce.md) で、コード交換を始めた Client の要求に結び付けます  
その後、[Access Token と Resource Server](access-token.md) で API の認可を確認します
