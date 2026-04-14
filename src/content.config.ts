import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    year: z.string(),
    thumbnail: z.string(),
    images: z.array(z.string()).optional(),
    summary: z.string(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional().default(false),
  }),
});

const directory = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/directory" }),
  schema: z.object({
    name: z.string(),
    category: z.enum(['artists', 'musicians', 'performers', 'craft-and-workshops', 'venues']),
    thumbnail: z.string().optional(),
    description: z.string(),
    email: z.string().optional(),
    website: z.string().optional(),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    specialties: z.array(z.string()).optional(),
    altText: z.string().optional(),
    verified: z.boolean().optional().default(false),
    draft: z.boolean().optional().default(false),
  }),
});

const press = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/press" }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    summary: z.string(),
    externalUrl: z.string().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { projects, directory, press };
