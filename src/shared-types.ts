type ContextBuilder<A, C> = (args: A) => Promise<C>;
type Normalize<R> = R extends null ? object : R;

export type {
    ContextBuilder,
    Normalize
};
