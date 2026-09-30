# OP の設計と相互接続

::: tip このページの目標

RP が信頼できる認証結果を受け取るために、OP が管理・検証・公開する情報と、それらの情報が満たすべき条件を説明できるようになる

:::

::: info このページの要点

- **公開情報**：Discovery・issuer・JWKS と実際の提供機能を整合させる
- **認証条件**：prompt・max_age と認証状態や同意の処理を対応付ける
- **内部構成**：ユーザー管理と別サービスでも、OP は認証結果・属性・認証時刻を確かな根拠に結び付ける
- **相互接続**：UserInfo・ID Token の条件を確認し、接続試験と適合試験を区別する

:::

前のページでは、OP が発行する ID Token と、RP がそれを受け入れる条件を確認しました  
ここでは OP の内部と公開設定に進み、RP が検証できる認証結果を発行し続けるために OP が満たす条件を確認します  
教材では traQ 側の役割であり、登場人物の対応は[OAuth と OIDC の対応表](oidc.md#oidc-roles)で確認できます

## OP の責務と相互接続 {#op}


OP の責任は、公開する設定、実際の認証状態、発行する Claims を一貫させることです  
特定の実装言語やライブラリを前提にせず、OP が満たすべき条件を確認します

### 相互接続の契約 {#op-相互接続の契約}

自作の OP と自作の RP が通信できても、二つのプログラムが同じ思い違いを共有しているだけかもしれません  
OP として接続するには、相手が仕様に従って設定や応答を解釈できることが必要です  
そのため、同じ実装同士の接続に加えて、独立した RP や適合試験からも契約を確かめます

::: warning この節の実装・検証状況
教材の参照 OP、別の実装の RP との接続、Conformance Suite は未実装・未実施です  
以下は責務と検証条件の説明であり、動作保証や適合宣言ではありません
:::

### OP とユーザー管理

ここまでのフローでは、OP が利用者を認証し、必要なユーザー情報を取得できることを前提にしました  
そのユーザー管理と OP が同じ DB・プロセスを使うかどうかは、OIDC の役割とは別の配置上の選択です  
同じプロセスなら内部関数で受け取れる情報も、別サービスなら通信相手の確認や要求・応答の契約が必要になります

ユーザー管理からプロフィールや利用停止状態を取得する処理と、パスワードやパスキーで本人を認証する処理は区別します  
ユーザーのレコードを取得できただけでは、その利用者を認証したことにはなりません  
OP は確かめた認証結果とユーザーの対応に基づいて、自分の issuer で ID Token を発行します [OIDC Core §3.1.2.3](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequestAuthentication)

この分離によって、RP が受け取る OIDC の契約を変える必要はありません  
内部で変わるデータの所有者、ログイン時の通信、利用停止の反映と障害時の判断は、コラムの[IdP とユーザー管理の分離](../columns/identity-architecture.md)でDB やプロセスを共用する場合と比較します

### Discovery と issuer の整合性 {#op-discovery-と-issuer-の整合性}

RP に issuer を設定すると、[Discovery](../reference/glossary.md#discovery) の Provider Configuration から authorization endpoint、token endpoint、`jwks_uri`、対応機能などを取得できます  
metadata の issuer、取得に使った issuer、ID Token の issuer が整合することが重要です  
Discovery は攻撃者の任意のサーバーを信頼する仕組みではありません [OIDC Discovery §3・§4.3](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfigurationValidation)

教材では一つの issuer を設定の基準にし、RP と OP の設定で同じ値を使います  
リバースプロキシの内側のホスト名を token の issuer にしたり、末尾のスラッシュの違いを RP が勝手に補正したりする設計は採りません  
外部から見える URL と内部の接続先を分けて整理します

例えば `response_types_supported` に未実装のフローを載せれば、RP は利用できる契約だと判断して要求します（metadata に載せる範囲の考え方は後述の[metadata と対応機能](#op-metadata-と対応機能)で扱います）  
教材として対象外でも、OP の必須機能に不足があれば部分実装と表示します

JWKS には検証用の公開部分だけを載せます  
署名鍵を交換するときは新しい token を検証する鍵と、まだ有効な古い token を検証する鍵の利用期間を考えます  
本稿は鍵ローテーションの運用を実装済みとはしません [OIDC Core §10.1.1](https://openid.net/specs/openid-connect-core-1_0.html#RotateSigKeys)

#### issuer とエンドポイント URL {#op-issuer-とエンドポイント-url}

教材で issuer を `https://id.example` と決めたとします  
実際の OP がリバースプロキシの内側の `http://op:8080` で動いていても、それは内部から到達するためのアドレスです  
内部 URL を ID Token の `iss` に使うかどうかを、受け取った Host ヘッダーだけで場当たり的に決めると、RP が設定した発行者と一致しなくなります

issuer は発行者を識別する設定であり、通信できた相手のアドレスなら何でもよい値ではありません  
一方、authorization endpoint、token endpoint、`jwks_uri` は、その発行者が公開する機能の場所です  
すべてが同一 URL になるわけではなく、それぞれの用途で利用できることを確認します [OIDC Discovery §3・§4.3](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata)

この違いを接続試験で確認するなら、次の観点になります

| 値・機能 | 確認する側 | 確認したいこと |
| --- | --- | --- |
| issuer | RP の設定と検証処理 | metadata と ID Token の発行者が期待値に一致する |
| authorization endpoint | 利用者のブラウザ | 認証・同意を行い、登録済み RP の callback へ戻れる |
| token endpoint | RP のバックエンド | client 認証を含むコード交換ができる |
| `jwks_uri` | RP のバックエンド | 必要な公開鍵を取得して署名を検証できる |

ブラウザで OP のログイン画面を開けたことは、RP のサーバーから token endpoint に到達できる証拠ではありません  
同じ開発端末で動かしている場合でも、ブラウザ、コンテナー、RP のプロセスでは名前解決や接続先が異なることがあります  
これは OIDC の検証規則を緩める理由ではなく、どの主体から接続するかを環境設定へ反映する問題です

#### metadata と対応機能 {#op-metadata-と対応機能}

Provider Configuration の見本をコピーして公開すると、コードが処理しない機能まで対応済みとして知らせてしまうことがあります  
例えば署名方式を複数載せても、その全部で発行できる設定や鍵が用意されていなければ、RP が選んだ条件を満たせません  
metadata は将来実装したい機能の一覧ではなく、接続相手が現在の要求を組み立てる根拠です

逆に、metadata の項目を削除しても、その仕様で定める既定値や必須要件まで消えるとは限りません  
「未掲載だから未対応」と独自に解釈せず、各項目の省略時の意味へ戻ります  
最初の教材実装では、構成を小さくすることと、宣言する対応範囲を小さくすることを一緒に確認する必要があります

設定を変更するときも、本文書とコードだけを直して終わりにはできません  
RP が取得済みの設定や鍵をいつ更新するかによって、新旧の情報が並ぶ期間が生まれます  
新しい機能の公開と、古い機能の停止が同じタイミングで可能かを、利用中の RP と合わせて判断します  
これは運用の設計事項であり、本稿では設定変更の相互接続試験を実施していません

### 要求条件と認証セッション {#op-要求条件と認証セッション}

既存の認証セッションがあっても、要求パラメータに応じた処理が必要です [OIDC Core §3.1.2.1・§3.1.2.6](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest)

- [`prompt=none`](../reference/glossary.md#prompt)：ログインや同意の画面を出さない  
  必要な状態がなければ、状況に応じた OIDC のエラーを返す
- [`prompt=login`](../reference/glossary.md#prompt)：再認証を求める要求として扱う  
  既存 Cookie があることだけで通常通り通過させない
- [`max_age`](../reference/glossary.md#max-age)：実際の認証時刻からの経過を制限する  
  認証時刻は Cookie の最終アクセス時刻と分けて保持する

例えば 10 時に認証し、11 時に `max_age=300` の要求を受けたとします  
セッションがまだ有効でも、その認証は要求する鮮度を満たしません  
再認証が成功してから認証時刻を更新し、その時刻を ID Token に反映します  
token を発行するたびに `auth_time` を現在時刻に置き換えると、実際には行っていない再認証を主張することになります

#### prompt=none の処理条件 {#op-prompt-none-の処理条件}

`prompt=none` は認証や同意を省略してよい指定ではなく、利用者との対話なしで要求を満たせるかを問う指定です  
次は、client や redirect URI などの要求検証を終えた後の判断例です

| OP が保持している状態 | `prompt=none` に対する判断 |
| --- | --- |
| 利用者を認証済みで、必要な許可と他の要求条件も満たす | 対話せず成功応答へ進める |
| 利用者を認証する必要がある | ログイン画面を出さず、`login_required` など状況に応じたエラーを返す |
| 利用者は分かるが、追加の同意が必要 | 同意画面を出さず、`consent_required` などのエラーを返す |
| 複数の利用者のうち誰を使うか選択が必要 | 選択画面を出さず、`account_selection_required` などのエラーを返す |

これらのエラーはサーバーが壊れたという意味ではなく、対話なしでは要求を満たせないという応答です  
RP が次に対話を伴うログインを始める場合も、それは新しい要求として扱い、前の要求を成功扱いにはしません  
`none` と他の `prompt` 値を同時指定する場合はエラーになります [OIDC Core §3.1.2.1・§3.1.2.6](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest)

#### 認証状態と同意状態 {#op-認証状態と同意状態}

利用者 A がチャットサービスへログイン済みであっても、新しいビューアー C に属性を渡す許可まで存在するとは限りません  
この場合は A の認証状態を保ちつつ、C の要求に対する同意を確認する段階へ進みます  
同意を拒否したからといって、A がチャットサービスにログインしていた事実が取り消されるわけではありません

反対に、C への許可が記録されていても、A の認証が `max_age` より古ければ再認証が必要です  
再認証に成功したことも、要求された追加 scope をすべて許可する根拠にはなりません  
この二つを一つの「ログイン済み」フラグにすると、再認証だけで同意を飛ばしたり、同意の記録だけで古い認証を通したりする原因になります

教材の状態として整理すると、少なくとも次の情報は分けて追います

- **利用者の認証状態**：誰を、いつ認証したか
- **client への許可**：誰が、どの client に、何を許可したか
- **進行中の要求**：今回どの client が、どの条件と nonce で要求しているか

OP が許可を得る方法は、毎回同意画面を表示する方法だけではありません  
事前に成立している条件を使える場合もありますが、その場合も「認証したので許可した」と混同しません [OIDC Core §3.1.2.3・§3.1.2.4](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequestAuthorization)

#### 再認証の中断と認証時刻 {#op-再認証の中断と認証時刻}

10時に認証した A が、11時に鮮度5分以内の要求を受け、再認証の画面を開いてから中断したとします  
画面を表示しただけでは認証時刻を11時へ更新できません  
要求は成功しておらず、その要求についてコードを発行する条件もそろっていません

再認証の成功を確認して初めて認証時刻を更新し、要求と同意の条件を満たしたうえでコードの発行へ進みます  
`max_age` を使った要求への ID Token には `auth_time` が必要なので、OP が内部に保持する時刻と RP に伝える時刻を同じ事実から作ります [OIDC Core §3.1.2.1](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest)

これは状態遷移を読むための例であり、再認証 UI や中断処理の実装を実証したものではありません

### Claims の設定 {#op-id-token-の発行根拠}

ID Token の発行では、受け取った要求の値をそのまま Claims に写すのではなく、それぞれの値の根拠を確かめます [OIDC Core §2・§3.1.3.6](https://openid.net/specs/openid-connect-core-1_0.html#CodeIDToken)

- `iss`：OP が管理する issuer の設定から決める
- `sub`：認証済みユーザーに対応する識別子を使う  
  フォームで指定された任意のユーザー ID を信用しない
- `aud`：検証した要求とコードに結び付く client ID を使う
- `iat`・`exp`：発行時刻と設定した有効期間から決める
- [`auth_time`](../reference/glossary.md#auth-time)：必要な場合に、認証セッションが保持する実際の認証時刻を載せる
- `nonce`：認証要求に含まれていた場合、その要求と結び付けて保持した値を返す

こうして作った Claims を、OP が管理する鍵と許可した方式で署名します  
暗号処理をライブラリに任せても、誤ったユーザーや宛先を渡せば、誤った主張に正しい署名が付きます  
ID Token の検証の署名例で確かめた暗号上の整合性と、OP が主張する事実の正しさは別の責任です

例えば認証済みユーザー A のコードを交換する際、別のフォーム値から B の `sub` を選べるなら、署名検証に成功しても認証連携は成立しません  
認証、許可、コード、client、発行する Claims の対応を、発行前まで保つ必要があります

### UserInfo と ID Token の利用者照合 {#op-userinfo-と-id-token-の利用者照合}

[UserInfo](../reference/glossary.md#userinfo) は Access Token を提示して利用者の Claims を取得する保護されたリソースです  
OP は UserInfo で Access Token を検証し、ID Token を API 用の資格情報として受け付けません  
RP は UserInfo の `sub` が ID Token の `sub` と一致することを確認し、一致しない場合は取得した情報を利用しません  
別の利用者の属性を現在のログインに混ぜることを防ぐためです [OIDC Core §5.3.2・§5.3.4](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponse)  
したがって OP は、UserInfo の応答に必ず `sub` を含め、その Access Token に対応する利用者について ID Token と同じ `sub` を返します

教材のメッセージ API と UserInfo は目的が違います  
UserInfo が正しい利用者を返しても、メッセージ API のチャンネルへのアクセス権のチェックが正しい証拠にはなりません  
別の実装の RP との接続時には、まず最小の Claims で識別できることを確認し、必要な属性だけを追加します

#### ID Token と UserInfo の属性 {#op-id-token-と-userinfo-の属性}

ID Token は認証結果を検証するために使い、UserInfo は Access Token に基づいて属性を取得するために使います  
そのため、常に同じ Claims を同じ内容で二か所から返す必要がある、と考えるのは適切ではありません  
ただし、返した属性が誰のものかという対応は保つ必要があります

例えばログイン後に利用者が表示名を変更すると、発行済み ID Token の表示名と、後から UserInfo で返す表示名は異なります  
RP はそれだけで別人とは判断せず、識別子の照合と表示用の属性の更新を区別します  
そのため OP は、表示用の属性が変わっても同じ `sub` で同じ利用者を示し続けます  
一方、`sub` が違う応答は、RP が古いプロフィールだろうと推測して使い続けず、利用しません [OIDC Core §5.3.2](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponse)  
RP が受け取った属性を表示・識別・利用条件のどこへ反映するかは、コラムの[UserInfo の属性の反映](../columns/rp-implementation.md#rp-userinfo-attributes)で扱います

#### 属性の欠落時の処理 {#op-属性の欠落時の処理}

`profile` を scope に含めたからといって、OP が氏名、画像、住所などの全情報を持っているとは限りません  
scope ごとに要求する Claims の集合も異なります  
OP が保持しない属性や開示されなかった属性は返らない場合がありますが、UserInfo の `sub` は省略できません [OIDC Core §5.3.2・§5.4](https://openid.net/specs/openid-connect-core-1_0.html#ScopeClaims)

RP は、任意の属性が返されない場合と、識別に必要な `sub` の欠落を分けて扱います  
`sub` がない応答は、誰の属性かを確認できない応答として拒否されます  
属性が返らなかった理由を RP が欠落だけから完全に識別できるとは限らず、RP 側の代替の設計はコラムの[属性の欠落時の処理](../columns/rp-implementation.md#rp-missing-attributes)で扱います

### OP の責務と検証条件 {#op-op-の責務と検証条件}

下表は、各機能をどこで処理し、何を確かめるかの対応です  
仕様の OPTIONAL は要求の送信が任意という意味の場合もあり、受信後の MUST を消す理由にはなりません

| 機能・根拠 | 担当の設計 | 状態 | 拒否・状態の確認 |
|---|---|---|---|
| Code / PKCE：RFC 6749 §4.1、RFC 7636 §4 | プロトコルの検証と保存層 | 未実証 | verifier 不一致、コード再利用、同じコードの同時使用 |
| state / nonce：Core §3.1 | RP が要求と対応付ける<br>OP が必要な値を返す | 未実証 | 別の要求への差し替え、nonce 不一致 |
| prompt：Core §3.1.2.1 | アプリのセッション・同意 UI と処理系 | 未実証 | none で UI を出さない、login で再認証 |
| max_age / auth_time：Core §3.1.2.1、§3.1.3.7 | OP の認証時刻、RP による認証からの経過時間の確認 | 未実証 | 古い認証、必須 Claim 欠落 |
| offline_access：Core §11 | 同意と更新ポリシー | 採用範囲も未確定 | 必要な同意が得られない要求 |
| Discovery / JWKS：Discovery §3–4 | OP の公開設定、RP の照合 | 未実証 | issuer 不一致、秘密鍵の混入 |
| UserInfo：Core §5.3 | Access Token 検証、RP の sub 照合 | 未実証 | 無効 token、sub 不一致 |
| display / ui_locales / claims_locales / acr_values：Core §15.1 | UI とパラメータ処理 | 未実証・必須範囲を確認 | 最低限、これらの使用だけを理由にエラーにしない |

この最後の行は、すべての表示方法や言語、要求された認証コンテキストを実現しなければならない、という意味ではありません  
Core §15.1 が定める最低限の対応と、実際に提供する UI や認証方式を分けて記録します  
存在しない機能を対応済みと宣言することも、実現しない要求値を一律に拒否することも避けます [OIDC Core §15.1](https://openid.net/specs/openid-connect-core-1_0.html#ServerMTI)

[`offline_access`](../reference/glossary.md#offline-access) は利用者が不在でもアクセスするための要求を扱い、同意に条件があります  
すべての Refresh Token 発行が例外なくこの scope を要求する、と一般化しません  
本文のトークンの更新に関する設計と OIDC の offline access の扱いを別々に確認します [OIDC Core §11](https://openid.net/specs/openid-connect-core-1_0.html#OfflineAccess)

### 相互接続と適合試験 {#op-相互接続と適合試験}

独立した RP との接続は、別実装が同じ契約を解釈できるかを調べる方法です  
OIDF Conformance Suite は、OP の振る舞いを外部の試験で確認します  
本教材では Basic OP / Config OP を参照対象の案としますが、小さい機能集合と profile の必須機能は同じではありません  
例えばクライアント認証方式や `prompt` などの要求との差分を残す必要があります [OIDF OP testing](https://openid.net/certification/connect_op_testing/)、[Conformance Profiles v3.0 §2.1](https://openid.net/wordpress-content/uploads/2018/06/OpenID-Connect-Conformance-Profiles.pdf)

ログを読む練習として「`max_age` を送った応答に必要な `auth_time` がない」という仮定を考えます  
これは実測ログではありません  
次の順で原因を調べます

1. 送信した要求に `max_age` が含まれていたか確認する
2. Core がその条件で要求する処理と Claims を確認する
3. OP に保存した認証時刻と、発行した Claims を照合する
4. 不足した処理を担当するアプリケーション・ライブラリ・設定を特定する

結果の表示だけでなく、どの契約が欠けたかを説明できることを目指します

講習では、要求・応答と仕様の条件を対応付けて読むことを重視します  
suite の構築を受講者全員の前提にはしません  
実行する場合の対象選定や記録方法は [適合試験の進め方](../reference/conformance-testing.md) にまとめています  
部分的な成功、未実施、正式認定は分けて扱います

**確認問題:** metadata から `max_age` 関連の記述を省けば、認証時刻の処理を持たなくても適合する OP と言えるでしょうか

::: details 解説
言えません  
公開している対応機能と、Core が OP に要求する必須機能は別の確認です  
[Core §15.1](https://openid.net/specs/openid-connect-core-1_0.html#ServerMTI) と受信した要求の条件に戻り、不足がある間は教育用の部分実装として扱います
:::

#### 接続試験の確認範囲 {#op-接続試験の確認範囲}

独立した RP がログインできたという結果は、その構成で使った client 認証方式、要求パラメータ、署名方式などについての結果です  
一度も送っていない `prompt` や、別の条件で必要になる Claims まで確認したことにはなりません  
試験を説明するときは、「ログイン成功」という一語を、使った条件と観測した応答へ分解します

例えば手動でログイン画面に入力し、ID Token を受け取れたなら、対話を伴う一つの経路は成立しています  
その結果から、既存セッションを再利用する経路、対話を禁止する経路、古い認証を拒否する経路を推定することはできません  
認証画面を毎回表示する実装でも、最初の一回だけを試すと違いが見えないからです

| 観測した結果 | その結果だけでは分からないこと |
| --- | --- |
| 別の実装の RP で一回ログインできた | 未使用の要求条件、異常系、他の構成での相互接続 |
| OP の適合試験で一つの module が成功した | 選択していない module、プロファイル全体、正式認定 |
| RP が不正な ID Token を拒否した | OP がすべての条件で正しい Claims を発行すること |
| UserInfo の `sub` が一致した | メッセージ API の操作対象へのアクセス権の確認やアプリ内のアカウント統合 |

結果の範囲を限定することは、試験の価値を低く見ることではありません  
どの契約を一つ確認できたかが分かれば、次に条件を一つ変えて確かめられます  
そのため、成功・失敗に加えて、使った要求、設定、実装版とまだ試していない条件を残します

本教材では、プロトコルの判定結果と、データの変更も分けて観測する方針です  
例えば再認証を拒否した応答が返っていても、内部の認証時刻が更新されていたなら、後続の要求では古い認証が新しく見える可能性があります  
エラー応答の形式だけでなく、拒否した処理が状態へ残す影響も確認する必要があります  
ここで挙げた接続・拒否試験は計画上の観点であり、実行結果や適合宣言ではありません

### traQ の OIDC 実装との対応 {#op-traq-の-oidc-実装との対応}

traQ の [Discovery ハンドラー](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/router/oauth2/oidc.go) は、issuer と認可・トークン・UserInfo・JWKS の URL などを公開する処理です  
[トークン発行処理](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/router/oauth2/token_endpoint.go#L51-L104) では、`openid` scope がある場合に ID Token を作り、`iss`・`sub`・`aud`・期限などを組み立てています  
どの値をどこから得るかを、この節の発行側の責任と照合できます

同じ処理には、`openid` を含む場合は Refresh Token を発行しないという traQ の選択もあります  
教材で扱う RT 更新・ローテーションや `offline_access` の検討を、traQ がそのまま実装しているとは読み替えません  
仕様の要件、traQ の選択、教材の選択を比べるための参照です
