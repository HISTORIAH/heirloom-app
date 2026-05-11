const modules = import.meta.glob('./*.mdx', { eager: true })
export interface PostMeta {
    slug: string
    title: string
    date: string 
    excerpt: string
    tags: string[]
    published: boolean
}

export const posts: PostMeta[] = Object.entries(modules)
    .map(([filepath, mod]: [string, any]) => ({
        slug: filepath.replace('./', '').replace('.mdx', ''),
        ...mod.frontmatter,
    }))
    .filter((p) => p.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())