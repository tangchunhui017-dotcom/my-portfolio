type MDXComponents = Record<string, React.ComponentType<Record<string, unknown>>>

export function useMDXComponents(components: MDXComponents): MDXComponents {
    return {
        ...components,
    }
}
