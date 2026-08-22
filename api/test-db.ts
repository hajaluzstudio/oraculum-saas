import { supabase } from '../src/services/supabaseClient';

export default async function handler(req: any, res: any) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasAnonKey = !!process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || (!hasServiceRole && !hasAnonKey)) {
      return res.status(500).json({
        status: 'error',
        message: 'Variáveis do Supabase ausentes no ambiente.',
        envCheck: { supabaseUrl: !!supabaseUrl, hasServiceRole, hasAnonKey }
      });
    }

    const testClientId = 'test_diagnostic_' + Date.now();
    const testContent = 'Ping de teste Supabase - ' + new Date().toISOString();

    // 1. Teste de gravação em bi_chat_history
    const { data: insertData, error: insertErr } = await supabase
      .from('bi_chat_history')
      .insert([{
        client_id: testClientId,
        role: 'user',
        content: testContent,
        created_at: new Date().toISOString()
      }])
      .select();

    if (insertErr) {
      console.error('❌ Erro no insert bi_chat_history:', insertErr);
      return res.status(500).json({
        status: 'error',
        step: 'bi_chat_history_insert',
        message: insertErr.message,
        error: insertErr
      });
    }

    // 2. Teste de leitura em bi_chat_history
    const { data: readData, error: readErr } = await supabase
      .from('bi_chat_history')
      .select('*')
      .eq('client_id', testClientId);

    if (readErr) {
      console.error('❌ Erro no read bi_chat_history:', readErr);
      return res.status(500).json({
        status: 'error',
        step: 'bi_chat_history_read',
        message: readErr.message,
        error: readErr
      });
    }

    return res.status(200).json({
      status: 'ok',
      message: 'Conexão e gravação no Supabase validadas com sucesso!',
      inserted: insertData,
      readResult: readData
    });

  } catch (err: any) {
    console.error('❌ Exceção em /api/test-db:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Exceção interna ao testar Supabase',
      detail: err.message || String(err)
    });
  }
}
