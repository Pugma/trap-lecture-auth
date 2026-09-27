# コラム：GitHub Actions の OIDC

::: tip このページの目標

GitHub Actions が発行する ID Token を利用した CI/CD の認証と、npm への公開に使う Trusted Publishing の関係を説明できるようになる

:::

::: info このページの要点

- GitHub Actions の job は、許可を与えると短命の OIDC ID Token を要求できる
- トークンを受け取るサービスは、issuer、audience、リポジトリや workflow などの信頼条件を検証する
- npm の Trusted Publishing は、登録済みの GitHub Actions workflow からの `npm publish` を OIDC で認証する
- `id-token: write` は GitHub に token 発行を許可する設定であり、公開先での認可設定を置き換えるものではない

:::

OIDC は利用者がサービスへログインする場面だけに使われるものではありません  
CI/CD の workflow も、一時的な資格情報を使って「どの自動処理か」を示せます  
GitHub Actions では job に `id-token: write` の権限を与えると、GitHub の OIDC Provider から短命の ID Token を取得できます  
この権限は GitHub に token の発行を許すものであり、外部サービスがその job を信頼する設定とは別です  
[GitHub Actions の OIDC](https://docs.github.com/en/actions/reference/security/oidc)

npm の [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) は、この仕組みを package の公開に使う例です  
npm 側で、公開を許す GitHub の組織または利用者、リポジトリ、workflow ファイル名を登録します  
必要に応じて environment も条件にできます  
workflow が `npm publish` を実行すると、npm は token の issuer、audience と、登録した信頼条件に合うことを確認して公開を認めます

流れを簡略化すると、次のようになります

1. package の管理者が npm に信頼する GitHub repository と workflow を登録する
2. workflow の job が `id-token: write` を持ち、GitHub に ID Token を要求する
3. `npm publish` がその token を npm へ提示する
4. npm が token と登録済みの条件を検証し、条件に合う package の公開だけを認める

この構成では、公開専用の長期 npm token を workflow の secret として配る必要を減らせます  
一方で、repository だけを広く信頼するのではなく、公開を担当する workflow や environment まで条件を絞ることが重要です  
これは、token の検証結果を「どの自動処理に、どの操作を許すか」という認可判断へ結び付ける設計です

Trusted Publishing は package の公開時の認証方法です  
private package を取得するための読み取り権限など、別の目的の資格情報まで不要にするものではありません  
利用できる runner や npm CLI の条件は更新され得るため、導入時は npm の公式資料で確認します

## 確認問題

**問い：GitHub Actions の job に `id-token: write` を付ければ、任意の npm package を公開できるでしょうか**

::: details 解説
できません  
この権限は GitHub が ID Token を発行するためのものです  
npm は package ごとに登録された trusted publisher の条件と token を照合します  
公開先が信頼関係と許可範囲を設定して初めて、token を公開の根拠にできます
:::
