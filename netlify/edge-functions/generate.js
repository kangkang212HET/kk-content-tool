export default async (request, context) => {
    if (request.method !== "POST") {
          return new Response("Method Not Allowed", { status: 405 });
    }

    try {
          const body = await request.json();
          body.model = "claude-sonnet-4-5";
          body.max_tokens = 1500;
          body.stream = false;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                        "Content-Type": "application/json",
                        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY"),
                        "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify(body),
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), {
              status: 200,
              headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
              },
      });
    } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
                  status: 500,
                  headers: { "Content-Type": "application/json" },
          });
    }
};

export const config = { path: "/.netlify/functions/generate" };
