import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";

type DataFunctionArgs = LoaderFunctionArgs | ActionFunctionArgs;
type DataFunction<A extends DataFunctionArgs, R> = (args: A) => Promise<Exclude<R, void | undefined>>;

type Handler<A extends DataFunctionArgs, C extends object, R> = (args: A, context: C) => Promise<Exclude<R, void | undefined>>;

type InternalMiddleware<A, R extends object | null, C extends object> = (args: A, context: C) => Promise<R>;
type LoaderMiddleware<R extends object | null, C extends object = object> = InternalMiddleware<LoaderFunctionArgs, R, C>;
type ActionMiddleware<R extends object | null, C extends object = object> = InternalMiddleware<ActionFunctionArgs, R, C>;
type Middleware<R extends object | null, C extends object = object> = InternalMiddleware<DataFunctionArgs, R, C>;

type ContextBuilder<A extends DataFunctionArgs, C> = (args: A) => Promise<C>;

type Normalize<R> = R extends null ? object : R;

type LoaderBuilder<C extends object> = {
    with<R extends object | null>(middleware: LoaderMiddleware<R, C>): LoaderBuilder<C & Normalize<R>>;
    build<R>(handler: Handler<LoaderFunctionArgs, C, R>): DataFunction<LoaderFunctionArgs, R>;
    build(): DataFunction<LoaderFunctionArgs, null>;
};

const createLoaderBuilder = <C extends object>(buildContext: ContextBuilder<LoaderFunctionArgs, C>): LoaderBuilder<C> => ({
    with<R extends object | null>(middleware: LoaderMiddleware<R, C>) {
        return createLoaderBuilder(async (args) => {
            const context = await buildContext(args);
            const result = await middleware(args, context);

            return (result === null ? context : { ...context, ...result }) as C & Normalize<R>;
        });
    },

    // handlers must be typed to allow its optionality. The function overloads
    // ensure type safety at the call site, but any must be used to type handler.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    build(handler?: Handler<LoaderFunctionArgs, C, any>) {
        if (handler === undefined) {
            return async () => null;
        }

        return async (args: LoaderFunctionArgs) => {
            const context = await buildContext(args);

            return handler(args, context);
        };
    }
});

const Loader = createLoaderBuilder(async () => ({}));

type ActionBuilder<C extends object> = {
    with<R extends object | null>(middleware: ActionMiddleware<R, C>): ActionBuilder<C & Normalize<R>>;

    // Use of any is necessary to allow different return types for handlers.
    // The return type of the resulting function is infered automatically from their return types.
    // TypeScript cannot express a constraint that allows "any R" while still preserving
    // the ability to infer the union of all handler return types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    build<H extends Record<string, Handler<ActionFunctionArgs, C, any>>>(handlers: H): DataFunction<ActionFunctionArgs, Awaited<ReturnType<H[keyof H]>>>;
};

const createActionBuilder = <C extends object>(buildContext: ContextBuilder<ActionFunctionArgs, C>): ActionBuilder<C> => ({
    with<R extends object | null>(middleware: ActionMiddleware<R, C>) {
        return createActionBuilder(async (args) => {
            const context = await buildContext(args);
            const result = await middleware(args, context);

            return (result === null ? context : { ...context, ...result }) as C & Normalize<R>;
        });
    },

    build(handlers) {
        // The return type cannot be known in advance as handlers can have different return types.
        // Any is necessary because TypeScript cannot express a Record type where each value
        // has a different generic type parameter (R) while maintaining type safety.
        // The actual return type is correctly inferred at the call site through the overload signature.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handlersMap: Record<string, Handler<ActionFunctionArgs, C, any>> = {};

        for (const [ key, handler ] of Object.entries(handlers)) {
            handlersMap[key.toLowerCase()] = handler;
        }

        return async (args) => {
            const method = args.request.method.toLowerCase();
            const handler = handlersMap[method];

            if (!handler) {
                throw new Response("Method not allowed", { status: 405 });
            }

            const context = await buildContext(args);

            return handler(args, context);
        };
    }
});

const Action = createActionBuilder(async () => ({}));

export {
    Loader,
    Action
};

export type {
    Middleware,
    LoaderMiddleware,
    ActionMiddleware
};
