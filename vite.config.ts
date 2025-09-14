import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // React 플러그인 추가

export default defineConfig(({ mode }) => {
    return {
      plugins: [react()], // React 플러그인 사용
      define: {
        // API_KEY 관련 정의를 모두 제거합니다.
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'), // 경로 별칭 수정
        }
      },
      server: {
        proxy: {
          // '/api'로 시작하는 요청을 Vercel의 개발 서버(localhost:3000)로 전달합니다.
          '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
          },
        }
      }
    };
});