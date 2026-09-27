# コラム：マシンアカウントと mTLS

::: tip このページの目標

人間の操作を伴わないアクセスについて、プログラムの主体・資格情報・権限を区別し、Client Credentials と mTLS の役割を説明できるようになる

:::

::: info このページの要点

- **マシンアカウント**：プログラムを主体として識別し、その資格情報と許可する操作を分けて管理する
- **Client Credentials Grant**：利用者のその場の操作を介さず、Client 自身の資格情報で許可範囲に応じたトークンを得る
- **mTLS**：証明書で通信相手を認証する処理と、トークンを証明書に結び付ける処理、業務上の認可を区別する
- **Kubernetes と Istio**：ServiceAccount を主体の管理に使い、Kubernetes API への認可とサービス間通信の認証・認可を別々に設定する

:::

定期実行の集計処理や、サービス間の API 呼出しにも認証と認可が必要です  
こうしたプログラム同士の通信を [M2M（Machine-to-Machine）](../reference/glossary.md#m2m) と呼びます  
人がログイン画面を操作しない場合も、プログラムを主体として識別し、資格情報を検証して、その主体に許された操作を判断します

## マシンアカウントの基本構成

ここでは traQ のようなチャットを題材に、集計処理を教材用に設計します  
ここでの集計用権限や mTLS の構成は教材の設計例です  
例えば、毎晩メッセージの件数を集計する処理に、専用の `message-counter` という主体を用意します  
このように、プログラムが使う主体を表すアカウントを、ここでは[マシンアカウント](../reference/glossary.md#machine-account)と呼びます  
サービスアカウントと呼ぶ製品もありますが、具体的な管理方法は製品ごとに異なります  
物理マシン一台につき一アカウント、という意味ではありません

教材の設計例では、開発者個人のアカウントを集計処理へ渡す代わりに、次の情報を分けて管理します

- **主体**：どの処理としてアクセスするか  
  例では `message-counter`
- **資格情報**：その主体として認証するための秘密や証明書、トークン
- **権限**：集計用 API は呼べるが、メッセージ本文の取得や削除はできない、という許可

アカウントの名前と、現在使っている資格情報は別です  
資格情報を更新しても同じ主体として扱える設計や、処理単位で停止・権限変更できる設計を考えます  
複数の処理で一つの強い資格情報を共有すると、どの処理の権限を取り消すべきかも分けにくくなります

集計処理と通知処理を別の主体にした場合を考えます  
集計処理は統計情報を読み、通知処理は決められた送信先へ投稿する、という教材上の権限を与えます  
通知処理の資格情報が漏れたときに、その主体だけを停止できれば、集計処理まで一緒に止める必要はありません  
反対に一つの管理者トークンを共有していたら、処理名をログに書き分けても、トークンそのものから利用元を区別できません

処理を複数台で動かす場合に、台ごとに主体を分けるか、同じ主体に異なる資格情報を持たせるかは設計上の選択です  
どの単位で権限を変えたいか、どの単位で停止したいかを先に決めると、アカウントの分け方を判断できます  
アカウント数を増やすこと自体よりも、事故時に止めたい範囲と識別できる範囲が対応していることを重視します

## Client Credentials Grant による権限の取得

OAuth の [Client Credentials Grant](../reference/glossary.md#client-credentials) は、Client が自身の資格情報でトークンを取得する方式です  
Client 自身が管理するリソース、または事前に取り決めた権限の範囲でアクセスする場合に使います  
利用者がその場で同意画面を操作する手順はなく、仕様上は confidential client に限定されています [RFC 6749 §4.4](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.4)

集計処理なら、次の流れを考えられます

1. Client がトークンエンドポイントへ `grant_type=client_credentials` と必要な scope を送り、自身を認証する
2. AS が Client と許可範囲を確認し、Access Token を発行する
3. 集計 API がトークンと要求の権限を確認し、許可された集計結果を返す

Client の認証方法と、どの権限でトークンを得るかという grant の種類は別の選択です  
本編の Code Flow でも Client 認証を行いますが、それだけで Client Credentials Grant になるわけではありません  
また、この方式で得たトークンを「誰かがログインした証拠」とは扱いません [RFC 6749 §2.3・§4.4](https://www.rfc-editor.org/rfc/rfc6749.html#section-2.3)

Client が要求する scope は希望する範囲であって、自由に権限を作る命令ではありません  
集計専用 Client が投稿用の権限を要求しても、AS は事前に認めた範囲に基づいて判断します  
API 側も「人間ではなく内部の処理だから」という理由で個別の認可を省略しません  
トークンを発行できたことと、今届いた操作を許せることは、人間が関わる場合と同様に別の判断です

長時間動く処理では、Access Token の期限と、Client 自身の資格情報の寿命を分けます  
Access Token が切れた後に再発行を求める場合、元の資格情報が停止済みなら、以前動いていたという理由では更新を許せません  
また、この grant の応答では Refresh Token を発行しないことが推奨されています [RFC 6749 §4.4.3](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.4.3)

教材の設計例で調べるなら、まず正しい Client で許可されたトークンを得る経路を確認し、次に Client の資格情報だけを無効にしたケースと、要求 scope だけを変えたケースを分けます  
これにより、認証で止まったのか、権限の条件で止まったのかを読み取れます

### traQ の Bot と Client Credentials

traQ の公開実装では、Bot 作成時に専用ユーザーと `bot` scope のトークンを用意します  
一方、Client Credentials Grant のトークンはユーザーなしで発行され、限定的な `client` ロールで権限を判定します  
このロールにはメッセージ操作の権限がありません  
「人が操作しないアクセス」をすべて同じ方式だと捉えず、どの主体と権限に対応するかを確認します  
[Bot 作成](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/repository/gorm/bot.go#L25-L60)、[Client Credentials](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/router/oauth2/token_endpoint.go#L268-L325)、[client ロール](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/service/rbac/role/client.go#L7-L18)

## mTLS による認証とトークンの結び付き

通常の HTTPS でサーバーを証明書により認証する処理に加え、クライアントも証明書と対応する秘密鍵を使って自身を証明するのが [mTLS（mutual Transport Layer Security）](../reference/glossary.md#mtls) です  
証明書の文字列を送るだけでなく、対応する秘密鍵を保持していることを通信の確立時に証明します [RFC 8705 §1.2](https://www.rfc-editor.org/rfc/rfc8705.html#section-1.2)

OAuth では、mTLS に関して次の二つを区別します

| 利用箇所 | 確認すること |
| --- | --- |
| AS での Client 認証 | トークンを要求する Client が、登録された条件に合う証明書と秘密鍵を使えるか |
| API での証明書に結び付いたトークンの検証 | トークンを提示した相手の証明書が、そのトークンに結び付いたものか |

後者は、トークンだけが漏れても、対応する秘密鍵を持たない相手による利用を防ぐための仕組みです  
AS との通信を mTLS にしただけで、発行されたすべてのトークンが自動的にこの性質を持つわけではありません  
二つは組み合わせられますが、別の機能です [RFC 8705 §2–3](https://www.rfc-editor.org/rfc/rfc8705.html#section-2)

mTLS で相手を認証できても、その相手にメッセージの削除を許すかは別途判断します  
通信の暗号化・相手の認証と、業務上の操作の認可を対応付ける必要があります

例えば、集計処理 A のトークンを、別のサービス B が持ち出した状況を比較します

| API の検証 | B が接続できる場合の判断 |
| --- | --- |
| 通常の Bearer Token の検証 | トークンの所持が根拠となり、B が持ち出したことをそれだけでは区別できない |
| mTLS による通信相手の認証だけを追加 | B の証明書が信頼されるだけでは、そのトークンが B 向けかまでは分からない |
| 証明書に結び付いたトークンを検証 | A の証明書への結び付きを B の接続時の証明書と照合し、不一致を拒否する |

この比較では、A の秘密鍵まで漏れていないことを前提にしています  
トークンを証明書に結び付けるときは、AS がトークンに証明書との対応を記録し、API がそれを照合する両側の処理が必要です [RFC 8705 §3](https://www.rfc-editor.org/rfc/rfc8705.html#section-3)

TLS をリバースプロキシで終端する構成では、API 本体がクライアント証明書を直接観測できない場合もあります  
その場合は、証明書を検証したプロキシからの情報を、API がどの条件で信頼するかを決めます  
任意の呼出し元が付けたヘッダーを証明書検証の代わりにしないことまで含めて、通信の経路を確認します [RFC 8705 §6.5](https://www.rfc-editor.org/rfc/rfc8705.html#section-6.5)

## Kubernetes の ServiceAccount と Istio

Kubernetes では、[ServiceAccount](../reference/glossary.md#service-account) がプログラムなどのための主体を表します  
例えば集計処理の Pod に専用の ServiceAccount を割り当て、Kubernetes API への権限を RBAC（Role-Based Access Control） で制御できます  
ServiceAccount があることと、その主体に必要な API 操作を許可することは別です  
Pod へ渡すトークンには、TokenRequest API による有効期限付き・自動更新の仕組みがあります  
[Kubernetes：Service Accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)

Kubernetes の API Server は `--service-account-issuer` を設定すると、ServiceAccount token の issuer としてトークンへ署名し、OIDC Discovery と JWKS を公開できます  
外部のサービスはこの公開鍵情報を使って、ServiceAccount token を検証できます  
ただし公開される文書は ServiceAccount token の検証に必要な項目へ絞られた OIDC 互換の情報であり、通常の利用者ログインを提供する完全な OIDC Provider と同一視しません [Kubernetes：Configure Service Accounts for Pods](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)

Pod へ既定で投影される token は Kubernetes API 向けの audience を持ちます  
別のサービスや証明書発行元へ渡すなら、TokenRequest API や投影ボリュームで、その相手を audience とする短命 token を要求し、受け取る側も期待する audience を確認します  
同じ token を提示できるからといって、任意のサービスが同じ権限として受け入れてよいわけではありません [Kubernetes：Configure Service Accounts for Pods](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)

この ServiceAccount のトークン取得を、OAuth の Client Credentials Grant と同じフローだとは考えません  
また、Kubernetes API に対する RBAC の権限を付けても、それだけで独自のメッセージ API の認可が設定されるわけではありません

[Istio](../reference/glossary.md#istio) は、サービス間の通信を管理する[サービスメッシュ](../reference/glossary.md#service-mesh)の一つです  
Kubernetes 上の構成では ServiceAccount に基づくワークロードの識別情報を使い、証明書の発行・更新や mTLS による相互認証を扱います  
この mTLS 証明書と、Kubernetes API に提示する ServiceAccount のトークンは別の資格情報です  
Kubernetes の Pod では、ServiceAccount token を Istio の証明書発行元へ提示して、mTLS 証明書の発行・更新を認証する構成があります  
この token は証明書を受け取るための入口の資格情報であり、サービス間の mTLS ハンドシェイクで相手へ提示する資格情報は発行後の証明書と秘密鍵です  
token を mTLS の証明書そのもの、または mTLS 接続で直接送る token と混同しません [Istio：Debugging Virtual Machines](https://istio.io/latest/docs/ops/diagnostic-tools/virtual-machines/)
アプリケーションごとに証明書の配布処理を作る負担を、基盤側へ移す仕組みとして捉えられます  
[Istio：Security / Istio identity](https://istio.io/latest/docs/concepts/security/#istio-identity)

Istio でも、通信相手の認証とアクセスの許可は分かれています  
`PeerAuthentication` は mTLS を受け付ける条件を、`AuthorizationPolicy` はアクセスを許可・拒否する条件を扱います  
mTLS を必須にする方針は、特定のサービスだけに API の利用を許す方針とは別です  
[Istio：Authentication](https://istio.io/latest/docs/concepts/security/#authentication)、[Authorization](https://istio.io/latest/docs/concepts/security/#authorization)

ここでは仕組みの位置付けまでを紹介します  
Istio の導入やポリシー設定は実習に含めていません

例えば Kubernetes API の Pod 一覧を読む操作と、メッセージ API の投稿を読む操作では、許可を判断する場所が異なります  
前者の権限を与えた ServiceAccount のトークンを後者へ渡しても、その API がトークンを信頼し、意味を解釈する契約がなければ利用できません  
同様に Istio で集計サービスから API への通信を許しても、メッセージの所属や閲覧範囲を基盤側が自動で理解するわけではありません

仕組みを組み合わせるときは「どの主体が、どの資格情報で、どの相手へ接続し、誰が操作を許可するか」を一行ずつ書き出します  
同じプログラムが Kubernetes API 用のトークンとサービス間通信の証明書を持つことはあり得ますが、それぞれの提示先と権限は混ぜません  
この対応を保つと、資格情報の更新で接続が壊れたのか、認可ポリシーで操作が拒否されたのかを調べる入口になります

## 確認問題

**問い：集計処理とメッセージ API の間で mTLS が成功したので、メッセージの削除要求も受け入れてよいでしょうか**

::: details 解説
相手を認証したことから、削除権限までは導けません  
集計処理という主体に許可された操作と、要求された操作を照合します  
人間以外のアクセスでも、誰であるかと何を許可するかを区別する原則は同じです
:::
