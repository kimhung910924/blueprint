export const config = {
  runtime: 'edge',
  maxDuration: 30,
};

declare const process: {
  env: {
    ANTHROPIC_API_KEY?: string;
  };
};

const systemPrompt = `주어진 텍스트를 분석해서 다음 카테고리로 분류해줘.
- planning: 앱 기획 관련 결정사항, 고민, 아이디어 (status는 확정/고민중/아이디어 중 하나)
- memos: 참고할 메모, 아이디어 (tag는 메모/결정전아이디어/나중에검토 중 하나)
- todos: 해야 할 작업들
반드시 아래 형태의 JSON 객체만 반환하고 다른 텍스트, 설명, markdown 코드블록 없이 반환해.
{
  "planning": [{ "title": "...", "status": "확정" }],
  "memos": [{ "tag": "메모", "text": "..." }],
  "todos": [{ "text": "...", "done": false }]
}`;

const planningStatuses = ['확정', '고민중', '아이디어'] as const;
const memoTags = ['메모', '결정전아이디어', '나중에검토'] as const;

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function isTextContentBlock(value: unknown): value is { type: 'text'; text: string } {
  const object = asObject(value);
  return object.type === 'text' && typeof object.text === 'string';
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (withoutFence.startsWith('{') && withoutFence.endsWith('}')) {
    return withoutFence;
  }

  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return withoutFence.slice(start, end + 1);
  }

  return withoutFence;
}

function normalizeParsedResult(value: unknown) {
  const object = asObject(value);
  const planning = Array.isArray(object.planning)
    ? object.planning
        .map((item) => {
          const row = asObject(item);
          const title = typeof row.title === 'string' ? row.title.trim() : '';
          const status = typeof row.status === 'string' && planningStatuses.includes(row.status as never) ? row.status : '아이디어';
          return title ? { title, status } : null;
        })
        .filter(Boolean)
    : [];

  const memos = Array.isArray(object.memos)
    ? object.memos
        .map((item) => {
          const row = asObject(item);
          const tag = typeof row.tag === 'string' && memoTags.includes(row.tag as never) ? row.tag : '메모';
          const text = typeof row.text === 'string' ? row.text.trim() : '';
          return text ? { tag, text } : null;
        })
        .filter(Boolean)
    : [];

  const todos = Array.isArray(object.todos)
    ? object.todos
        .map((item) => {
          const row = asObject(item);
          const text = typeof row.text === 'string' ? row.text.trim() : '';
          return text ? { text, done: false } : null;
        })
        .filter(Boolean)
    : [];

  return { planning, memos, todos };
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: 'ANTHROPIC_API_KEY is not configured' }, 500);
  }

  let text = '';
  try {
    const body = await request.json();
    text = typeof body.text === 'string' ? body.text.trim() : '';
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!text) {
    return jsonResponse({ error: 'text is required' }, 400);
  }

  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1400,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: text }],
    }),
  });

  if (!anthropicResponse.ok) {
    return jsonResponse({ error: 'Claude request failed' }, anthropicResponse.status);
  }

  const result = await anthropicResponse.json();
  const resultObject = asObject(result);
  const content = Array.isArray(resultObject.content)
    ? resultObject.content.find(isTextContentBlock)?.text ?? ''
    : '';

  try {
    return jsonResponse(normalizeParsedResult(JSON.parse(extractJsonObject(content))));
  } catch {
    return jsonResponse(
      {
        error: 'Claude returned invalid JSON',
        raw: content.slice(0, 500),
      },
      502,
    );
  }
}
