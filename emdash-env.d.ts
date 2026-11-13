// The shape of the collections in seed/seed.json, as `emdash types` generates it from a running site.

/// <reference types="emdash/locals" />

import type { BylineSummary, ContentBylineCredit, TaxonomyTerm, PortableTextBlock, ReferencePage } from "emdash";

interface ImageValue {
  id: string;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  filename?: string;
  mimeType?: string;
  blurhash?: string;
  dominantColor?: string;
  focalX?: number;
  focalY?: number;
  provider?: string;
  previewUrl?: string;
  meta?: Record<string, unknown>;
}

interface SystemFields {
  id: string;
  slug: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  byline?: BylineSummary | null;
  bylines?: ContentBylineCredit[];
  terms?: Record<string, TaxonomyTerm[]>;
}

export interface Post extends SystemFields {
  title: string;
  featured_image?: ImageValue & { darkVariant?: ImageValue };
  content?: PortableTextBlock[];
  excerpt?: string;
}

/** A magazine: posts gathered in an order, with a cover and a description. */
export interface Magazine extends SystemFields {
  title: string;
  description?: string;
  cover?: ImageValue & { darkVariant?: ImageValue };
}

/** A standalone page, such as /about/. */
export interface Page extends SystemFields {
  title: string;
  content?: PortableTextBlock[];
}

declare module "emdash" {
  interface EmDashCollections {
    posts: Post;
    magazines: Magazine;
    pages: Page;
  }
  interface EmDashCollectionReferences {
    posts: { magazines: ReferencePage<Magazine> };
    magazines: { posts: ReferencePage<Post> };
  }
}
