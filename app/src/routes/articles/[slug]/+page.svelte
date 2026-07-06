<script lang="ts">
  import Quiz from '$lib/components/Quiz.svelte';
  let { data } = $props();
  const post = $derived(data.post);
</script>

<svelte:head>
  <title>{post.title} - etak64n's blog</title>
  {#if post.description}<meta name="description" content={post.description} />{/if}
  <meta property="og:title" content={post.title} />
  {#if post.description}<meta property="og:description" content={post.description} />{/if}
  {#if post.thumbnail?.url}<meta property="og:image" content={post.thumbnail.url} />{/if}
</svelte:head>

<article style="max-width:760px;margin:0 auto">
  {#if post.thumbnail?.url}
    <img
      src={post.thumbnail.url}
      alt={post.thumbnail.title ?? post.title}
      style="width:100%;border-radius:12px;aspect-ratio:1200/630;object-fit:cover;margin-bottom:1.2rem"
    />
  {/if}

  <h1 style="font-size:2rem;font-weight:800;line-height:1.3;margin:0 0 .6rem">{post.title}</h1>
  <p style="color:var(--muted);margin:0 0 .4rem">
    {post.date}{#if post.updated && post.updated !== post.date} ・ 更新 {post.updated}{/if}
  </p>
  {#if post.tags.length}
    <p style="display:flex;flex-wrap:wrap;gap:.4rem;margin:0 0 1.2rem">
      {#each post.tags as t}
        <a href={`/tags/${encodeURIComponent(t)}/`} style="font-size:.8rem;color:var(--brand);text-decoration:none"
          >#{t}</a
        >
      {/each}
    </p>
  {/if}

  {#if post.description}
    <p style="color:var(--muted);border-left:3px solid var(--border);padding-left:1rem;margin:0 0 1.5rem">
      {post.description}
    </p>
  {/if}

  {#if data.toc.length > 2}
    <details style="border:1px solid var(--border);border-radius:8px;padding:.6rem 1rem;margin:0 0 1.5rem">
      <summary style="cursor:pointer;font-weight:700">目次</summary>
      <ul style="margin:.6rem 0 0;padding-left:1.2rem">
        {#each data.toc as item}
          <li style="margin:.2rem 0;{item.depth === 3 ? 'margin-left:1rem' : ''}">
            <a href={`#${item.id}`} style="color:var(--brand);text-decoration:none">{item.text}</a>
          </li>
        {/each}
      </ul>
    </details>
  {/if}

  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  <div class="prose-content">{@html data.html}</div>

  {#if post.quizzes && post.quizzes.length}
    <section style="margin-top:2.5rem">
      <h2 style="font-size:1.4rem;font-weight:800;margin:0 0 1rem">理解度チェック</h2>
      {#each post.quizzes as quiz, i}
        <Quiz {quiz} index={i} />
      {/each}
    </section>
  {/if}
</article>
