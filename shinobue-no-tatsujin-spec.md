# 篠笛の達人 — Shinobue no Tatsujin

## Claude Code Agents 向け開発仕様書

---

## 🎯 プロジェクト概要

「篠笛の達人」は、篠笛（しのぶえ）の練習・上達を支援するWebアプリケーションである。
「太鼓の達人」のようなリズムゲーム的UIで、篠笛の演奏をリアルタイム判定し、楽しみながら上達できる体験を提供する。

### コンセプト
- **マイクから篠笛の音をリアルタイム検出** し、正しい音程・タイミングで吹けているかを判定
- **譜面（楽譜）が画面上を流れ**、プレイヤーはタイミングに合わせて正しい指使い・音程で演奏する
- 練習モード、ゲームモード、自由演奏モードを備える
- 楽譜の取り込み（MusicXML / MIDI）、手動作成、編集が可能

---

## 🏗️ 技術スタック

```
Frontend:  React 18+ / TypeScript / Vite
Audio:     Web Audio API + AudioWorklet
Pitch:     autocorrelation (YIN algorithm) をカスタム実装
Score:     MusicXML パーサー (自前) + MIDI パーサー (tone.js/midi)
State:     Zustand
Styling:   Tailwind CSS 4
Canvas:    HTML5 Canvas (譜面のスクロール描画)
Testing:   Vitest + Playwright
```

> **制約**: 外部の有料APIやバックエンドサーバーは使わない。すべてブラウザ内で完結させる。

---

## 📁 ディレクトリ構成

```
shinobue-no-tatsujin/
├── public/
│   ├── songs/              # サンプル楽曲の MusicXML / MIDI
│   └── sounds/             # UI効果音 (判定音など)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── assets/             # 画像・フォント
│   ├── components/
│   │   ├── common/         # 汎用UI (Button, Modal, etc.)
│   │   ├── game/           # ゲーム画面関連
│   │   │   ├── GameScreen.tsx
│   │   │   ├── NoteHighway.tsx       # 譜面スクロール (Canvas)
│   │   │   ├── JudgementDisplay.tsx  # 判定表示 (良・可・不可)
│   │   │   ├── ScoreBoard.tsx        # スコア・コンボ表示
│   │   │   ├── FingerChart.tsx       # 運指図表示
│   │   │   └── PitchMeter.tsx        # リアルタイム音程メーター
│   │   ├── editor/         # 楽譜エディタ
│   │   │   ├── ScoreEditor.tsx
│   │   │   ├── NoteInput.tsx
│   │   │   ├── MeasureView.tsx
│   │   │   └── EditorToolbar.tsx
│   │   ├── practice/       # 練習モード
│   │   │   ├── PracticeScreen.tsx
│   │   │   ├── TunerView.tsx         # チューナー画面
│   │   │   ├── LongTonePractice.tsx  # ロングトーン練習
│   │   │   └── ScalePractice.tsx     # 音階練習
│   │   ├── library/        # 楽曲ライブラリ
│   │   │   ├── SongList.tsx
│   │   │   ├── SongCard.tsx
│   │   │   └── ImportDialog.tsx
│   │   └── settings/       # 設定画面
│   │       └── SettingsScreen.tsx
│   ├── audio/
│   │   ├── AudioEngine.ts         # マイク入力管理
│   │   ├── PitchDetector.ts       # YIN アルゴリズム音程検出
│   │   ├── PitchProcessor.worklet.ts  # AudioWorklet
│   │   ├── NoteClassifier.ts      # 検出周波数 → 篠笛の音名マッピング
│   │   └── OnsetDetector.ts       # 音の立ち上がり検出
│   ├── game/
│   │   ├── GameEngine.ts          # ゲームループ・判定ロジック
│   │   ├── TimingJudge.ts         # タイミング判定
│   │   ├── ScoreCalculator.ts     # スコア計算
│   │   └── ComboManager.ts        # コンボ管理
│   ├── score/
│   │   ├── ScoreParser.ts         # MusicXML / MIDI パーサー
│   │   ├── ScoreModel.ts          # 内部楽譜データモデル
│   │   ├── ScoreRenderer.ts       # Canvas 描画
│   │   ├── ScoreExporter.ts       # MusicXML エクスポート
│   │   └── ShinobueNotation.ts    # 篠笛特有の記譜 (数字譜対応)
│   ├── shinobue/
│   │   ├── ShinobueConfig.ts      # 篠笛の調・音域定義
│   │   ├── FingeringChart.ts      # 運指表データ
│   │   └── Ornaments.ts           # 装飾音 (打ち指、すり上げ等)
│   ├── store/
│   │   ├── gameStore.ts
│   │   ├── settingsStore.ts
│   │   └── libraryStore.ts
│   ├── hooks/
│   │   ├── useAudioInput.ts
│   │   ├── usePitchDetection.ts
│   │   ├── useGameLoop.ts
│   │   └── useScoreEditor.ts
│   ├── utils/
│   │   ├── frequency.ts           # 周波数 ↔ 音名変換
│   │   ├── timing.ts              # BPM・拍管理
│   │   └── storage.ts             # IndexedDB ラッパー
│   └── types/
│       ├── music.ts               # 音楽関連の型定義
│       ├── game.ts                # ゲーム関連の型定義
│       └── shinobue.ts            # 篠笛固有の型定義
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── README.md
```

---

## 🎵 篠笛の音楽的仕様

### 篠笛の基本

篠笛は調子（キー）によって音域が異なる。最も一般的な **六本調子** と **七本調子** を優先サポートする。

```typescript
// src/shinobue/ShinobueConfig.ts

export interface ShinobueKey {
  name: string;           // "六本調子", "七本調子" etc.
  baseNote: string;       // 筒音 (全閉) の音名
  baseFrequency: number;  // 筒音の周波数 (Hz)
  range: {                // 音域
    lowest: number;       // 最低音の周波数
    highest: number;      // 最高音の周波数 (大甲含む)
  };
}

// 六本調子: 筒音 = A4 付近
// 七本調子: 筒音 = B4 付近
// 八本調子: 筒音 = C5 付近

export const SHINOBUE_KEYS: Record<string, ShinobueKey> = {
  "roku": {   // 六本調子
    name: "六本調子",
    baseNote: "A4",
    baseFrequency: 440,
    range: { lowest: 440, highest: 2640 }
  },
  "nana": {   // 七本調子
    name: "七本調子",
    baseNote: "B4",
    baseFrequency: 494,
    range: { lowest: 494, highest: 2960 }
  },
  "hachi": {  // 八本調子
    name: "八本調子",
    baseNote: "C5",
    baseFrequency: 523,
    range: { lowest: 523, highest: 3136 }
  }
};
```

### 篠笛の音名体系（数字譜）

篠笛は伝統的に **数字譜** を使う。洋楽譜と数字譜の両方に対応すること。

```typescript
// 篠笛の音名 (七本調子の場合)
// 呂音 (低音域): 一 二 三 四 五 六 七
// 甲音 (高音域): 一 二 三 四 五 六 七  (息の強さで1オクターブ上)
// 大甲 (最高音域): 一 二 三 (さらに上)

export interface ShinobueNote {
  number: number;       // 1-7 (一〜七)
  register: 'ro' | 'kan' | 'daikan';  // 呂・甲・大甲
  fingering: boolean[]; // 7つの指穴の開閉 [1穴, 2穴, ..., 7穴]
  frequency: number;    // 基準周波数
  western: string;      // 西洋音名 (例: "B4", "C#5")
}
```

### 運指表 (Fingering Chart)

```typescript
// src/shinobue/FingeringChart.ts
// true = 穴を塞ぐ, false = 穴を開ける
// 指穴は左手 (裏穴なし) から右手へ [1, 2, 3, 4, 5, 6, 7]

export const FINGERING_CHART_NANA: ShinobueNote[] = [
  // 呂音
  { number: 0, register: 'ro', fingering: [true,true,true,true,true,true,true],   western: 'B4',  name: '筒音' },
  { number: 1, register: 'ro', fingering: [true,true,true,true,true,true,false],  western: 'C#5', name: '一' },
  { number: 2, register: 'ro', fingering: [true,true,true,true,true,false,false], western: 'D5',  name: '二' },
  { number: 3, register: 'ro', fingering: [true,true,true,true,false,false,false],western: 'E5',  name: '三' },
  { number: 4, register: 'ro', fingering: [true,true,true,false,false,false,false],western:'F#5', name: '四' },
  { number: 5, register: 'ro', fingering: [true,true,false,false,false,false,false],western:'G5', name: '五' },
  { number: 6, register: 'ro', fingering: [true,false,false,false,false,false,false],western:'A5',name: '六' },
  { number: 7, register: 'ro', fingering: [false,false,false,false,false,false,false],western:'B5',name:'七' },
  // 甲音 (同じ運指、息を強く)
  { number: 1, register: 'kan', fingering: [true,true,true,true,true,true,false],  western: 'C#6', name: '甲一' },
  { number: 2, register: 'kan', fingering: [true,true,true,true,true,false,false], western: 'D6',  name: '甲二' },
  { number: 3, register: 'kan', fingering: [true,true,true,true,false,false,false],western: 'E6',  name: '甲三' },
  { number: 4, register: 'kan', fingering: [true,true,true,false,false,false,false],western:'F#6', name: '甲四' },
  { number: 5, register: 'kan', fingering: [true,true,false,false,false,false,false],western:'G6', name: '甲五' },
  { number: 6, register: 'kan', fingering: [true,false,false,false,false,false,false],western:'A6',name: '甲六' },
  { number: 7, register: 'kan', fingering: [false,false,false,false,false,false,false],western:'B6',name:'甲七' },
  // 大甲
  { number: 1, register: 'daikan', fingering: [true,true,true,true,true,true,false], western: 'C#7', name: '大甲一' },
  { number: 2, register: 'daikan', fingering: [true,true,true,true,true,false,false],western: 'D7',  name: '大甲二' },
  { number: 3, register: 'daikan', fingering: [true,true,true,true,false,false,false],western:'E7',  name: '大甲三' },
];
```

### 装飾音・奏法

```typescript
// src/shinobue/Ornaments.ts
export type OrnamentType =
  | 'uchiyubi'    // 打ち指: 素早く指を打つ
  | 'suriage'     // すり上げ: 下の音から滑り上げる
  | 'surisage'    // すり下げ: 上の音から滑り下げる
  | 'yuri'        // ゆり: ビブラート
  | 'muraiki'     // むら息: 噪音を混ぜた強い吹き方
  | 'nayashi'     // なやし: 音を揺らす
  | 'oshiire'     // 押し入れ: 半開きで中間音
  | 'kazashi'     // 風指: 一瞬指穴を開ける
  ;
```

---

## 🎤 音程検出システム

### アーキテクチャ

```
マイク → MediaStreamSource → AnalyserNode → AudioWorklet (PitchProcessor)
                                                    ↓
                                            YIN Algorithm
                                                    ↓
                                         周波数 + 信頼度
                                                    ↓
                                         NoteClassifier
                                                    ↓
                                    篠笛音名 + セント偏差
```

### PitchDetector (YIN アルゴリズム)

```typescript
// src/audio/PitchDetector.ts

export interface PitchResult {
  frequency: number;      // 検出周波数 (Hz)
  confidence: number;     // 信頼度 (0.0 - 1.0)
  noteNumber: number;     // MIDI ノート番号
  noteName: string;       // 音名 ("C5", "D#5")
  centOffset: number;     // 基準音からのセント偏差 (-50 ~ +50)
  timestamp: number;      // タイムスタンプ (ms)
}

/**
 * YIN アルゴリズムによるピッチ検出
 *
 * 実装要件:
 * - サンプリングレート: 44100Hz or 48000Hz
 * - バッファサイズ: 2048 samples (篠笛の音域に十分)
 * - 検出範囲: 400Hz - 4000Hz (篠笛の音域をカバー)
 * - 閾値: 0.15 (yin threshold — 低いほど厳密)
 * - フレームレート: 60fps以上でUI更新
 *
 * 篠笛特有の考慮事項:
 * - 息の音（ノイズ）と笛の音を分離する必要がある
 * - confidence が 0.85 以上の場合のみ有効な音程として扱う
 * - 連続する同一音程を平滑化（メディアンフィルタ 5フレーム）
 * - むら息などの特殊奏法時はノイズが増えるため、別途処理
 */
```

### AudioWorklet

```typescript
// src/audio/PitchProcessor.worklet.ts

/**
 * AudioWorklet で音程検出を実行
 * メインスレッドをブロックしないようにする
 *
 * 実装:
 * - process() 内でバッファを蓄積
 * - 十分なサンプル数が溜まったら YIN を実行
 * - 結果を port.postMessage() で送信
 */
```

### NoteClassifier

```typescript
// src/audio/NoteClassifier.ts

/**
 * 検出された周波数を篠笛の音名にマッピング
 *
 * 処理フロー:
 * 1. 周波数 → 最も近い篠笛の音を検索 (選択中の調子に基づく)
 * 2. セント偏差を計算
 * 3. ±50セント以内なら有効な音として認識
 * 4. 呂音/甲音/大甲の判定 (オクターブ判定)
 *
 * 注意: 篠笛は平均律とは微妙に異なる音程を持つことがある
 * 設定で「篠笛音律」と「平均律」を切り替え可能にする
 */
```

---

## 🎮 ゲームモード仕様

### 画面レイアウト

```
┌─────────────────────────────────────────────┐
│  ♪ 篠笛の達人        Score: 12,450  x32    │  ← ヘッダー (曲名・スコア・コンボ)
├─────────────────────────────────────────────┤
│                                             │
│  ══════════════════════►  ♩ ♩  ♪ ♩ ♩ ♪    │  ← ノートハイウェイ (横スクロール)
│                        ↑                    │
│                    判定ライン                 │
│                                             │
│             ◎ 良！                          │  ← 判定表示
│                                             │
├─────────────────────────────────────────────┤
│  現在の音: 甲三 (E6)  [===========|===]     │  ← 音程メーター
│                        -50    0    +50 cent │
├─────────────────────────────────────────────┤
│   ● ● ● ○ ○ ○ ○                           │  ← 次の音の運指ガイド
│   1  2  3  4  5  6  7                       │
└─────────────────────────────────────────────┘
```

### ノートハイウェイ (NoteHighway)

```typescript
// src/components/game/NoteHighway.tsx

/**
 * Canvas ベースの譜面スクロール表示
 *
 * 描画仕様:
 * - 横スクロール（右から左へ流れる）
 * - Y軸: 音程の高さ（低い音は下、高い音は上）
 * - ノートの長さ: 音符の長さに比例（四分音符、八分音符、etc.）
 * - 判定ライン: 画面左側 20% の位置に固定の縦線
 * - ノートの色:
 *   - 呂音: 青系
 *   - 甲音: 緑系
 *   - 大甲: 赤系
 *   - 休符: グレー（薄く表示）
 * - 判定後のノート:
 *   - 良: 金色に光る
 *   - 可: 白く光る
 *   - 不可: 赤くフェードアウト
 *
 * パフォーマンス:
 * - requestAnimationFrame で 60fps 描画
 * - 画面外のノートは描画しない (カリング)
 * - Canvas の OffscreenCanvas を使用（可能なら）
 */
```

### 判定ロジック

```typescript
// src/game/TimingJudge.ts

export interface JudgementResult {
  type: 'perfect' | 'great' | 'good' | 'miss';
  timingDelta: number;   // ms
  pitchDelta: number;    // cents
}

/**
 * 判定基準 (タイミング + 音程の複合判定)
 *
 * | 判定   | 日本語 | タイミング許容  | 音程許容    | スコア |
 * |--------|--------|----------------|------------|--------|
 * | Perfect| 秀     | ±30ms          | ±10 cents  | 1000   |
 * | Great  | 良     | ±60ms          | ±25 cents  | 800    |
 * | Good   | 可     | ±100ms         | ±40 cents  | 500    |
 * | Miss   | 不可   | それ以外        | それ以外    | 0      |
 *
 * - タイミングと音程の両方が条件を満たす必要がある
 * - 休符中に音が出ていたら減点（オプション）
 * - 装飾音はボーナスポイント
 * - コンボ倍率: 10コンボごとに x0.1 加算 (最大 x2.0)
 */
```

### 難易度設定

```typescript
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'master';

/**
 * 難易度による変化:
 *
 * | 設定           | 初心者  | 中級    | 上級    | 達人    |
 * |---------------|---------|---------|---------|---------|
 * | スクロール速度  | 遅い    | 普通    | 速い    | 非常に速い|
 * | 判定の厳しさ    | 緩い    | 普通    | 厳しい  | 非常に厳しい|
 * | 装飾音の要求    | なし    | 一部    | 多い    | すべて   |
 * | 運指ガイド      | 常時表示| 常時表示| 次の音のみ| 非表示  |
 * | 音程メーター    | 大きい  | 普通    | 小さい  | 非表示   |
 * | 呂音/甲音のみ   | 呂音のみ| 両方   | 両方+大甲| 全域    |
 */
```

---

## 📝 楽譜エディタ仕様

### 機能一覧

```typescript
/**
 * 楽譜エディタの主要機能:
 *
 * 1. 新規作成
 *    - 拍子 (4/4, 3/4, 6/8, etc.)
 *    - テンポ (BPM)
 *    - 調子の選択 (六本、七本、八本)
 *    - 小節数の初期設定
 *
 * 2. 音符入力
 *    - クリック入力: 五線譜/数字譜上をクリック
 *    - キーボード入力: 数字キー 1-7 で音を入力
 *    - リアルタイム入力: マイクから吹いた音を自動入力
 *    - ステップ入力: 音価を選んでから音程を指定
 *
 * 3. 編集操作
 *    - 音符の移動・削除・コピー
 *    - 音価の変更 (全音符〜32分音符 + 付点・三連符)
 *    - タイ・スラーの追加
 *    - 装飾音の追加
 *    - 繰り返し記号
 *    - 歌詞・テキスト注釈
 *    - Undo / Redo (50段階)
 *
 * 4. 表示切替
 *    - 五線譜表示
 *    - 数字譜表示 (篠笛伝統表記)
 *    - 運指図付き表示
 *    - 表示の切り替えはワンクリック
 *
 * 5. 再生
 *    - 楽譜の自動再生 (Web Audio APIでサイン波/三角波で簡易再生)
 *    - テンポ変更
 *    - ループ再生 (選択範囲)
 *    - メトロノーム同時再生
 */
```

### 数字譜レンダリング

```typescript
// src/score/ShinobueNotation.ts

/**
 * 篠笛の数字譜レンダリング
 *
 * 表記ルール:
 * - 呂音: 数字そのまま (一, 二, 三...)
 * - 甲音: 数字の上に「・」を付ける
 * - 大甲: 数字の上に「・・」を付ける
 * - 筒音: 〇
 * - 休符: 「ー」
 * - 付点: 数字の右下に「.」
 * - 八分音符: 数字の下に線1本
 * - 十六分音符: 数字の下に線2本
 *
 * Canvas または SVG でレンダリング
 * 縦書き・横書き両対応
 */
```

---

## 📥 楽譜インポート/エクスポート

### 対応フォーマット

```typescript
// src/score/ScoreParser.ts

/**
 * インポート対応フォーマット:
 * 1. MusicXML (.xml, .musicxml) — 最優先
 * 2. MIDI (.mid, .midi) — 基本対応
 * 3. 独自JSON形式 (.shinobue.json) — 完全サポート
 *
 * エクスポート対応フォーマット:
 * 1. MusicXML (.musicxml)
 * 2. 独自JSON形式 (.shinobue.json)
 * 3. PDF (楽譜の印刷用、五線譜 or 数字譜)
 * 4. PNG/SVG (楽譜画像)
 */
```

### 内部データモデル

```typescript
// src/score/ScoreModel.ts

export interface Score {
  metadata: {
    title: string;
    composer: string;
    arranger?: string;
    shinobueKey: string;       // "roku" | "nana" | "hachi" | etc.
    tempo: number;              // BPM
    timeSignature: [number, number]; // [分子, 分母]
    difficulty?: Difficulty;
  };
  measures: Measure[];
}

export interface Measure {
  number: number;
  notes: NoteEvent[];
  barline?: 'normal' | 'double' | 'final' | 'repeat-start' | 'repeat-end';
}

export interface NoteEvent {
  id: string;                   // UUID
  type: 'note' | 'rest';
  pitch?: {
    shinobueNumber: number;     // 0-7 (0=筒音)
    register: 'ro' | 'kan' | 'daikan';
    frequency: number;
    midiNote: number;
    western: string;            // "C#5"
  };
  duration: {
    type: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth' | 'thirty-second';
    dots: number;               // 付点の数
    tuplet?: number;            // 三連符なら 3
  };
  startBeat: number;            // 小節内の開始拍 (0-indexed, float)
  ornaments?: OrnamentType[];   // 装飾音
  tie?: 'start' | 'stop' | 'continue';
  slur?: 'start' | 'stop' | 'continue';
  dynamics?: string;            // "pp", "p", "mp", "mf", "f", "ff"
  text?: string;                // 注釈テキスト
}
```

---

## 🎯 練習モード仕様

### 1. チューナーモード

```typescript
/**
 * リアルタイムチューナー
 *
 * - 円形メーター表示 (中央が正しい音程)
 * - 現在の音名を大きく表示 (数字譜 + 西洋音名)
 * - セント偏差を数値で表示
 * - 音程の履歴グラフ (直近10秒)
 * - 基準ピッチ変更可能 (A=440Hz ± 調整)
 * - 篠笛の各調子プリセット
 */
```

### 2. ロングトーン練習

```typescript
/**
 * 指定された音を安定して伸ばす練習
 *
 * - 目標音を表示
 * - 吹いている間、音程の安定度をリアルタイム表示
 * - 目標: 指定秒数 (5s, 10s, 15s, 30s) 以内に ±10cent 以内を維持
 * - 結果表示: 安定度%, 平均偏差, 最大偏差
 * - 呂音 → 甲音 → 大甲 と段階的に練習
 */
```

### 3. 音階練習

```typescript
/**
 * 篠笛の音階を順番に吹く練習
 *
 * パターン:
 * - 上行: 筒音 → 一 → 二 → ... → 七 → 甲一 → ...
 * - 下行: 甲七 → 甲六 → ... → 七 → 六 → ... → 筒音
 * - 跳躍: 一 → 三 → 五 → 七 → 甲二 → ...
 * - ランダム
 *
 * テンポ: ♩= 60 ~ 180 (調整可能)
 * メトロノーム付き
 * 間違えた音をハイライトして記録
 */
```

### 4. 曲の区間練習

```typescript
/**
 * 楽曲の一部分を繰り返し練習
 *
 * - 区間選択 (開始小節 - 終了小節)
 * - スロー再生 (50%, 75%, 100%)
 * - 段階的テンポアップ (80% → 90% → 100%)
 * - 間違えた箇所の自動マーキング
 * - お手本再生 (簡易サウンド)
 */
```

---

## ⚙️ 設定項目

```typescript
// src/store/settingsStore.ts

export interface AppSettings {
  // 篠笛設定
  shinobueKey: string;           // 調子
  tuningA4: number;              // A4基準 (default: 440)
  tuningMode: 'equal' | 'shinobue'; // 平均律 or 篠笛音律

  // マイク設定
  inputDeviceId: string;         // マイクデバイス
  noiseGate: number;             // ノイズゲート閾値 (dB)
  pitchConfidenceThreshold: number; // 音程検出信頼度閾値

  // ゲーム設定
  difficulty: Difficulty;
  scrollSpeed: number;           // スクロール速度倍率
  judgeOffset: number;           // 判定タイミング微調整 (ms)
  showFingering: boolean;        // 運指表示
  showPitchMeter: boolean;       // 音程メーター表示
  notationType: 'western' | 'number' | 'both'; // 楽譜表記

  // 表示設定
  theme: 'light' | 'dark' | 'traditional'; // traditional = 和風テーマ
  language: 'ja' | 'en';
  fontSize: 'small' | 'medium' | 'large';

  // 音声設定
  effectVolume: number;          // 効果音音量 (0-100)
  metronomeVolume: number;       // メトロノーム音量 (0-100)
  playbackVolume: number;        // 再生音量 (0-100)
}
```

---

## 🎨 UIデザイン方針

### テーマ: 和モダン

```
デザインコンセプト:
- 和紙のようなテクスチャ背景
- 朱色・藍色・金色をアクセントカラーに使用
- 書道フォント風の見出し (Noto Serif JP)
- 本文は読みやすいゴシック体 (Noto Sans JP)
- ダークモード: 漆黒 + 金の差し色
- Traditional テーマ: 和紙色背景 + 墨色テキスト

カラーパレット:
- Primary:   #C41E3A (朱赤)
- Secondary: #1B4F72 (藍色)
- Accent:    #C5A332 (金色)
- BG Light:  #F5F0E8 (和紙色)
- BG Dark:   #1A1A1A (漆黒)
- Text:      #2C2C2C (墨色)
- Success:   #2D8B4E (松葉色)
- Warning:   #D4A017 (山吹色)
- Error:     #B22222 (紅色)
```

---

## 💾 データ永続化

```typescript
/**
 * IndexedDB を使用してローカルに保存
 *
 * ストア構成:
 * 1. "songs"     - 楽曲データ (Score オブジェクト)
 * 2. "scores"    - プレイ結果・ハイスコア
 * 3. "settings"  - アプリ設定
 * 4. "practice"  - 練習記録・統計
 *
 * バックアップ: JSON エクスポート/インポート機能
 */
```

---

## 🔧 開発フェーズ

### Phase 1: コア基盤 (MVP)
1. プロジェクトセットアップ (Vite + React + TypeScript + Tailwind)
2. マイク入力 + YIN 音程検出の実装
3. 篠笛の音名マッピング (NoteClassifier)
4. チューナーモード (PracticeScreen > TunerView)
5. 基本的な運指表表示

### Phase 2: 楽譜システム
6. 内部楽譜データモデル (ScoreModel)
7. MusicXML パーサー (インポート)
8. 楽譜の Canvas 描画 (五線譜 + 数字譜)
9. 楽譜エディタ基本機能 (音符入力・編集)
10. 楽譜のエクスポート

### Phase 3: ゲームモード
11. ゲームエンジン (GameEngine + TimingJudge)
12. ノートハイウェイ (NoteHighway Canvas 描画)
13. リアルタイム判定システム
14. スコア計算・コンボシステム
15. 結果画面

### Phase 4: 練習モード拡張
16. ロングトーン練習
17. 音階練習
18. 区間練習
19. 練習記録・統計ダッシュボード

### Phase 5: 仕上げ
20. 和モダンUI テーマ完成
21. サンプル楽曲 5曲以上同梱
22. レスポンシブ対応 (タブレット)
23. PWA 対応 (オフライン使用)
24. パフォーマンス最適化

---

## 📋 サンプル楽曲 (初期同梱)

以下の楽曲の MusicXML を用意する（著作権フリーまたはパブリックドメインの曲）:

1. **さくらさくら** — 初心者向け、呂音のみ
2. **荒城の月** — 初心者〜中級、甲音を含む
3. **越天楽今様** — 雅楽の練習曲
4. **通りゃんせ** — 中級、装飾音の練習
5. **音階練習曲** — 全音域を使った練習用

---

## ⚡ パフォーマンス要件

```
- 音程検出レイテンシ: < 50ms
- Canvas 描画: 60fps 維持
- 初回読み込み: < 3秒 (Lighthouse Performance > 90)
- バンドルサイズ: < 500KB (gzip)
- メモリ使用量: < 100MB
- オフライン対応: ServiceWorker でキャッシュ
```

---

## 🧪 テスト方針

```
- ユニットテスト (Vitest):
  - YIN アルゴリズムの精度テスト (既知の周波数入力)
  - NoteClassifier のマッピング正確性
  - TimingJudge の判定ロジック
  - ScoreParser の MusicXML パース
  - ScoreModel の操作

- 統合テスト (Playwright):
  - マイク入力〜音程表示の E2E フロー
  - 楽譜エディタの操作フロー
  - ゲームプレイの基本フロー

- 音響テスト:
  - テスト用のサイン波音声ファイルを使い、音程検出の精度を検証
  - 440Hz, 880Hz, 1320Hz 等の既知周波数での精度 > 99%
  - 篠笛の実録音サンプルでの検出率 > 90%
```

---

## 📌 実装上の注意事項

1. **AudioWorklet の CORS**: 開発サーバーでWorkletファイルが正しく配信されるようViteの設定に注意
2. **iOS Safari の Web Audio**: ユーザーインタラクション後にのみ AudioContext を生成
3. **マイク権限**: 初回起動時にわかりやすい権限リクエスト UI を表示
4. **ブラウザ対応**: Chrome / Edge / Firefox / Safari (最新2バージョン)
5. **篠笛は個体差が大きい**: キャリブレーション機能（ユーザーが各音を吹いて基準を登録）を将来的に追加予定
6. **音量に依存しない音程検出**: AGC (自動ゲイン制御) を実装するか、正規化処理を入れる

---

## 実装開始コマンド

```bash
# プロジェクト作成
npm create vite@latest shinobue-no-tatsujin -- --template react-ts
cd shinobue-no-tatsujin

# 依存関係インストール
npm install zustand tone @tonejs/midi
npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react playwright

# 開発サーバー起動
npm run dev
```

---

**このドキュメントに従って、Phase 1 から順に実装を進めてください。各Phase完了時にテストを実行し、品質を確認してから次のPhaseに進むこと。**
