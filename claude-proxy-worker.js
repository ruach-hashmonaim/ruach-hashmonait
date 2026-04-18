// ============================================================
// Cloudflare Worker — Claude API Proxy for hamatzpen.io
// ============================================================
// הוראות התקנה:
// 1. היכנס ל-https://dash.cloudflare.com ותיצור חשבון (חינם)
// 2. לחץ על Workers & Pages → Create Application → Create Worker
// 3. תן שם ל-Worker (למשל: claude-proxy)
// 4. העתק את הקוד הזה ל-Worker
// 5. לחץ Deploy
// 6. הכתובת של ה-Worker תהיה: https://claude-proxy.YOUR_SUBDOMAIN.workers.dev
// 7. הכנס את הכתובת הזו ב"ניהול מערכת → הגדרות AI → Proxy URL"
// 8. הכנס את מפתח ה-Claude שלך ב"מפתח Claude API"
// ============================================================

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      const body = await request.json();

      // API key can come from the request body or from Worker env variable
      const apiKey = body.apiKey || env.ANTHROPIC_API_KEY;

      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Missing API key' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Build the Anthropic API request
      const anthropicBody = {
        model: body.model || 'claude-sonnet-4-20250514',
        max_tokens: body.max_tokens || 8192,
        messages: body.messages || [],
      };

      // Optional fields
      if (body.system) anthropicBody.system = body.system;
      if (body.temperature !== undefined) anthropicBody.temperature = body.temperature;

      // Forward to Anthropic API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(anthropicBody),
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
