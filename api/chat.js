
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.DASHSCOPE_API_KEY ||
      !process.env.QWEN_BASE_URL) {
    return res.status(503).json({
      error: "AI service is not configured yet."
    });
  }

  try {
    const { model, messages } = req.body || {};

    const allowedModels = [
      "qwen3.8-max",
      "qwen3.7-plus",
      "qwen-turbo",
      "qwen-flash"
    ];

    if (!allowedModels.includes(model)) {
      return res.status(400).json({ error: "Invalid model." });
    }

    if (!Array.isArray(messages) || messages.length === 0 ||
        messages.length > 20) {
      return res.status(400).json({ error: "Invalid conversation." });
    }

    const safeMessages = messages.map(m => {
      if (!["user", "assistant"].includes(m.role) ||
          typeof m.content !== "string" ||
          m.content.length > 4000) {
        throw new Error("Invalid message.");
      }
      return { role: m.role, content: m.content };
    });

    const base = process.env.QWEN_BASE_URL.replace(/\/+$/, "");

    const response = await fetch(
      `${base}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.DASHSCOPE_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant in Qwen Arena."
            },
            ...safeMessages
          ],
          max_tokens: 700,
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: "The AI provider could not complete the request."
      });
    }

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content || "No response."
    });

  } catch (error) {
    return res.status(500).json({
      error: "Something went wrong."
    });
  }
}
