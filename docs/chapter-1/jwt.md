# JWT を読む

::: tip このページの目標

JWT の見た目と読める範囲を知り、内容を読めることと信用できることを区別できるようになる

:::

::: info このページの要点

- **形式**：署名付き JWT は `header.payload.signature` のような三部分を持つ
- **デコード**：header / payload は base64url を戻すと JSON として読める
- **信頼**：base64url は暗号化ではなく、読めても内容は未検証である
- **用途**：OAuth の Access Token は必ずしも JWT ではなく、OIDC の ID Token で詳しく扱う

:::

JWT（JSON Web Token）は、これから繰り返し登場するデータ形式です  
ここでは署名付きの compact 形式を見てみます  
JWT には暗号化する形式もありますが、まず次の三部分を読むところから始めます [RFC 7519 §3](https://www.rfc-editor.org/rfc/rfc7519.html#section-3)

```text
header.payload.signature
```

これは構造の模式図です  
実際には、ヘッダーとペイロードを base64url で表現した文字列と署名値が、`.` で区切られます  
ヘッダーは形式や方式の情報、ペイロードは JSON で表した主張を含みます  
教材データをデコードすると次の JSON が読めます [RFC 7515 §3.1](https://www.rfc-editor.org/rfc/rfc7515.html#section-3.1)

<<< @/../examples/jose/header.json{json}

<<< @/../examples/jose/payload.json{json}

今はそれぞれの項目の正当性を判断する必要はありません  
秘密鍵がなくても内容を読めること、JSON を書き換えて同じ形式の文字列を作れることがポイントです  
base64url は文字列への表現方法であり、暗号化ではありません  
読めることや JSON の形が整っていることだけでは、発行者がその内容を保証したとは判断できません

署名を表現する仕様を JWS、鍵を JSON で表す形式を JWK、その集合を JWKS と呼びます  
署名の検証、鍵の選択、主張の検証は、第3章の [ID Token](../chapter-3/id-token.md) で本格的に扱います  
OAuth の Access Token は JWT に限定されず、[第2章](../chapter-2/access-token.md) では中身を解釈しない opaque token を設計例にします

ここまで読んだら、[実習：JWT を読んでみる](../practice/#jwt-reading) で、同じ教材データを分割・デコード・書き換えてみます
