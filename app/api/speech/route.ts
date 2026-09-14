import { fail, runtimeEnv, sameOrigin, userPrefix } from "../shared";

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ error: "無法驗證這次語音請求。" }, { status: 403 });
  }

  try {
    await userPrefix();
    const { text } = (await request.json()) as { text?: unknown };
    if (typeof text !== "string" || !text.trim() || text.length > 4096) {
      return Response.json({ error: "朗讀文字的長度不正確。" }, { status: 400 });
    }

    const apiKey = request.headers.get("X-AI-Key") || runtimeEnv.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "請先在 AI 連線設定中輸入 OpenAI API 金鑰。" },
        { status: 428 },
      );
    }

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "marin",
        input: text,
        instructions:
          "用溫暖、清楚的臺灣國語朗讀，速度稍慢，適合幼兒與小學生聆聽。標點處自然停頓。",
        response_format: "mp3",
        speed: 0.88,
      }),
    });

    if (!response.ok) {
      return Response.json(
        { error: "語音產生失敗，請檢查 AI 金鑰後重試。" },
        { status: 502 },
      );
    }

    return new Response(await response.arrayBuffer(), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
