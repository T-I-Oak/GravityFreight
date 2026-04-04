# Terminal Report (GameOver Screen) Design Specs

## 1. Overview
The Terminal Report is a high-fidelity "thermal paper receipt" aesthetic. Key visual elements include a jagged top edge, monospace typography, and an "Official Seal" (stamp) that animates upon display.

## 2. Layout & Typography
- **Width**: Responsive up to 460px.
- **Font**: Courier New (Receipt body), Inter (Official Seal).
- **Ink Color**: 
  - Primary: `#1a1a1a` (Black)
  - Accent (In-text Grades/Top-3 ranks): `#b22d2d` (Red Ink)
- **Footer Balance**: 5px gap below the barcode to maintain professional density.

## 3. Official Seal (Stamp) Anatomy
The stamp is composed of two joined rectangles: a Left Frame (textual details) and a Right Frame (Grade symbol).

### 3.1 Proportions
The design is based on the **SS Grade (Huge)** as the baseline "Aesthetic Original".
- **Baseline Width**: Determined by content (Horizontal Spacing + Padding).
- **Internal Ratio**: Left Frame (~71%) : Right Frame (~29%).
- **Grade Symbol (Right)**: Always vertically and horizontally centered.

### 3.2 Scaling Logic (Mathematical Similarity)
To ensure the same "look" across different grades, all properties scale relative to the Huge variant:
- **Huge (SS)**: 100% (Baseline)
- **Normal (S - D)**: ~78% scale
- **Mini (E)**: ~70% scale

### 3.3 Golden Rules (Huge Baseline)
- **Letter Spacing (GRADE)**: `8px` (DO NOT SCALE DOWN INDEPENDENTLY).
- **Left Padding**: `15px`.
- **Right Padding**: `20px`.
- **Border Radius**: `0px` (Sharp corners for combined rectangles).

## 4. Interaction & Animations
- **Paper Slide-In**: 0.8s cubic-bezier(0.2, 1, 0.3, 1).
- **Stamp Impact**: 0.4s impact animation with randomized rotation (-10deg to -25deg) and subtle translational offset.
- **Exit Action**: Clicking "END CONTRACT" triggers a 0.8s slide-down animation before resetting the game state.

## 5. CSS Classes
- `.report-official-seal`: Container.
- `.huge`, `.normal`, `.mini`: Scale variants.
- `.receipt-grade-ss`, `.receipt-grade-s`: Detail-line color overrides (Red Ink).
- `--stamp-rot`, `--stamp-x`, `--stamp-y`: Dynamic random variables injected via JS.
