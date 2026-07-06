<script lang="ts">
  import type { PostMeta } from '$lib/content/posts';
  let { posts }: { posts: PostMeta[] } = $props();

  function thumbUrl(p: PostMeta): string | null {
    return p.thumbnail?.url ?? null;
  }
</script>

<ul
  style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem"
>
  {#each posts as p}
    <li
      style="border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--surface);display:flex;flex-direction:column"
    >
      <a href={`/articles/${p.slug}/`} style="text-decoration:none;color:inherit;display:block">
        <div style="aspect-ratio:1200/630;background:#e2e8f0;overflow:hidden">
          {#if thumbUrl(p)}
            <img
              src={thumbUrl(p)}
              alt={p.thumbnail?.title ?? p.title}
              style="width:100%;height:100%;object-fit:cover;display:block"
              loading="lazy"
            />
          {/if}
        </div>
        <div style="padding:.8rem .9rem 1rem">
          <div style="font-weight:700;line-height:1.35;font-size:.98rem">{p.title}</div>
          <div style="color:var(--muted);font-size:.85rem;margin-top:.4rem">{p.date}</div>
          {#if p.tags.length}
            <div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.5rem">
              {#each p.tags as t}
                <span style="font-size:.75rem;color:var(--brand)">#{t}</span>
              {/each}
            </div>
          {/if}
        </div>
      </a>
    </li>
  {/each}
</ul>
