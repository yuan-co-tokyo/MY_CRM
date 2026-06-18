# Handoff: MY CRM ログイン画面（B案 / センター集約型）

## Overview
総合保険代理店向け業務CRM「MY CRM」のログイン画面デザイン。営業担当（外交員・代理店スタッフ）が業務システムにサインインするための画面。背景の中央にログインカードを1枚配置する「センター集約 1ステップ型」フローを採用している。

実装対象リポジトリ: `yuan-co-tokyo/MY_CRM`（`packages/web` — React 19 + TypeScript + Vite）。既存の `packages/web/src/LoginPage.tsx` を、本デザインに置き換える想定。

## About the Design Files
このバンドル内の `MY CRM ログイン.dc.html` は **HTMLで作成したデザイン参照（プロトタイプ）** であり、本番コードとしてそのままコピーするものではありません。意図した見た目・挙動を示すものです。タスクは、このHTMLデザインを **対象リポジトリ（`packages/web`, React + TypeScript + Vite）の既存の環境・パターンで再現する** ことです。

- 既存の `LoginPage.tsx` は props 駆動（`loginEmail` / `setLoginEmail` / `loginPassword` / `setLoginPassword` / `loggingIn` / `error` / `onLogin`）。このインターフェースを維持したまま、内部のマークアップ/スタイルを本デザインに差し替えてください。
- ※ `MY CRM ログイン.dc.html` は内製のDesign Componentランタイム（`support.js`）で動作します。ブラウザで開けば挙動確認が可能ですが、コードはそのまま移植せず、Reactで再実装してください。

## Fidelity
**High-fidelity (hifi)**。最終的な配色・タイポグラフィ・余白・状態（エラー / ログイン中）まで確定済みのピクセルパーフェクトなモック。下記の正確な値（hex / px / weight）を用いて忠実に再現してください。

> ⚠️ **配色は新パレットを採用します。** 既存 `style.css` のオレンジ/ティール系（`--accent: #e07a2f` 等）ではなく、本ドキュメントの「バーガンディ & ウォームグレー」パレットを使用してください。`color-palette-spec.md` を同梱。

## Screens / Views

### ログイン画面（単一画面）
- **Purpose**: メールアドレスとパスワードを入力して業務システムにサインインする。
- **Layout**:
  - 画面全体: `min-height:100vh; width:100%`、背景 `#F5EFEA`、`display:flex; align-items:center; justify-content:center;`、`padding:40px`、`overflow:hidden`。
  - 装飾: 左上と右下に薄いブランドの放射状グラデーション円（下記参照）。装飾なので省略可。
  - 左上にブランドロゴ（`position:absolute; top:34px; left:44px`）。
  - 中央にログインカード（幅 `448px`）。
  - 下部中央にフッターのコピーライト（`position:absolute; bottom:26px`）。

#### コンポーネント

**ブランドロゴ（左上）**
- レイアウト: `display:flex; align-items:center; gap:12px`
- マーク: `28×28px`、`background:#3F2E2E`、`transform:rotate(45deg)`（ダイヤ型）、`border-radius:5px`
- ワードマーク: テキスト「MY CRM」、`font-size:17px; font-weight:700; color:#3F2E2E; letter-spacing:0.04em`

**ログインカード**
- `width:448px; background:#FFFFFF; border:1px solid #E0D6CD; border-radius:16px; box-shadow:0 18px 50px rgba(63,46,46,0.10); padding:52px 48px`

**カード見出し（中央寄せ）**
- 上段ラベル: テキスト「Insurance Agency CRM」、`font-size:12px; font-weight:600; letter-spacing:0.18em; color:#7C3F42; text-transform:uppercase`
- タイトル: テキスト「ログイン」、`margin-top:14px; font-size:24px; font-weight:700; color:#45403D; letter-spacing:0.02em`
- ※ サブテキストは無し（意図的に削除済み）。

**エラーバナー（`error` がある時のみ表示）**
- コンテナ: `margin-top:28px; display:flex; align-items:flex-start; gap:10px; padding:12px 14px; background:#FAE2E2; border:1px solid #E8A8A8; border-radius:8px`
- アイコン: `18×18px` 円、`background:#A12E2E; color:#fff`、中央に「!」（`font-size:12px; font-weight:700`）
- メッセージ: `font-size:13px; color:#A12E2E; line-height:1.6`。デフォルト文言「メールアドレスまたはパスワードが正しくありません。」（実際は `error` prop の内容を表示）

**メールアドレス入力**
- ラベル: テキスト「メールアドレス」、`font-size:13px; font-weight:600; color:#7A7066; margin-bottom:8px; letter-spacing:0.02em`、`display:block`
- 入力: `type=email`、placeholder `admin@example.com`
- 入力スタイル（共通）: `width:100%; height:54px; padding:0 16px; border:1px solid #E0D6CD; border-radius:8px; background:#FFFFFF; font-size:15px; color:#45403D`
- focus: `border-color:#7C3F42; box-shadow:0 0 0 3px rgba(124,63,66,0.10)`（`transition:border-color .15s, box-shadow .15s`）
- placeholder色: `#B8ACA0`
- フィールド間隔: 上のブロックから `margin-top:32px`

**パスワード入力**
- 上部行: `display:flex; justify-content:space-between; align-items:center; margin-bottom:8px`
  - ラベル: テキスト「パスワード」、メールラベルと同スタイル
  - 表示切替ボタン: テキスト「表示」⇄「非表示」、`border:none; background:none; font-size:12px; font-weight:600; color:#7C3F42; cursor:pointer`。クリックで input の `type` を `password`⇄`text` 切替。
- 入力: placeholder「パスワードを入力」、スタイルはメールと共通。
- ブロック間隔: `margin-top:22px`

**オプション行**（`margin-top:18px; display:flex; justify-content:space-between; align-items:center`）
- 左: チェックボックス「ログイン状態を保持」。`<label>` 内に `<input type=checkbox>`（`16×16px; accent-color:#7C3F42`）+ テキスト（`font-size:13px; color:#7A7066`）、`display:flex; align-items:center; gap:9px`。
  - ⚠️ **未実装でOK。今後実装予定のためUIは残すこと。**
- 右: リンク「パスワードをお忘れですか？」、`font-size:13px; font-weight:600; color:#7C3F42; text-decoration:none`。
  - ⚠️ **未実装でOK。今後実装予定のためUIは残すこと。**

**ログインボタン**
- `margin-top:30px; width:100%; height:54px; border:none; border-radius:8px; color:#fff; font-size:16px; font-weight:600; letter-spacing:0.06em; transition:background .15s`
- 通常: `background:#7C3F42; cursor:pointer`、テキスト「ログイン」
- hover: `background:#6A3539`
- ログイン中（`loggingIn` / loading true）: `background:#A98F8F; cursor:not-allowed`、`disabled`、テキスト「サインイン中…」、hoverも `#A98F8F`

**セキュア表示**（`margin-top:26px; display:flex; align-items:center; justify-content:center; gap:7px`）
- ドット: `6×6px` 円、`background:#2E6B3E`
- テキスト: 「SSL暗号化により通信は保護されています」、`font-size:12px; color:#9A8F84`

**フッター**
- `position:absolute; bottom:26px; left:0; right:0; text-align:center; font-size:12px; color:#9A8F84`
- テキスト: 「© 2026 MY CRM ・ 総合保険代理店 業務支援システム」

**背景装飾（任意）**
- 左上: `position:absolute; width:680px; height:680px; border-radius:50%; background:radial-gradient(circle, rgba(124,63,66,0.06), rgba(124,63,66,0) 70%); top:-220px; left:-180px`
- 右下: `width:560px; height:560px; ... background:radial-gradient(circle, rgba(63,46,46,0.05), rgba(63,46,46,0) 70%); bottom:-200px; right:-150px`
- 両方 `pointer-events:none`

## Interactions & Behavior
- **パスワード表示切替**: 「表示/非表示」ボタンで該当 input の `type` を `password`⇄`text`。ローカル state（例: `showPw`）。
- **エラー表示**: `error`（string）が空でなければエラーバナーを表示。文言は `error` の内容。
- **ログイン中**: `loggingIn`（boolean）true の間、ボタンを `disabled`・文言「サインイン中…」・配色 `#A98F8F` に。
- **送信**: ボタンクリックで `onLogin()`。既存実装同様、パスワード入力での Enter キーでも `onLogin()` を発火させると親切（既存 `LoginPage.tsx` 踏襲）。
- **focus**: 入力欄フォーカス時に accent ボーダー + リング（上記）。
- **hover**: ログインボタン `#7C3F42 → #6A3539`、リンク類はカーソルポインタ。
- レスポンシブ: カードは固定 `448px`。狭幅時は `padding` により自然に縮む程度で可（モバイル最適化は今回スコープ外）。

## State Management
- 親（`App.tsx`）が保持: `loginEmail`, `loginPassword`, `loggingIn`, `error`、`onLogin` ハンドラ（既存通り）。
- 画面ローカル: `showPw`（パスワード表示切替）。
- 「ログイン状態を保持」「パスワードをお忘れですか？」は **UIのみ**（state/挙動は今後実装）。

## Design Tokens

### ブランドカラー
| 用途 | hex |
|---|---|
| primary（骨格・ロゴ・見出し基調） | `#3F2E2E` |
| primary-light | `#5A4444` |
| accent（ボタン・リンク・操作要素） | `#7C3F42` |
| accent hover（ボタン押下色） | `#6A3539` |
| accent-light（淡色背景） | `#F1DEE0` |
| sub（区切り・非アクティブ） | `#C7B7AE` |
| highlight（ゴールド / 重要マークのみ・多用しない） | `#A98445` |
| background（ページ背景） | `#F5EFEA` |
| surface（カード等前面） | `#FFFFFF` |
| text-primary（本文・見出し） | `#45403D` |
| text-secondary（ラベル・補足） | `#7A7066` |
| text-tertiary（フッター・補助、本画面で使用） | `#9A8F84` |
| border（境界線） | `#E0D6CD` |
| placeholder | `#B8ACA0` |
| disabled button | `#A98F8F` |

### ステータス信号色（本画面ではエラー / セキュアドットで使用、CRM全体で使用）
| ステータス | bg | text/icon | border |
|---|---|---|---|
| success | `#E3F0E1` | `#2E6B3E` | `#A9CDA4` |
| progress | `#E6F0F7` | `#2C5F8A` | `#A9C8DD` |
| pending | `#FBF0DC` | `#8A6118` | `#E8C988` |
| warning | `#FBE8DC` | `#A14A1E` | `#EDB592` |
| danger（本画面のエラーで使用） | `#FAE2E2` | `#A12E2E` | `#E8A8A8` |
| neutral | `#EDEAE6` | `#6B6259` | `#D2C9BF` |

業務ステータスは「淡い背景＋濃い文字＋境界線」のバッジ形式で使用（色だけでなくアイコン形状も併用し色覚多様性に配慮）。

### Typography
- フォント: **Noto Sans JP**（Google Fonts、weights 400/500/600/700）。`font-family: 'Noto Sans JP', sans-serif`
- スケール（本画面）: 見出し24/700、ボタン16/600、入力15/400、本文13–14、ラベル13/600、補助12。
- letter-spacing: ラベル `0.02em`、eyebrow `0.18em`、ロゴ `0.04em`、ボタン `0.06em`。

### Spacing / Radius / Shadow
- カード padding: `52px 48px`。フィールド高さ: `54px`。要素間隔: 22–32px。
- border-radius: カード `16px`、入力/ボタン/バナー `8px`、ロゴマーク `5px`、円形要素 `50%`。
- shadow: カード `0 18px 50px rgba(63,46,46,0.10)`、focusリング `0 0 0 3px rgba(124,63,66,0.10)`。

## Assets
- 専用画像アセットなし。ロゴはCSS図形（回転した角丸正方形 = ダイヤ型）＋ テキストワードマークで構成。実装時に正式ロゴがあれば差し替え可。
- アイコン類（エラーの「!」、表示切替、セキュアドット）はテキスト/CSS図形で表現。コードベースに既存アイコンライブラリがあればそれに合わせて差し替え可。

## Screenshots
`screenshots/` に各状態のスクリーンショットを同梱。
- `login-default.jpg` — 通常状態
- `login-error.jpg` — エラー状態（`error` あり）
- `login-loading.jpg` — ログイン中（`loggingIn` = true）

※ スクリーンショットはWebフォント読込のタイミングによりフォントがフォールバック表示される場合があります。最終的な見た目は `MY CRM ログイン.dc.html` をブラウザで開いて確認してください（Noto Sans JP）。

## Files
- `MY CRM ログイン.dc.html` — デザイン参照（プロトタイプ本体）。`support.js` と同階層に置けばブラウザでそのまま挙動確認可能。
- `support.js` — プロトタイプ実行用ランタイム（移植不要・参照のみ）。
- `color-palette-spec.md` — カラーパレット仕様書（CSS変数の元データ）。
- `screenshots/` — 各状態のスクリーンショット。
