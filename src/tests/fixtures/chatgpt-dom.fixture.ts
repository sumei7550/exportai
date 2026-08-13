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

export function multiTurnFixture(): string {
  return shell(`
    <article data-message-author-role="user" data-message-id="u1"><p>One</p></article>
    <article data-message-author-role="assistant" data-message-id="a1"><p>Two</p></article>
    <article data-message-author-role="user" data-message-id="u2"><p>Three</p></article>
    <article data-message-author-role="assistant" data-message-id="a2"><p>Four</p></article>
  `, { title: "Multiple turns" });
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
