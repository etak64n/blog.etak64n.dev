<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>Tags - etak64n's blog</title>
</svelte:head>

<h1 style="font-size:1.8rem;font-weight:800;margin:0 0 1.2rem">タグ</h1>
{#if data.tags.length === 0}
  <p style="color:var(--muted)">タグはまだありません。</p>
{:else}
  <div style="display:flex;flex-wrap:wrap;gap:.6rem">
    {#each data.tags as { tag, count }}
      <a
        href={`/tags/${encodeURIComponent(tag)}/`}
        style="border:1px solid var(--border);border-radius:999px;padding:.35rem .9rem;text-decoration:none;color:var(--text);background:var(--surface)"
      >
        #{tag} <span style="color:var(--muted)">({count})</span>
      </a>
    {/each}
  </div>
{/if}
