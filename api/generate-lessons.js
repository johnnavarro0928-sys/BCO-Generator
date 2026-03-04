const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const lessonSchema = {
  type: "object",
  properties: {
    activities: {
      type: "object",
      properties: Object.fromEntries(DAYS.map((day) => [day, { type: "string" }])),
      required: DAYS,
    },
    mlid: {
      type: "object",
      properties: Object.fromEntries(DAYS.map((day) => [day, { type: "string" }])),
      required: DAYS,
    },
    remarks: {
      type: "object",
      properties: Object.fromEntries(DAYS.map((day) => [day, { type: "string" }])),
      required: DAYS,
    },
  },
  required: ["activities", "mlid", "remarks"],
};

function buildPrompt({ subject, grade, month, competencies }) {
  return `You are a DepEd Philippines curriculum expert for Grade ${grade} ${subject}.

Given the following competencies for each day of a school week in ${month}:
${DAYS.map((day) => `- ${day}: ${competencies[day] || "(no class / holiday)"}`).join("\n")}

Generate a complete 5-day lesson plan following the DepEd MTB-MLE lesson structure:
- Monday: Activating Prior Knowledge (Short Review)
- Tuesday: Establishing Lesson Purpose + Unlocking Content Vocabulary
- Wednesday: Developing and Deepening Understanding (Explicitation + Worked Example)
- Thursday: Deepening Understanding (Lesson Activity - student-centered)
- Friday: Making Generalization (Learners' Takeaways / Assessment)

Also generate:
- A short MLID (Mastery Level and Instructional Decision) note per day
- A brief Remark per day if applicable

For days marked "(no class / holiday)", output exactly: "NO CLASS" for activities, MLID, and remarks.

Keep activities concise but classroom-ready. Return all five weekdays even if some are blank or NO CLASS.`;
}

function normalizeLessonPayload(payload) {
  return ["activities", "mlid", "remarks"].reduce((result, section) => {
    result[section] = DAYS.reduce((days, day) => {
      const value = payload?.[section]?.[day];
      days[day] = typeof value === "string" ? value : "";
      return days;
    }, {});
    return result;
  }, {});
}

function extractText(responseData) {
  const text = responseData?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return response.status(500).json({
      error: "Missing GEMINI_API_KEY environment variable.",
    });
  }

  let body = request.body || {};

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return response.status(400).json({
        error: "Request body must be valid JSON.",
      });
    }
  }

  const { meta, competencies } = body;

  if (!meta?.subject || !meta?.grade || !meta?.month || !competencies) {
    return response.status(400).json({
      error: "Missing lesson generation input.",
    });
  }

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: buildPrompt({ ...meta, competencies }) }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema: lessonSchema,
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      throw new Error(
        `Gemini request failed with status ${geminiResponse.status}: ${errorBody}`,
      );
    }

    const responseData = await geminiResponse.json();
    const parsed = JSON.parse(extractText(responseData));
    return response.status(200).json(normalizeLessonPayload(parsed));
  } catch (error) {
    console.error("Gemini lesson generation failed:", error);
    return response.status(500).json({
      error: "Failed to generate lessons with Gemini.",
    });
  }
}
