
async function testAI() {
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen2.5:3b",
      messages: [
        {
          role: "system",
          content: "You are Lexa, a helpful household assistant.",
        },
        {
          role: "user",
          content: "Suggest one useful task for organizing my day.",
        },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned status ${response.status}`);
  }

  const data = await response.json();
  console.log("Lexa AI:", data.message.content);
}

testAI().catch(console.error);
