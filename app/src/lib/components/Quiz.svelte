<script lang="ts">
  import type { Quiz } from '$lib/content/posts';

  let { quiz, index }: { quiz: Quiz; index: number } = $props();

  let selected = $state<number | null>(null);
  const answered = $derived(selected !== null);
</script>

<div class="quiz" style="border:1px solid var(--border);border-radius:10px;padding:1rem 1.2rem;margin:1.2rem 0;background:var(--surface)">
  <p style="font-weight:700;margin:0 0 .8rem">
    Q{index + 1}. {quiz.question}
  </p>
  <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:.5rem">
    {#each quiz.answers as answer, i}
      {@const isSelected = selected === i}
      {@const showResult = answered}
      <li>
        <button
          type="button"
          onclick={() => (selected = i)}
          disabled={answered}
          style="width:100%;text-align:left;padding:.6rem .8rem;border-radius:8px;cursor:pointer;
            border:1px solid {showResult && answer.correct
            ? '#16a34a'
            : showResult && isSelected && !answer.correct
              ? '#dc2626'
              : 'var(--border)'};
            background:{showResult && answer.correct
            ? 'rgba(22,163,74,.12)'
            : showResult && isSelected && !answer.correct
              ? 'rgba(220,38,38,.12)'
              : 'transparent'};
            color:var(--text)"
        >
          {#if showResult && answer.correct}✅ {:else if showResult && isSelected}❌ {/if}{answer.text}
        </button>
        {#if answered && (isSelected || answer.correct) && answer.explanation}
          <p style="margin:.35rem .2rem 0;font-size:.9rem;color:var(--muted)">
            {answer.explanation}
          </p>
        {/if}
      </li>
    {/each}
  </ul>
  {#if answered}
    <button
      type="button"
      onclick={() => (selected = null)}
      style="margin-top:.8rem;font-size:.85rem;color:var(--brand);background:none;border:none;cursor:pointer;padding:0"
    >
      もう一度
    </button>
  {/if}
</div>
