import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// VERSÃO VISÍVEL NO APP — vem do package.json, não da memória de ninguém.
// Motivo (bug real 03/08): o commit v72 subiu com App.tsx ainda em 'v71' e o
// bundle de produção mostrava v71. O protocolo do campo é "fecha e abre o app
// e confere a versão no topo" — com o número congelado, ninguém sabe se o
// celular pegou a atualização. Agora sobe versão = editar package.json.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));
const VERSAO = 'v' + String(pkg.version).split('.')[0];

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(VERSAO),
  },
});
