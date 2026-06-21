import type { MiddlewareFunction } from "react-router";
import { Normalize, ContextBuilder } from "./shared-types";

type RouteMiddlewareArgs = Parameters<MiddlewareFunction>[0];

type RouteRequirement<R extends object | null, C extends object = object> = (args: RouteMiddlewareArgs, context: C) => Promise<R>;
type RouteMiddlewareHandler<C> = (args: RouteMiddlewareArgs, context: C) => Promise<Response | null>;

type RouteMiddlewareBuilder<C extends object> = {
    with<R extends object | null>(requirement: RouteRequirement<R, C>): RouteMiddlewareBuilder<C & Normalize<R>>;
    build(handler: RouteMiddlewareHandler<C>): MiddlewareFunction;
    build(): MiddlewareFunction;
};

const createRouteMiddlewareBuilder = <C extends object>(buildContext: ContextBuilder<RouteMiddlewareArgs, C>): RouteMiddlewareBuilder<C> => ({
    with<R extends object | null>(requirement: RouteRequirement<R, C>) {
        return createRouteMiddlewareBuilder(async (args) => {
            const context = await buildContext(args);
            const result = await requirement(args, context);

            return (result === null ? context : { ...context, ...result }) as C & Normalize<R>;
        });
    },
    build(handler?: RouteMiddlewareHandler<C>) {
        return async (args, next) => {
            const context = await buildContext(args);

            if (handler === undefined) {
                return next();
            }

            return (await handler(args, context)) ?? next();
        };
    }
});

const RouteMiddleware = createRouteMiddlewareBuilder(async () => ({}));

export { RouteMiddleware };

export type {
    RouteRequirement,
    RouteMiddlewareArgs
};
