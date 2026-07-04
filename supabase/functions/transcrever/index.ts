// =====================================================================
// Edge Function: transcrever — áudio REAL estilo WhatsApp → texto
// Deploy: painel Supabase > Edge Functions > Deploy new function
//         nome: transcrever · cole este código
// Secret:  Edge Functions > Secrets > GROQ_API_KEY (conta grátis em groq.com)
// Custo:   Whisper large-v3-turbo na Groq ≈ US$ 0,04 por HORA de áudio
// =====================================================================

Deno.serve(async (req: Request) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const form = await req.formData();
    const audio = form.get('audio') as File | null;
    if (!audio) return new Response(JSON.stringify({ erro: 'sem áudio' }), { status: 400, headers: cors });

    const fd = new FormData();
    fd.append('file', audio, 'audio.webm');
    fd.append('model', 'whisper-large-v3-turbo');
    fd.append('language', 'pt');
    fd.append('temperature', '0');

    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('GROQ_API_KEY')}` },
      body: fd
    });
    const j = await r.json();

    return new Response(JSON.stringify({ texto: j.text || '' }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ erro: String(e) }), { status: 500, headers: cors });
  }
});
