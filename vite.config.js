import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

// package.json からバージョン情報を取得
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  // GitHub Pages のリポジトリ名に合わせてベースパスを設定
  // https://T-I-Oak.github.io/GravityFreight/ を想定
  base: '/GravityFreight/',
  
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  build: {
    // 出力先
    outDir: 'dist',
    // 最新のブラウザをターゲットに設定し、新しい CSS プロパティが削られるのを防ぐ
    target: 'esnext',
    cssTarget: 'chrome100',
    cssMinify: false, // CSS の圧縮を無効化してプロパティが削られるのを防ぐ（デバッグ用）
    // 資産のハッシュ化（Vite のデフォルト）
    assetsInlineLimit: 0, // 小さな画像も別ファイルとして出力してキャッシュ管理を容易にする
    rollupOptions: {
      input: {
        main: 'index.html',
      },
      output: {
        // 出力ファイル名のフォーマットを指定
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
      },
    },
  },

  server: {
    port: 3000,
    open: true,
  },
});
