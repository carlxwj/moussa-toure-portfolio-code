import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()], build:{target:'es2022', cssCodeSplit:true, rollupOptions:{output:{manualChunks:{firebase:['firebase/app','firebase/auth','firebase/firestore','firebase/storage','firebase/functions'],motion:['gsap','gsap/ScrollTrigger']}}}}});
