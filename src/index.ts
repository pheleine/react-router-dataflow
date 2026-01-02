import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";

type DataFunctionArgs = LoaderFunctionArgs | ActionFunctionArgs;
type DataFunction<A extends DataFunctionArgs, R> = (args: A) => Promise<R>;

type Handler<A extends DataFunctionArgs, C extends object, R> = (args: A, context: C) => Promise<R>;

// Any must be used to allow the provided context building through the pipeline.
// TypeScript cannot express "any object type" for the context parameter without any,
// as the middleware needs to accept any context type that may have been built up
// through the chain of with() calls.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Middleware<A extends DataFunctionArgs, AddedContext extends object, ProvidedContext extends object = any> = (args: A, context: ProvidedContext) => Promise<AddedContext>;

type ContextBuilder<A extends DataFunctionArgs, C> = (args: A) => Promise<C>;

type LoaderBuilder<C extends object> = {
    with<AddedContext extends object>(middleware: Middleware<LoaderFunctionArgs, AddedContext, C>): LoaderBuilder<C & AddedContext>;
    build<R>(handler: Handler<LoaderFunctionArgs, C, R>): DataFunction<LoaderFunctionArgs, R>;
    build(): DataFunction<LoaderFunctionArgs, null>;
};

const createLoaderBuilder = <C extends object>(buildContext: ContextBuilder<LoaderFunctionArgs, C>): LoaderBuilder<C> => ({
    with(middleware) {
        return createLoaderBuilder(async (args) => {
            const context = await buildContext(args);

            return {
                ...context,
                ...(await middleware(args, context))
            };
        });
    },

    // Any is necessary here because the implementation must accept handlers with any return type R.
    // The function overloads ensure type safety at the call site, but the implementation
    // cannot be typed without any since it must handle all possible R types simultaneously.
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
    with<AddedContext extends object>(middleware: Middleware<ActionFunctionArgs, AddedContext, C>): ActionBuilder<C & AddedContext>;

    // Use of any is necessary to allow any return type for handlers.
    // The return type of the resulting function is infered automatically from their return type.
    // TypeScript cannot express a constraint that allows "any R" while still preserving
    // the ability to infer the union of all handler return types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    build<H extends Record<string, Handler<ActionFunctionArgs, C, any>>>(handlers: H): DataFunction<ActionFunctionArgs, Awaited<ReturnType<H[keyof H]>>>;
};

const createActionBuilder = <C extends object>(buildContext: ContextBuilder<ActionFunctionArgs, C>): ActionBuilder<C> => ({
    with(middleware) {
        return createActionBuilder(async (args) => {
            const context = await buildContext(args);

            return {
                ...context,
                ...(await middleware(args, context))
            };
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

        return async (args: ActionFunctionArgs) => {
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
    Middleware
};
