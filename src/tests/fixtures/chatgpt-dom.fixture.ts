export const CHATGPT_LOCATION = {
  hostname: "chatgpt.com",
  href: "https://chatgpt.com/c/conversation-fixture",
  pathname: "/c/conversation-fixture",
} as const;

function shell(messages: string, options: { title?: string; documentTitle?: string } = {}): string {
  const titleLink = options.title === undefined
    ? ""
    : `<nav><a aria-current="page" href="/c/conversation-fixture">${options.title}</a></nav>`;
  return `<!doctype html><html><head><title>${options.documentTitle ?? "Fixture | ChatGPT"}</title></head><body>${titleLink}<main>${messages}</main></body></html>`;
}

export function singleTurnFixture(): string {
  return shell(`
    <article data-testid="conversation-turn-0" data-message-author-role="user" data-message-id="user-1"><p>Hello</p></article>
    <article data-testid="conversation-turn-1" data-message-author-role="assistant" data-message-id="assistant-1"><p>Hi there</p></article>
  `, { title: "Single turn" });
}

export function accessibilityLabelsFixture(): string {
  return shell(`
    <article data-testid="conversation-turn-0" data-message-author-role="user" data-message-id="user-sr-only">
      <h4 class="sr-only">You said:</h4>
      <div><p>Keep the real user question.</p></div>
    </article>
    <article data-testid="conversation-turn-1" data-message-author-role="assistant" data-message-id="assistant-sr-only">
      <h4 class="sr-only">ChatGPT said:</h4>
      <div><p>Keep the real assistant answer.</p></div>
    </article>
  `, { title: "Accessibility labels" });
}

export function assistantImageOnlyWithActionsFixture(): string {
  return shell(`
    <article data-testid="conversation-turn-0" data-message-author-role="user" data-message-id="image-user">
      <p>Create a landscape image.</p>
    </article>
    <article data-testid="conversation-turn-1" data-message-author-role="assistant" data-message-id="image-assistant">
      <div class="generated-image-result">
        <div class="image-container">
          <button aria-label="Open image">
            <img src="https://images.example.test/generated-landscape.png" alt="Generated landscape">
          </button>
        </div>
      </div>
      <div role="toolbar" aria-label="Message actions" data-testid="conversation-turn-actions">
        <button aria-label="Edit message">Edit</button>
        <button aria-label="Copy response">Copy response</button>
        <button aria-label="Good response">Like</button>
        <button aria-label="Bad response">Dislike</button>
      </div>
    </article>
  `, { title: "Image-only assistant" });
}

function generatedImageWithPagination(realText = ""): string {
  return `
    ${realText ? `<p>${realText}</p>` : ""}
    <div class="generated-image-result">
      <div class="image-container">
        <button aria-label="Open image">
          <img src="https://images.example.test/generated-landscape.png" alt="Generated landscape">
        </button>
      </div>
      <div class="response-navigation" data-testid="response-navigation">
        <button aria-label="Previous response">Previous response</button>
        <span aria-live="polite">2/2</span>
        <button aria-label="Next response">Next response</button>
      </div>
    </div>
  `;
}

export function assistantImageOnlyWithPaginationFixture(): string {
  return shell(`
    <article data-testid="conversation-turn-0" data-message-author-role="user" data-message-id="pagination-user">
      <p>Create a landscape image.</p>
    </article>
    <article data-testid="conversation-turn-1" data-message-author-role="assistant" data-message-id="pagination-assistant">
      ${generatedImageWithPagination()}
    </article>
  `, { title: "Image pagination" });
}

export function assistantImageTextWithPaginationFixture(): string {
  return shell(`
    <article data-testid="conversation-turn-0" data-message-author-role="user" data-message-id="pagination-text-user">
      <p>Update the image.</p>
    </article>
    <article data-testid="conversation-turn-1" data-message-author-role="assistant" data-message-id="pagination-text-assistant">
      ${generatedImageWithPagination("Here is the updated image.")}
    </article>
  `, { title: "Image text pagination" });
}

export function legitimatePaginationTextFixture(): string {
  return shell(`
    <article data-testid="conversation-turn-0" data-message-author-role="user" data-message-id="score-user">
      <p>What is the score?</p>
    </article>
    <article data-testid="conversation-turn-1" data-message-author-role="assistant" data-message-id="score-assistant">
      <p>The score is 2/2.</p>
    </article>
  `, { title: "Legitimate fraction text" });
}

export function multiTurnFixture(): string {
  return shell(`
    <article data-message-author-role="user" data-message-id="u1"><p>One</p></article>
    <article data-message-author-role="assistant" data-message-id="a1"><p>Two</p></article>
    <article data-message-author-role="user" data-message-id="u2"><p>Three</p></article>
    <article data-message-author-role="assistant" data-message-id="a2"><p>Four</p></article>
  `, { title: "Multiple turns" });
}

export type ChatGPTScrollWindow = "top" | "middle" | "bottom" | "gapped-bottom";

const CHATGPT_SCROLL_WINDOW_MARKUP: Record<ChatGPTScrollWindow, string> = {
  top: `
    <section data-testid="conversation-turn-0" data-turn="user">
      <div data-message-author-role="user" data-message-id="scroll-u1"><p>Window message 0</p></div>
    </section>
    <section data-testid="conversation-turn-1" data-turn="assistant">
      <div data-message-author-role="assistant"><p>Window message 1</p></div>
    </section>
    <section data-testid="conversation-turn-2" data-turn="user">
      <div data-message-author-role="user" data-message-id="scroll-u2"><p>Window message 2</p></div>
    </section>
  `,
  middle: `
    <section data-testid="conversation-turn-2" data-turn="user">
      <div data-message-author-role="user" data-message-id="scroll-u2"><p>Window message 2</p></div>
    </section>
    <section data-testid="conversation-turn-3" data-turn="assistant">
      <div data-message-author-role="assistant"><p>Window message 3</p></div>
    </section>
    <section data-testid="conversation-turn-4" data-turn="user">
      <div data-message-author-role="user" data-message-id="scroll-u3"><p>Window message 4</p></div>
    </section>
  `,
  bottom: `
    <section data-testid="conversation-turn-4" data-turn="user">
      <div data-message-author-role="user" data-message-id="scroll-u3"><p>Window message 4</p></div>
    </section>
    <section data-testid="conversation-turn-5" data-turn="assistant" data-message-id="scroll-a3">
      <div><p>Window message 5</p></div>
    </section>
  `,
  "gapped-bottom": `
    <section data-testid="conversation-turn-4" data-turn="user">
      <div data-message-author-role="user" data-message-id="scroll-u3"><p>Window message 4</p></div>
    </section>
    <section data-testid="conversation-turn-6" data-turn="assistant" data-message-id="scroll-a4">
      <div><p>Window message 6</p></div>
    </section>
  `,
};

export function chatGPTScrollWindowMarkup(window: ChatGPTScrollWindow): string {
  return CHATGPT_SCROLL_WINDOW_MARKUP[window];
}

export function scrollingWindowFixture(window: ChatGPTScrollWindow): string {
  return shell(CHATGPT_SCROLL_WINDOW_MARKUP[window], { title: "Scrolling conversation" });
}

export function nineTurnConversationFixture(): string {
  const turns = Array.from({ length: 9 }, (_, index) => {
    const turn = index + 1;
    const userIndex = index * 2;
    const assistantIndex = userIndex + 1;
    return `
      <section data-testid="conversation-turn-${userIndex}" data-turn="user">
        <div data-message-author-role="user" data-message-id="u${turn}"><p>User ${turn}</p></div>
      </section>
      <section data-testid="conversation-turn-${assistantIndex}" data-turn="assistant" data-message-id="a${turn}">
        <div><p>Assistant ${turn}</p></div>
      </section>
    `;
  }).join("");
  return shell(turns, { title: "Nine turns" });
}

export function richContentFixture(): string {
  return shell(`
    <article data-message-author-role="user" data-message-id="rich-user"><div>Show rich content</div></article>
    <article data-message-author-role="assistant" data-message-id="rich-assistant">
      <div>
        <h2>Structured answer</h2>
        <p><strong>Bold</strong>, <em>italic</em>, <del>removed</del>, and <code>inline()</code>.</p>
        <ul>
          <li>Parent<ul><li><strong>Child</strong></li></ul></li>
          <li>Sibling</li>
        </ul>
        <pre><code class="language-ts">const ready = true;</code></pre>
        <table><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody><tr><td>ExportAI</td><td>Local</td></tr></tbody></table>
        <p>Before <span class="katex" data-latex="E = mc^2" data-display="false">visual math</span> after</p>
        <img src="https://images.example.test/chart.png" alt="Chart" title="A chart">
        <a href="https://example.test/reference">Reference</a>
        <blockquote><p>Quoted material</p></blockquote>
        <hr>
      </div>
    </article>
  `, { title: "Rich content" });
}

export function structuredCompatibilityFixture(): string {
  return shell(`
    <article data-message-author-role="user" data-message-id="structured-user"><p>Show structured compatibility.</p></article>
    <article data-message-author-role="assistant" data-message-id="structured-assistant">
      <div>
        <pre>
          <div class="code-toolbar"><span>TypeScript</span><button aria-label="Copy code">Copy</button></div>
          <div class="cm-content" role="textbox" aria-label="Edit code" aria-readonly="true" data-language="typescript"><div class="cm-line"><span>const message = </span><span>"ExportAI"</span><span>;</span></div><div class="cm-line"><span>console.log(message);</span></div></div>
        </pre>
        <pre>
          <div class="code-toolbar"><span>JavaScript</span><button aria-label="Copy code">Copy</button></div>
          <div class="cm-content" role="textbox" aria-label="Edit code" aria-readonly="true" data-language="javascript"><div class="cm-line"><span>const mixed = </span><span>"content"</span><span>;</span></div><div class="cm-line">console.log(mixed);</div></div>
        </pre>
        <pre><div class="cm-content" role="textbox" aria-label="Edit code" aria-readonly="true" data-language="text"><div class="cm-line">\`\`\`text</div><div class="cm-line">literal fence</div><div class="cm-line">\`\`\`</div></div></pre>
        <p>Einstein wrote <span role="math" data-math-source="E = mc^2" aria-label="E = mc^2" data-client-katex-layout=""><span class="katex">E=mc2</span></span>.</p>
        <span role="math" data-math-source="x^2 + y^2 = z^2" aria-label="x^2 + y^2 = z^2" style="display: block;"><span class="katex-display"><span class="katex">x2+y2=z2</span></span></span>
        <p>Mixed before <span role="math" data-math-source="a^2 + b^2 = c^2" aria-label="a^2 + b^2 = c^2"><span class="katex">a2+b2=c2</span></span> mixed after.</p>
        <ul>
          <li>
            <p>Apple</p>
          </li>
          <li>
            <p>Banana</p>
          </li>
          <li>
            <p>Orange</p>
          </li>
          <li>
            <p>Parent A</p>
            <ul>
              <li>
                <p>Child A1</p>
              </li>
              <li>
                <p>Child A2</p>
              </li>
            </ul>
          </li>
          <li>
            <p>Line 1<br>Line 2</p>
          </li>
        </ul>
        <ol>
          <li>
            <p>First</p>
          </li>
          <li>
            <p>Second</p>
          </li>
          <li>
            <p>Third</p>
          </li>
        </ol>
      </div>
    </article>
  `, { title: "Structured compatibility" });
}

export function unknownNodeFixture(): string {
  return shell(`
    <article data-message-author-role="user"><p>Unknown?</p></article>
    <article data-message-author-role="assistant"><exportai-unknown>Readable fallback</exportai-unknown></article>
  `, { title: "Unknown content" });
}

export function missingTitleFixture(): string {
  return shell('<article data-message-author-role="user"><p>No title</p></article>', { documentTitle: "ChatGPT" });
}

export function emptyConversationFixture(): string {
  return shell("", { title: "No messages" });
}
