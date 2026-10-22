
async function testAIToolCalling() {
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen2.5:3b",
      messages: [
        {
          role: "user",
          content: "Use the list_tasks tool to show my saved tasks.",
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "list_tasks",
            description: "Retrieve all tasks saved in Lexa.",
            parameters: {
              type: "object",
              properties: {},
              required: [],
            },
          },
        },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned status ${response.status}`);
  }

  const data = await response.json();
  console.log(JSON.stringify(data.message, null, 2));
}

testAIToolCalling().catch(console.error);
