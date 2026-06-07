# 01. 認証 (Auth)

JWT アクセストークン + リフレッシュトークンによる認証を提供する。

- ソース: `packages/api/src/auth/`
- 接頭辞: `/auth`

## 関連モデル

| モデル | 用途 |
|--------|------|
| `User` | 認証主体。`email`（全体ユニーク）, `passwordHash`, `status`, `userType`, `tenantId` |
| `RefreshToken` | リフレッシュトークンの保存。`tokenHash`(bcrypt), `expiresAt`, `revokedAt` |

## トークン設計

### アクセストークン（JWT）
- 署名鍵: 環境変数 `JWT_ACCESS_SECRET`（未設定時 `"dev_secret"`）
- 有効期限: `ACCESS_TOKEN_TTL`（既定 `15m`、`JwtModule` 設定値）
- ペイロード: `{ sub: userId, tenantId, email, userType, iat, exp }`
- 検証: `JwtStrategy` が署名・期限を検証後、`sub`+`tenantId`+`deletedAt:null` で User を再照会。
  存在しなければ 401。**JWT が有効でも、ユーザーが論理削除されていればアクセス不可**。

### リフレッシュトークン（自前）
- 形式: `"<refreshTokenId>.<secret>"`（`secret` は 48 バイトの base64url 乱数）
- DB には `secret` の bcrypt ハッシュのみ保存（平文は保持しない）
- 有効期限: `REFRESH_TOKEN_TTL_DAYS` 日（既定 30）
- **ワンタイム・ローテーション方式**: `refresh` 成功時に旧トークンを `revokedAt` で失効させ、新しいアクセス/リフレッシュトークンを発行

## エンドポイント

### POST `/auth/login`
メール＋パスワードでログインする。**認証不要**。

リクエスト:
```json
{ "email": "admin@example.com", "password": "ChangeMe123!" }
```
| フィールド | 規則 |
|-----------|------|
| `email` | email 形式 |
| `password` | 8 文字以上 |

処理:
1. `email` で User を検索（テナント横断・email は全体ユニーク）
2. 論理削除済み（`deletedAt != null`）→ 401
3. 不在 または `status != ACTIVE`（=`SUSPENDED`）→ 401
4. bcrypt でパスワード照合失敗 → 401
5. アクセス/リフレッシュトークンを発行

レスポンス 200:
```json
{
  "user": { "id","tenantId","email","name","status","userType","createdAt","updatedAt" },
  "accessToken": "<JWT>",
  "refreshToken": "<id>.<secret>",
  "expiresAt": "2026-07-06T00:00:00.000Z"
}
```
> `expiresAt` は**リフレッシュトークン**の失効時刻。`passwordHash` は返さない。
> エラーメッセージは一律 `"Invalid credentials"`（ユーザー存在の有無を秘匿）。

### POST `/auth/refresh`
リフレッシュトークンを新しいトークン一式に交換する。**認証不要**。

リクエスト: `{ "refreshToken": "<id>.<secret>" }`（`refreshToken` は 1 文字以上）

処理:
1. `"<id>.<secret>"` を分解（形式不正→401）
2. `id` で `RefreshToken` を取得（User を join）
3. 不在 / 失効済み（`revokedAt != null`）/ 期限切れ（`expiresAt <= now`）→ 401
4. bcrypt で `secret` 照合失敗 → 401
5. 旧トークンを `revokedAt = now` に更新（再利用不可化）
6. 新トークン一式を発行して返す

レスポンス 200: `{ accessToken, refreshToken, expiresAt }`（`user` は含まない）

### POST `/auth/logout`
リフレッシュトークンを失効させる。**認証不要**。

リクエスト: `{ "refreshToken": "<id>.<secret>" }`

処理: `id` かつ `revokedAt: null` のトークンを `revokedAt = now` で更新（`updateMany`）。
**常に成功**（存在しなくても 200）。レスポンス: `{ "status": "ok" }`

### GET `/auth/me`
自己情報を返す。**JWT 必須**（`JwtAuthGuard`）。

処理: JWT の `sub`+`tenantId`+`deletedAt:null` で User を再照会。不在なら 401。
レスポンス 200: sanitize 済み User オブジェクト（login の `user` と同形）。

## 設計上の注意・既知の論点

- **`logout` はアクセストークンを失効できない**: JWT はステートレスのため、ログアウト後も
  アクセストークンは期限（既定 15 分）まで有効。リフレッシュトークンのみ無効化される。
- **`refresh` はテナント横断で成立**: トークン ID さえ有効なら、テナントに関係なく新トークンを発行する
  （所有者 User の `tenantId` をそのまま引き継ぐ）。
- **`refresh`/`me` は User の `status` を再チェックしない**: ログイン後に `SUSPENDED` 化されても、
  既存リフレッシュトークンでアクセス継続が可能（`deletedAt` のみがチェック対象）。改善余地あり。
- **パスワードハッシュ**: bcrypt、コストファクタ 12。
</content>
