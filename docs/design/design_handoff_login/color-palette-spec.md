# カラーパレット仕様書 — 保険代理店向けCRM

採用案: バーガンディ & ウォームグレー（高級感・落ち着き）

このドキュメントは、デザインを担当するAI（Claude.aiのDesign/Cowork機能など）にそのまま渡して、UIコンポーネントやCSS変数の実装に使用できる形式でまとめたものです。

---

## 1. ブランドカラー（ベースパレット）

| トークン名 | 用途 | HEX | 補足 |
|---|---|---|---|
| `color-primary` | ヘッダー、サイドバー、見出しなど基調色 | `#3F2E2E` | 深いブラウン系。最も濃い基調色 |
| `color-primary-light` | primaryのホバー/サブ領域 | `#5A4444` | primaryより一段明るいバリエーション |
| `color-accent` | アクセント、選択状態、リンク、強調テキスト | `#7C3F42` | バーガンディ。ブランドの個性を出す色 |
| `color-accent-light` | accentの淡色版（バッジ背景など） | `#F1DEE0` | accentの薄い背景バリエーション |
| `color-sub` | 補助的な装飾、区切り線、非アクティブ要素 | `#C7B7AE` | ウォームグレーがかったベージュ |
| `color-highlight` | 重要情報のハイライト、注目バッジ | `#A98445` | ゴールド寄りのアンバー。多用しない |
| `color-background` | ページ全体の背景 | `#F5EFEA` | ウォームホワイト。白すぎない落ち着いた背景 |
| `color-surface` | カード、パネルなどの前面要素の背景 | `#FFFFFF` | 背景より明るい純白で前面要素を視覚的に分離 |
| `color-text-primary` | 本文・見出しテキスト | `#45403D` | 黒よりやわらかいダークグレー |
| `color-text-secondary` | 補足テキスト、ラベル | `#7A7066` | テキストの階層用 |
| `color-border` | 標準の境界線 | `#E0D6CD` | カード・入力欄などの枠線 |

### 使用ガイド
- `primary`はヘッダーやナビゲーションなど画面の骨格部分に使用し、本文エリアには使わない。
- `accent`はボタン、選択中タブ、リンクなど「操作可能・注目してほしい」要素に限定して使用する。
- `highlight`（ゴールド系）は乱用すると安っぽくなるため、VIP顧客マークや重要フラグなど、画面に1〜2箇所程度の使用に留める。
- 背景は`background`（ページ全体）と`surface`（カード等の前面）の2段階を使い分けることで、奥行きのある画面構成にする。

---

## 2. ステータス信号色（業務ステータス専用）

CRM上での契約・対応状況などを一目で判別するための信号色です。ブランドカラーとは独立した色相を採用し、混同を避けています。各ステータスは「背景色（淡）」「テキスト/アイコン色（濃）」「境界線色」の3段階セットです。

| ステータス例 | トークン名 | 背景色 | テキスト/アイコン色 | 境界線色 |
|---|---|---|---|---|
| 成立・完了（契約成立、対応完了など） | `status-success` | `#E3F0E1` | `#2E6B3E` | `#A9CDA4` |
| 進行中・商談中 | `status-progress` | `#E6F0F7` | `#2C5F8A` | `#A9C8DD` |
| 保留・確認待ち | `status-pending` | `#FBF0DC` | `#8A6118` | `#E8C988` |
| 要対応・期限間近 | `status-warning` | `#FBE8DC` | `#A14A1E` | `#EDB592` |
| 失効・エラー・否決 | `status-danger` | `#FAE2E2` | `#A12E2E` | `#E8A8A8` |
| 非アクティブ・対象外 | `status-neutral` | `#EDEAE6` | `#6B6259` | `#D2C9BF` |

### 使用ガイド
- 各ステータスは「淡い背景＋濃い文字」のバッジ形式が基本（例: 契約一覧の右端にステータスバッジを表示）。
- アイコンを併用する場合はテキスト/アイコン色と同じ色を使う。
- 信号色をボタンや見出しなど大きな面積に使わない。あくまで「状態を示すラベル」としての使用に限定する。
- 色だけでなく、アイコンの形（チェック・時計・三角マークなど）も併用し、色覚多様性に配慮する。

---

## 3. CSS変数（実装用）

```css
:root {
  /* ブランドカラー */
  --color-primary: #3F2E2E;
  --color-primary-light: #5A4444;
  --color-accent: #7C3F42;
  --color-accent-light: #F1DEE0;
  --color-sub: #C7B7AE;
  --color-highlight: #A98445;
  --color-background: #F5EFEA;
  --color-surface: #FFFFFF;
  --color-text-primary: #45403D;
  --color-text-secondary: #7A7066;
  --color-border: #E0D6CD;

  /* ステータス信号色 */
  --status-success-bg: #E3F0E1;
  --status-success-text: #2E6B3E;
  --status-success-border: #A9CDA4;

  --status-progress-bg: #E6F0F7;
  --status-progress-text: #2C5F8A;
  --status-progress-border: #A9C8DD;

  --status-pending-bg: #FBF0DC;
  --status-pending-text: #8A6118;
  --status-pending-border: #E8C988;

  --status-warning-bg: #FBE8DC;
  --status-warning-text: #A14A1E;
  --status-warning-border: #EDB592;

  --status-danger-bg: #FAE2E2;
  --status-danger-text: #A12E2E;
  --status-danger-border: #E8A8A8;

  --status-neutral-bg: #EDEAE6;
  --status-neutral-text: #6B6259;
  --status-neutral-border: #D2C9BF;
}
```

---

## 4. デザインAIへの指示文（コピー用）

以下はそのままデザイン担当のClaudeに貼り付けて使える説明文です。

> 保険代理店向けの業務CRMシステムをデザインしています。カラーパレットは上記のCSS変数を使用してください。基調色（primary）はヘッダーやナビゲーションなど画面の骨格部分に、アクセント色（accent）はボタンやリンクなど操作要素に限定して使用してください。ハイライト色（highlight、ゴールド系）は多用せず、重要マークなど画面に1〜2箇所程度に留めてください。背景はbackground（ページ全体）とsurface（カードなど前面要素）を使い分けて奥行きを出してください。契約状況や対応ステータスを表示する箇所では、上記のステータス信号色（success/progress/pending/warning/danger/neutral）を、淡い背景色＋濃い文字色のバッジ形式で使用してください。全体として落ち着いた、長時間の業務利用でも疲れにくい配色を心がけてください。
