# 出典と確認状況

::: tip このページの目標

本文の主張を支える一次資料を探し、仕様上の根拠と説明の参考資料を区別できるようになる

:::

::: info このページの要点

- **一次資料**：章ごとに仕様や公式資料を探し、具体的な主張の根拠は本文の該当節へのリンクで確認する
- **参考資料**：説明や構成の参考にした記事と、仕様上の要件を定める資料を区別する
- **確認状況**：資料を読んだことと、実装の動作・適合性を試験したことは別に記録する

:::

このページは、疑問が生じたときに一次資料へ戻るための索引です  
個々の主張と根拠の対応は、各章の本文に付けた節へのリンクを参照してください  
一覧にある資料が、同じ章のすべての説明を規定しているわけではありません  
例えばチャンネルの閲覧ルールは教材の選択であり、OAuth が定めたアプリケーションのルールではありません

確認日は **2026-09-20** です  
「確認済み」は執筆に必要な資料本文を取得して参照したという意味です  
実装の適合性、ライブラリの固定版での動作、ブラウザとの相互接続を試験済みという意味ではありません  
S 番号は編集仕様から引き継いだ識別子です

## 概略と付録：認証・認可の定義と仕様の要件

認証と身元確認の区別には [NIST SP 800-63A-4 §2](https://pages.nist.gov/800-63-4/sp800-63a.html#sec2) を参照します（2026-09-21 確認）

座学の増補では、[OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html#validate-the-permissions-on-every-request) の要求ごとの権限検証と、[RFC 6749 §4.1.2.1](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1.2.1) のエラー応答先の条件を確認しました（2026-09-21）  
認可判断の表は教材の設計例であり、実サービスへの試験結果ではありません

| ID | 資料と読む場所 | この教材で確かめること |
| --- | --- | --- |
| S17 | [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)：§1–3、§4、§8 | 認証器の制御、要素と保証レベル、回復、利便性<br>NIST の適用対象と本教材の設計を区別する |
| S01 | [RFC 6749 §1〜§4.1](https://www.rfc-editor.org/rfc/rfc6749.html#section-1) | 役割・登録・エンドポイント・要求応答という仕様の構成<br>認可コードの一回限りの利用と、保存方式の選択を分ける |

付録の仕様群の対応表では、下記の S02（Bearer）、S03（PKCE）、S04（Security BCP）、S05（OIDC Core）も参照しています  
各文書の担当範囲と、RFC と OpenID Foundation の仕様の区別を確認しました

以上は今回確認済みです  
AND/OR の図式は経路を読むための教材上の整理であり、独立性を仮定した確率モデルや、特定の保証レベルへの適合判定ではありません

## 認可：委譲、コード交換、提供側、寿命

権限管理のコラムには [NIST RBAC FAQ](https://csrc.nist.gov/Projects/Role-Based-Access-Control/faqs) と [NIST SP 800-162：ABAC の定義](https://csrc.nist.gov/pubs/sp/800/162/upd2/final) を参照します（2026-09-21 確認）  
scope の意味と発行結果は RFC 6749 §3.3・§5.1、Client が必要最小限の権限を要求することは §10.3、トークンの権限制限は RFC 9700 §2.3 に対応させます  
ロール名、属性に関する条件、細分化した scope 名は教材の設計例であり、traQ の実装に追加された機能ではありません

| ID | 資料と読む場所 | この教材で確かめること |
| --- | --- | --- |
| S01 | [RFC 6749](https://www.rfc-editor.org/rfc/rfc6749.html)：§1–3、§4.1–4.5、§6 | 主体、Client、scope、コード交換、更新、OAuth 1.0 との非互換性<br>2012 年の本文だけで安全性の基準を完結させない |
| S02 | [RFC 6750](https://www.rfc-editor.org/rfc/rfc6750.html)：§1.2、§2.1、§3、§5 | Bearer の意味、ヘッダーでの提示、エラー、漏えい対策 |
| S03 | [RFC 7636 §4](https://www.rfc-editor.org/rfc/rfc7636.html#section-4)、[Appendix B](https://www.rfc-editor.org/rfc/rfc7636.html#appendix-B) | verifier と challenge、S256、コード交換での照合<br>Code Flow と PKCE の計算例は Appendix B の公開テストデータ |
| S04 | [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html)：§2.1、§2.2、§2.4、§4.7、§4.14 | PKCE・CSRF・Refresh Token の現在の安全性基準<br>public/confidential と MUST/SHOULD の条件を読む |
| S14 | [Fosite README：A word on security](https://github.com/ory/fosite#a-word-on-security) | プロトコル処理と、認証・セッション・`prompt`・`max_age` などアプリに残る責任 |
| S29 | [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)：Cookie、セッション更新、ログ | 提供側の設計などの実装で必要な注意点<br>冒頭では HTTP・セッションの基礎を復習しない |
| S12 | [RFC 7009 §2](https://www.rfc-editor.org/rfc/rfc7009.html#section-2) | トークン失効を要求する HTTP の契約 |
| S13 | [RFC 7662 §2](https://www.rfc-editor.org/rfc/rfc7662.html#section-2) | トークンの有効性を問い合わせる HTTP の契約 |

以上は今回確認済みです  
Fosite は動的な README を確認した段階であり、教材に使う Go module の版は未固定です  
API の具体化時には tag/commit と対象ソースを記録し、ローカル試験を実施します  
README の機能一覧だけで教材実装の対応を保証しません

[OAuth のフロー](../chapter-2/oauth-flows.md#oauth-grant-types)では、基本仕様の四つの grant と拡張を区別します  
Device Authorization Grant の用途と別端末での操作は [RFC 8628 §1・§3](https://www.rfc-editor.org/rfc/rfc8628.html#section-1)で確認しました（2026-09-21）  
Implicit の条件付き非推奨と Password Grant の使用禁止は RFC 9700 §2.1.2・§2.4 に基づきます

## 認証：OIDC と JOSE

| ID | 資料と読む場所 | この教材で確かめること |
| --- | --- | --- |
| S05 | [OpenID Connect Core 1.0 incorporating errata set 2](https://openid.net/specs/openid-connect-core-1_0.html)：§2、§3.1–3.3、§5.3、§5.7、§11、§15.1 | ID Token、要求パラメータ、検証、UserInfo、識別子、offline access、OP の必須機能 |
| S06 | [OpenID Connect Discovery 1.0 incorporating errata set 2](https://openid.net/specs/openid-connect-discovery-1_0.html)：§3–4 | Provider Configuration、issuer と公開情報の整合性 |
| S07 | [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519.html)：§2–5 | JWT の Claims と表現<br>ID Token の要件は Core も読む |
| S08 | [RFC 7515](https://www.rfc-editor.org/rfc/rfc7515.html)：§3–5 | JWS の形式、署名・MAC と検証 |
| S09 | [RFC 7516 §3](https://www.rfc-editor.org/rfc/rfc7516.html#section-3) | JWE による暗号化と JWS との違い |
| S10 | [RFC 7517 §4–5](https://www.rfc-editor.org/rfc/rfc7517.html#section-4) | JWK と JWK Set<br>公開 JWKS と秘密鍵を区別する |
| S11 | [RFC 8725 §3](https://www.rfc-editor.org/rfc/rfc8725.html#section-3) | アルゴリズム、発行者、宛先、用途を含む JWT を受け入れる条件 |
| S22 | [GitHub Docs：Authorizing OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps) | GitHub OAuth Apps の state・PKCE・コード交換・毎回のユーザー確認<br>OIDC の起源を示す資料ではない |

以上は今回確認済みです  
Core と Discovery は OpenID Foundation の仕様であり RFC ではありません  
JWT を読む、署名を検証する、特定用途で受け入れる、という三つの操作を分けて参照してください

ID Token の実例では、[RFC 7518 §3.3](https://www.rfc-editor.org/rfc/rfc7518.html#section-3.3) の RS256 と [§6.3.1](https://www.rfc-editor.org/rfc/rfc7518.html#section-6.3.1) の RSA 公開 JWK パラメータも確認しました  
掲載値は教材用に生成したデータであり、仕様書の例の転載や実サービスの通信記録ではありません

## OP の要件と相互接続：適合試験

| ID | 資料 | 確認状況と使い方 |
| --- | --- | --- |
| S32 | [OIDF：Conformance Testing for OpenID Connect OPs](https://openid.net/certification/connect_op_testing/) | 今回確認済み<br>OP を試験する側、profile、設定・操作の案内 |
| S33 | [OpenID Connect Conformance Profiles v3.0（PDF）](https://openid.net/wordpress-content/uploads/2018/06/OpenID-Connect-Conformance-Profiles.pdf) | 今回確認済み<br>2018-06-28 版、§2.1.1 Basic OP・§2.1.4 Configuration<br>旧 ID を現在の module ID とみなさない |
| S34 | [OIDF：About the Conformance Suite](https://openid.net/certification/about-conformance-suite/) | 今回確認済み<br>検証利用、環境の選択、正式認定との区別 |
| S35 | [Conformance Suite UI ソース：log-detail.js](https://gitlab.com/openid/conformance-suite/-/raw/master/src/main/resources/static/js/log-detail.js) | 今回未確認<br>編集仕様から引き継いだ参照先であり、現行 UI の動作や操作手順の保証には使わない |

[Build & Run](https://gitlab.com/openid/conformance-suite/-/wikis/Developers/Build-%26-Run) の実行手順は今回未確認です  
suite の構築・起動・接続・試験も未実施です  
具体的な plan/variant/module、suite 版、結果は後続の実施時に記録します  
詳しくは[適合試験の付録](./conformance-testing.md)を参照してください

OAuth と OIDCでは [OIDC Core §1](https://openid.net/specs/openid-connect-core-1_0.html#Introduction) の標準化目的と [RFC 6749 §10.16](https://www.rfc-editor.org/rfc/rfc6749.html#section-10.16) のトークン転用の問題も確認しました  
GitHub の [不変 ID に関する指針](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/best-practices-for-creating-an-oauth-app#use-the-durable-unique-id-to-store-the-user)と [Check a token](https://docs.github.com/en/rest/apps/oauth-applications#check-a-token) は2026-09-20に確認  
通常の Web application flow と追加のトークン確認を区別し、ログイン実装を実行検証したとは扱いません

## 認証方式の比較と運用 {#方式の比較方式の比較}

終了通知の経路には [Front-Channel Logout §2](https://openid.net/specs/openid-connect-frontchannel-1_0.html#RPLogout) と [Back-Channel Logout §1・§2](https://openid.net/specs/openid-connect-backchannel-1_0.html#Introduction)、記録の設計には [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html#data-to-exclude) を参照します（2026-09-21 確認）  
ログアウト通知の実装や障害対応を実証した記録ではなく、設計判断を読むための例です

通信例には SAML Technical Overview §5.1.2–§5.1.3、ログアウトの追加仕様には [OpenID Connect RP-Initiated Logout 1.0 §2](https://openid.net/specs/openid-connect-rpinitiated-1_0.html#RPLogout) を参照します（2026-09-21 確認）  
通信とログアウトの影響範囲の説明に用い、実装済み機能としては扱いません

S21 の [OASIS SAML 2.0 Technical Overview](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html) は今回確認済みです  
Web Browser SSO、IdP/SP、Assertion、Bindings、Profiles の関係を読む入口にします  
overview だけで SAML 実装の細かな規範を確定せず、Core・Profiles・Bindings 本体へ戻ります

JPKI の紹介では、[J-LIS：公的個人認証サービス](https://www.j-lis.go.jp/jpki/cms_18.html)、[デジタル庁：公的個人認証サービス（JPKI）](https://www.digital.go.jp/policies/mynumber/private-business/jpki-introduction)、JPKI の [電子証明書に関する FAQ](https://www.jpki.go.jp/faq/digital_id.html) と [マイナンバーカードに関する FAQ](https://www.jpki.go.jp/faq/iccard.html) を今回確認しました  
署名用電子証明書と利用者証明用電子証明書の用途、窓口での本人確認、カードの耐タンパ性を確認するための公式資料です  
接続実装、法令・省令の条文解釈、個別サービスで求められる保証水準の検証を行ったものではありません

Cookie セッションの責務は S29 を参照します  
形式が XML か JSON かだけで方式の安全性を比較する資料ではありません  
OAuth 1.0 との非互換性は[第2章末尾のコラム](../chapter-2/token-lifecycle.md#oauth-1-column)で扱い、S01 を参照しています

## おまけ編①：パスキーと WebAuthn

同期の製品例には [Apple Platform Security：iCloud Keychain security overview](https://support.apple.com/guide/security/icloud-keychain-security-overview-sec1c89c6f3b/web) を参照します  
2026-09-21 に公式文書を確認し、パスキーの端末間同期と E2EE による保護を本文へ補足しました  
製品の動作検証は行っていません

| ID | 資料と読む場所 | 確認状況と注意 |
| --- | --- | --- |
| S16 | [WebAuthn Level 3、2026-08-25 Recommendation](https://www.w3.org/TR/2026/REC-webauthn-3-20260825/)：§4、§5.8.4、§6.1、§6.2.1、§6.5、§7、§9 | 今回確認済み<br>UP/UV と登録・認証の検証条件<br>仕様の公開状態と実装側の対応は別 |
| S17 | [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)：§3、§4、§8、付録B | 今回確認済み<br>認証器、activation、回復、同期型を考える基準 |
| S18 | [FIDO Alliance：Passkeys](https://fidoalliance.org/passkeys/) | 今回確認済み<br>パスキーの位置付けと利用者向け説明 |
| S15 | [go-webauthn/webauthn パッケージ文書](https://pkg.go.dev/github.com/go-webauthn/webauthn/webauthn) | 今回確認済み<br>登録・ログインと途中状態の文書<br>教材の固定版・動作実証は未実施 |
| S36 | [FIDO Alliance：CTAP 2.2](https://fidoalliance.org/specs/fido-v2.2-ps-20250714/fido-client-to-authenticator-protocol-v2.2-ps-20250714.html) | 2026-09-25 に確認<br>roaming authenticator との通信と USB・NFC・BLE の通信路 |
| S37 | [Yubico：FIDO2 / U2F](https://docs.yubico.com/hardware/yubikey/yk-tech-manual/yk5-apps-fido.html)、[Firmware 5.7](https://docs.yubico.com/hardware/yubikey/yk-tech-manual/yk5-firmware-5.7.html)、[Passkeys FAQ](https://docs.yubico.com/hardware/yubikey-guidance/best-practices/all-faq-passkeys.html) | 2026-09-25 に公式文書を確認<br>YubiKey の対応規格、接続方式、保存件数、複製できないこと<br>製品の動作検証は行っていない |
| S38 | [W3C：Credential Management Level 1](https://www.w3.org/TR/credential-management-1/#dom-credentialmediationrequirement-conditional) | 2026-09-25 に確認<br>conditional mediation の定義 |
| S39 | [FIDO Alliance：パスキー（日本語）](https://fidoalliance.org/passkeys/?lang=ja)、[Passkey Central（日本語）](https://www.passkeycentral.org/ja/home/) | 2026-09-28 に確認<br>FIDO Alliance 公式の解説。Passkey Central は導入するサービス提供者向けの資料集<br>章冒頭の案内から読者を誘導する |
| S40 | [whatarepasskeys.info（日本語）](https://whatarepasskeys.info/ja/)、[passkeys.dev](https://passkeys.dev/about/) | 2026-09-28 に確認（whatarepasskeys.info は 2026-09-22 更新）<br>コミュニティ運営の利用者向け・開発者向け資料<br>FIDO Alliance 本体の公式資料としては扱わない |
| S23 | [Jxck：Passkey への道 #0: Intro](https://blog.jxck.io/entries/2025-07-07/load-to-passkey-0.html) | 今回確認済み<br>認証の問題や移行の必要性を実装と分けて説明する視点を参考にした<br>連載全体の検証や規範の根拠としては用いない<br>参考範囲は[謝辞](../acknowledgements.md)に記載 |

WebAuthn の検証結果を説明する際は S16、保証レベルや要素を論じる際は S17 に戻ります  
製品紹介や解説記事から通常の UV フラグが示す情報を広げて解釈しないようにします  
ブラウザ・OS・認証器の動作確認は別途必要です

## 標準化と仕様書の資料

S19 の [IETF：RFCs](https://www.ietf.org/process/rfcs/) と S20 の [W3C：Web Standards](https://www.w3.org/standards/) は今回確認済みです  
文書シリーズ、標準化、レビュー・実装の位置付けを読む資料です

S30 の [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119.html) と S31 の [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174.html) も今回確認済みです  
MUST/SHOULD/MAY を読む際は、引用した仕様自身の規範用語の宣言と、要求の対象・条件を合わせて確認します

S28 の [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) は今回未確認です  
パスワード検証テンプレートを選ぶときの再確認候補として残し、保存方式や固定パラメータを検証済みとする根拠にはしていません  
S27 の [OpenAI：AGENTS.md の案内](https://developers.openai.com/codex/guides/agents-md/) も今回は未確認で、制作手順の参考候補です  
認証・認可の技術的な根拠ではありません

## 解説の参考資料

以下は説明順と教材の見せ方を検討するための資料です  
技術的な要件の根拠には、各章で示す RFC や OIDC Core を用います

| 資料 | 確認した範囲と反映先 |
| --- | --- |
| [traPtitech/naro-text](https://github.com/traPtitech/naro-text) | README、[VitePress 設定](https://github.com/traPtitech/naro-text/blob/main/docs/.vitepress/config.ts)、[テーマ](https://github.com/traPtitech/naro-text/blob/main/docs/.vitepress/theme/index.js)、[演習](https://github.com/traPtitech/naro-text/blob/main/docs/chapter1/section3/3_server-exercise.md)を確認<br>確認問題の解説を標準 `details` へ整理<br>既存の標準テーマと `<<<` による実例取り込みも継続 |
| [Auth屋：仕様が読めるようになるOAuth2.0 OpenID Connect入門](https://speakerdeck.com/authyasan/shi-yang-gadu-meruyouninaruoauth2-dot-0-openid-connect-ru-men) | 公開 Transcript を確認<br>具体例から役割・通信へ進む順序と OAuth/OIDC の差分説明を認可と認証へ反映<br>スライド画像、書籍本文は未確認 |
| [川崎貴彦：一番分かりやすい OAuth の説明](https://qiita.com/TakahikoKawasaki/items/e37caf50776e00e733be) | 本文を確認<br>API にアクセスする場面からトークンと各主体を導入する順序をOAuth と権限の委譲で参考にした |
| [川崎貴彦：一番分かりやすい OpenID Connect の説明](https://qiita.com/TakahikoKawasaki/items/498ca08bbfcc341691fe) | 本文を確認<br>ID Token の発行・受領と OAuth との関係の示し方をOAuth と OIDCで参考にした |

古い資料に掲載される全フローを現在の採用候補にはせず、本文の実装対象は Code Flow + PKCE とします  
図や文章の転載は行っていません

## 題材とする traQ の公開実装

[traQ](https://github.com/traPtitech/traQ) の commit `b08db60b239677913380af450541c1c1952b5898` を2026-09-20に取得し、以下の処理を確認しました  
確認対象は公開ソースであり、traP の本番環境で動く版や設定との一致、起動・適合試験の成功を意味しません

| 参照箇所 | 本文で対応付ける内容 |
| --- | --- |
| [OAuth モデル](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/model/oauth2.go) | scope の定義、PKCE 検証 |
| [認可エンドポイント](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/router/oauth2/authorization_endpoint.go)・[トークンエンドポイント](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/router/oauth2/token_endpoint.go) | 要求、コード交換、Client Credentials、ID Token、更新トークンの発行条件 |
| [Discovery](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/router/oauth2/oidc.go) | issuer、UserInfo・JWKS を含む公開設定 |
| [アクセス制御](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/router/middlewares/access_control.go)・[チャンネル管理](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/service/channel/manager_impl.go#L415-L430)・[メッセージ API](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/router/v3/messages.go) | scope、ユーザー権限、DM の閲覧可否、投稿者による編集 |
| [Bot 作成](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/repository/gorm/bot.go)・[client ロール](https://github.com/traPtitech/traQ/blob/b08db60b239677913380af450541c1c1952b5898/service/rbac/role/client.go) | Bot の資格情報と Client Credentials の区別 |

HTTP と JOSE の教材データは traQ の通信ログから採取したものではありません  
教材の Fosite 構成、S256 の採用、RT 更新やパスキーの設計と、traQ の実装上の選択を区別します

## マシン間のアクセスの資料

2026-09-20 に以下の一次資料を確認し、M2M・mTLS のコラムに反映しました  
設定の適用・通信の実証は行っていません

| 資料 | 確認した範囲 |
| --- | --- |
| [RFC 6749 §4.4](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.4) | Client Credentials Grant の対象とフロー |
| [RFC 8705 §1.2・§2–3](https://www.rfc-editor.org/rfc/rfc8705.html#section-1.2) | mTLS、Client 認証と証明書に結び付いたトークンの区別 |
| [Kubernetes：Service Accounts](https://kubernetes.io/docs/concepts/security/service-accounts/) と [Configure Service Accounts for Pods](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/) | プログラムの主体、権限、有効期限付き・audience を持つ token、ServiceAccount issuer discovery |
| [Istio：Security](https://istio.io/latest/docs/concepts/security/) と [Debugging Virtual Machines](https://istio.io/latest/docs/ops/diagnostic-tools/virtual-machines/) | ワークロードの識別、証明書管理、ServiceAccount token を使う証明書発行・更新、認証と認可のポリシー |

## CI/CD のワークロード認証の資料

2026-09-21 に以下の公式資料を確認し、GitHub Actions と npm の OIDC 利用を短いコラムに反映しました  
CI/CD や npm への公開を実行・検証した記録ではありません

| 資料 | 確認した範囲 |
| --- | --- |
| [GitHub Actions：OIDC](https://docs.github.com/en/actions/reference/security/oidc) | `id-token: write` による ID Token の取得、issuer・audience・claim を用いた信頼条件 |
| [npm：Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) | repository・workflow・environment を登録する信頼設定、OIDC を使う package 公開、利用条件 |

## 文書サイトの依存と公式資料

文書サイトは **Vite 8.3.0 / VitePress 2.0.0-alpha.20** を採用しています  
Vite 8 系を使う追加依頼に合わせた構成です  
VitePress はプレリリース版として固定し、S24–S26 に相当する以下の公式資料と[採用版のリリース](https://github.com/vuejs/vitepress/releases/tag/v2.0.0-alpha.20)を確認しました

| ID | 公式資料 | 確認に使う項目 |
| --- | --- | --- |
| S24 | [VitePress：Getting Started](https://vitepress.dev/guide/getting-started) | 採用版の環境要件、ファイル構成、開発・ビルド・プレビュー |
| S25 | [VitePress：Markdown Extensions](https://vitepress.dev/guide/markdown) | 通常の Markdown、囲み、外部ファイルからのコード取り込み |
| S26 | [VitePress：Site Config](https://vitepress.dev/reference/site-config) | `base`、出力、内部リンク検査の設定 |

Node.js **26.8.2** と pnpm **12.4.1** は `mise.toml` で固定し、VitePress の依存は `package.json` とロックファイルで管理します  
pnpm と `minimumReleaseAge: 10080`（分単位で7日間）の採用は追加の利用者指示に基づき、編集仕様の npm 初期案から変更したものです

設定の参照先は [pnpm の公式 settings](https://pnpm.io/settings) と [minimumReleaseAge の説明](https://pnpm.io/settings/dependency-resolution#minimumreleaseage) です  
これらは現在の版に追従する資料なので、将来の更新時は採用版との違いも確認します  
公開後の待機期間は依存パッケージを選ぶ際の条件であり、安全性を証明するものではありません  
インストール・ビルド・表示の実行結果は、資料の確認と区別して制作記録へ残します


## OIDC の3フローとシーケンス図

2026-09-21 に OIDC Core errata set 2 の [Code Flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth)、[Implicit Flow](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitFlowAuth)、[Hybrid Flow](https://openid.net/specs/openid-connect-core-1_0.html#HybridFlowAuth) を確認しました  
6種類の response_type、認可応答とコード交換の返却値、nonce・at_hash・c_hash の条件を本文の比較表と自作 SVG 図へ反映しています  
採用判断には [RFC 9700 §2.1.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1.2) を併記し、仕様上のフローと教材の Code + PKCE 採用を区別します  
図は通信の説明であり、Implicit・Hybrid の実装や相互接続を実証したものではありません


## IdP とユーザー管理の分離

2026-09-21 に [OIDC Core §3.1.2.3](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequestAuthentication) の OP 内部の認証、[§5.7](https://openid.net/specs/openid-connect-core-1_0.html#ClaimStability) の識別子の安定性、[RFC 7644 §1・§3](https://www.rfc-editor.org/rfc/rfc7644.html#section-1) の SCIM、[RFC 7662 §4](https://www.rfc-editor.org/rfc/rfc7662.html#section-4) の照会結果のキャッシュを確認しました  
サービスの配置・データの管理責任・同期・障害時の動作は教材上の設計例であり、OIDC の必須アーキテクチャや traQ の実証済み構成とは扱いません
