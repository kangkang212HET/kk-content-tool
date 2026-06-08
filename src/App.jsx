import { useState, useRef, useEffect } from "react";

const DAILY_LIMIT = 3;

function getUsageData() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem("kk_usage");
    const data = raw ? JSON.parse(raw) : {};
    if (data.date !== today) return { date: today, count: 0 };
    return data;
  } catch { return { date: new Date().toISOString().slice(0, 10), count: 0 }; }
}

function incrementUsage() {
  const data = getUsageData();
  data.count += 1;
  localStorage.setItem("kk_usage", JSON.stringify(data));
  return data.count;
}

const SYSTEM_PROMPT = `你是一位专为讲师、培训师生成深度 Facebook 长文的内容顾问，套用「陈勇延式深度长文」框架。

## 黄金结构（必须严格遵守）

### 一、标题
用【】包住核心观点，下方加一行副标题（身份背书）。

### 二、开场（100字内）
用一个具体场景或对话直接开场，不说背景，直接入戏。
禁止使用：「今天要跟大家分享」「希望对你有帮助」「各位朋友好」

### 三、主体（三大困境）
每段用 ▋ 做段落标题，每个困境包含：现象描述 → 系统原因 → 真实案例（可虚构但要真实感）
不给标准答案，呈现灰色地带。

### 四、转折段
出现一个「反例英雄」——有讲师选择了不一样的路，结果如何。

### 五、个人告白段
用「我自己的选择」开场，列出 2–3 个亲身经历的有风险决定，格式：「某次___，我___。当下有风险。事后回想，我庆幸___。」

### 六、结尾真心话
格式：「给[目标读者]的真心话：」列出 2–3 条，每条先说反直觉观点，再给行动指引。最后一句给予「你不孤单」的情感归属感。

### 七、CTA
📌 结尾导流，引导私讯了解。

### 八、建议第一留言
作者自己留的第一条评论。

## 语气守则
- 第一人称「我」，像朋友说话，不像演讲
- 说「我不确定」「我到现在还没有答案」，展示诚实
- 多用破折号「——」制造悬念感
- 句子短，一句一行，易读
- 禁止教训语气：「你应该要」「你必须」
- 禁止：「成功秘诀」「五步骤教你」

输出完整文章，包含标题、正文、CTA、建议第一留言。`;

const questions = [
  {
    id: "topic",
    label: "这篇文章想讲什么？",
    placeholder: "例如：讲师发了很多内容但没有人记得、TTT 拿到了不知道下一步……",
    type: "textarea",
  },
  {
    id: "audience",
    label: "主要写给谁看？",
    placeholder: "例如：准讲师、TTT 学员、企业培训师、想转型的 HR……",
    type: "input",
  },
  {
    id: "tension",
    label: "这个主题里，什么东西和大家想的不一样？",
    placeholder: "例如：大家以为写得多就有效，但其实没有观点的内容换谁写都一样……",
    type: "textarea",
  },
  {
    id: "story",
    label: "你有没有相关的真实经历？（可选）",
    placeholder: "有的话写进来，没有也没关系，AI 会自动生成有真实感的案例……",
    type: "textarea",
  },
];

export default function App() {
  const [form, setForm] = useState({ topic: "", audience: "", tension: "", story: "" });
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [usageLeft, setUsageLeft] = useState(() => Math.max(0, DAILY_LIMIT - getUsageData().count));
  const outputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (output && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const canGenerate = form.topic.trim() && form.audience.trim() && form.tension.trim() && usageLeft > 0;

  async function generate() {
    if (!canGenerate || loading || usageLeft <= 0) return;
    setLoading(true);
    setOutput("");
    setDone(false);
    setCopied(false);

    const userMessage = `请根据以下信息，生成一篇完整的深度 Facebook 长文：

主题：${form.topic}
目标读者：${form.audience}
核心矛盾（和大家想的不一样的地方）：${form.tension}
${form.story ? `真实经历素材：${form.story}` : "（无真实素材，请自行生成有真实感的案例）"}`;

    try {
      const res = await fetch("/.netlify/functions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      const data = await res.json();
      const text = data.content?.[0]?.text || "生成失败，请重试。";

      // Typewriter effect
      let i = 0;
      const interval = setInterval(() => {
        if (i <= text.length) {
          setOutput(text.slice(0, i));
          i += 6;
        } else {
          setOutput(text);
          clearInterval(interval);
          setDone(true);
          const newCount = incrementUsage();
          setUsageLeft(Math.max(0, DAILY_LIMIT - newCount));
        }
      }, 16);

    } catch (e) {
      setOutput("生成失败，请重试。");
    } finally {
      setLoading(false);
    }
  }

  function copyText() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function reset() {
    setOutput("");
    setDone(false);
    setForm({ topic: "", audience: "", tension: "", story: "" });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f4f1",
      fontFamily: "'Georgia', 'Noto Serif SC', serif",
      color: "#2a2820",
      padding: "0",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #dddbd5",
        background: "#ffffff",
        padding: "28px 40px 24px",
        display: "flex",
        alignItems: "flex-end",
        gap: "16px",
      }}>
        <div>
          <div style={{
            fontSize: "11px",
            letterSpacing: "3px",
            color: "#c9a84c",
            textTransform: "uppercase",
            marginBottom: "6px",
            fontFamily: "'Georgia', serif",
          }}>人本生命讲堂 · 内容工具</div>
          <h1 style={{
            margin: 0,
            fontSize: "26px",
            fontWeight: "400",
            color: "#ffffff",
            letterSpacing: "-0.5px",
          }}>深度长文生成器</h1>
        </div>
        <div style={{
          marginLeft: "auto",
          fontSize: "12px",
          color: "#7a7870",
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
        }}>内容有深度，学员才会找你</div>
      </div>

      <div style={{
        maxWidth: "780px",
        margin: "0 auto",
        padding: "40px 40px",
        display: "grid",
        gridTemplateColumns: done || loading ? "1fr 1fr" : "1fr",
        gap: "40px",
        transition: "all 0.4s ease",
      }}>

        {/* Left: Form */}
        <div>
          {!done && !loading && (
            <p style={{
              fontSize: "14px",
              color: "#7a7870",
              marginBottom: "32px",
              lineHeight: "1.8",
              fontStyle: "italic",
            }}>
              填写以下四个问题，AI 会套用深度长文框架，生成一篇只有你能写的 Facebook 帖子。
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {questions.map((q, i) => (
              <div key={q.id}>
                <label style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#c9a84c",
                  marginBottom: "8px",
                  letterSpacing: "0.5px",
                }}>
                  {i < 3 ? "✦ " : "◇ "}{q.label}
                </label>
                {q.type === "textarea" ? (
                  <textarea
                    value={form[q.id]}
                    onChange={e => setForm(f => ({ ...f, [q.id]: e.target.value }))}
                    placeholder={q.placeholder}
                    rows={3}
                    style={{
                      width: "100%",
                      background: "#ffffff",
                      border: "1px solid #e0ddd6",
                      borderRadius: "6px",
                      color: "#2a2820",
                      fontSize: "14px",
                      padding: "12px 14px",
                      resize: "vertical",
                      fontFamily: "Georgia, serif",
                      lineHeight: "1.7",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={e => e.target.style.borderColor = "#c9a84c"}
                    onBlur={e => e.target.style.borderColor = "#e0ddd6"}
                  />
                ) : (
                  <input
                    value={form[q.id]}
                    onChange={e => setForm(f => ({ ...f, [q.id]: e.target.value }))}
                    placeholder={q.placeholder}
                    style={{
                      width: "100%",
                      background: "#ffffff",
                      border: "1px solid #e0ddd6",
                      borderRadius: "6px",
                      color: "#2a2820",
                      fontSize: "14px",
                      padding: "12px 14px",
                      fontFamily: "Georgia, serif",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={e => e.target.style.borderColor = "#c9a84c"}
                    onBlur={e => e.target.style.borderColor = "#e0ddd6"}
                  />
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: "32px", display: "flex", gap: "12px" }}>
            <button
              onClick={generate}
              disabled={!canGenerate || loading}
              style={{
                flex: 1,
                padding: "14px 24px",
                background: canGenerate && !loading ? "#c9a84c" : "#e0ddd6",
                color: canGenerate && !loading ? "#ffffff" : "#aaa8a0",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontFamily: "Georgia, serif",
                fontWeight: "bold",
                cursor: canGenerate && !loading ? "pointer" : "not-allowed",
                letterSpacing: "0.5px",
                transition: "all 0.2s",
              }}
            >
              {loading ? "生成中……" : usageLeft <= 0 ? "今日次数已用完" : `✦ 生成深度长文（剩余 ${usageLeft} 次）`}
            </button>
            {(done || output) && (
              <button
                onClick={reset}
                style={{
                  padding: "14px 20px",
                  background: "transparent",
                  color: "#8a8880",
                  border: "1px solid #e0ddd6",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontFamily: "Georgia, serif",
                  cursor: "pointer",
                }}
              >重新填写</button>
            )}
          </div>

          {usageLeft <= 0 ? (
            <p style={{ fontSize: "12px", color: "#c9a84c", marginTop: "10px", fontStyle: "italic" }}>
              今日免费试用次数（{DAILY_LIMIT}次）已用完，明天再来 🙏
            </p>
          ) : !canGenerate ? (
            <p style={{ fontSize: "12px", color: "#aaa8a0", marginTop: "10px", fontStyle: "italic" }}>
              ＊ 前三题必填
            </p>
          ) : null}
        </div>

        {/* Right: Output */}
        {(loading || output) && (
          <div style={{
            borderLeft: "1px solid #dddbd5",
            paddingLeft: "40px",
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}>
              <span style={{ fontSize: "12px", color: "#c9a84c", letterSpacing: "2px" }}>
                {loading ? "▸ 生成中" : "✦ 完成"}
              </span>
              {done && (
                <button
                  onClick={copyText}
                  style={{
                    background: "transparent",
                    border: "1px solid #e0ddd6",
                    borderRadius: "4px",
                    color: copied ? "#c9a84c" : "#8a8880",
                    fontSize: "12px",
                    padding: "6px 14px",
                    cursor: "pointer",
                    fontFamily: "Georgia, serif",
                    transition: "all 0.2s",
                  }}
                >
                  {copied ? "✓ 已复制" : "复制全文"}
                </button>
              )}
            </div>

            <div
              ref={outputRef}
              style={{
                maxHeight: "600px",
                overflowY: "auto",
                fontSize: "14px",
                lineHeight: "2",
                color: "#3a3830",
                fontFamily: "Georgia, serif",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {output}
              {loading && (
                <span style={{
                  display: "inline-block",
                  width: "2px",
                  height: "16px",
                  background: "#c9a84c",
                  marginLeft: "2px",
                  animation: "blink 1s infinite",
                  verticalAlign: "middle",
                }} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid #dddbd5",
        padding: "20px 40px",
        display: "flex",
        justifyContent: "space-between",
        fontSize: "11px",
        color: "#aaa8a0",
        marginTop: "40px",
      }}>
        <span>© 人本生命讲堂 · KK Life Learning</span>
        <span>深度长文框架 by 康康老师</span>
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        textarea::placeholder, input::placeholder { color: #b0ada5; font-style: italic; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #ffffff; }
        ::-webkit-scrollbar-thumb { background: #c0bdb5; border-radius: 2px; }
      `}</style>
    </div>
  );
}
