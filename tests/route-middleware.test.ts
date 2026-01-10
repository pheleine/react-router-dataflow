import { describe, expect, expectTypeOf, it } from "vitest";
import { RouteMiddleware, RouteRequirement } from "../src";
import { RouteMiddlewareArgs } from "../src/route-middleware";

const MOCK_ARGS = {
    params: { id: "test" },
    request: new Request("http://example.com", { method: "GET" }),
    // Any is used to mock the RouterContextProvider of React Router for testing.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context: {} as any,
    unstable_pattern: ""
};
const MOCK_NEXT = async () => new Response();
const CUSTOM_RESPONSE = new Response(null, { statusText: "custom response" });

describe("Route Middleware Builder", () => {
    it("should build with an empty handler", async () => {
        const routeMiddleware = RouteMiddleware.build();
        const result = await routeMiddleware(MOCK_ARGS, MOCK_NEXT);

        expect(result).toStrictEqual(await MOCK_NEXT());
    });

    it("should build with a handler that returns nothing", async () => {
        const routeMiddleware = RouteMiddleware.build(async () => {
            return null;
        });
        const result = await routeMiddleware(MOCK_ARGS, MOCK_NEXT);

        expect(result).toStrictEqual(await MOCK_NEXT());
    });

    it("should build with a handler that returns a Response", async () => {
        const routeMiddleware = RouteMiddleware.build(async () => {
            return CUSTOM_RESPONSE;
        });
        const result = await routeMiddleware(MOCK_ARGS, MOCK_NEXT);

        expect(result).toStrictEqual(CUSTOM_RESPONSE);
    });

    it("should pass function args to the handler", async () => {
        const routeMiddleware = RouteMiddleware.build(async (args) => {
            expectTypeOf(args).toEqualTypeOf<RouteMiddlewareArgs>();
            expect(args).toMatchObject({
                request: MOCK_ARGS.request,
                params: MOCK_ARGS.params
            });

            return null;
        });

        await routeMiddleware(MOCK_ARGS, MOCK_NEXT);
    });
});

describe("Route Middleware builder intermediate steps", () => {
    it("should enrich context with inline requirements", async () => {
        const routeMiddleware = RouteMiddleware
            .with(async () => {
                return {
                    first: true
                };
            })
            .with(async (_, context) => {
                expectTypeOf(context).toMatchObjectType<{ first: boolean }>();
                expect(context).toStrictEqual({ first: true });

                return {
                    second: "second"
                };
            })
            .build(async (_, context) => {
                expectTypeOf(context).toMatchObjectType<{
                    first: boolean;
                    second: string;
                }>();
                expect(context).toStrictEqual({
                    first: true,
                    second: "second"
                });

                return null;
            });

        await routeMiddleware(MOCK_ARGS, MOCK_NEXT);
    });

    it("should enrich context with predefined requirements", async () => {
        const requireOne: RouteRequirement<{ requireOne: string }> = async () => {
            return { requireOne: "requireOne" };
        };

        const requireTwo: RouteRequirement<{ requireTwo: string }> = async () => {
            return { requireTwo: "requireTwo" };
        };

        const routeMiddleware = RouteMiddleware
            .with(requireOne)
            .with(requireTwo)
            .build(async (_, context) => {
                expectTypeOf(context).toMatchObjectType<{
                    requireOne: string;
                    requireTwo: string;
                }>();
                expect(context).toStrictEqual({
                    requireOne: "requireOne",
                    requireTwo: "requireTwo"
                });

                return null;
            });

        await routeMiddleware(MOCK_ARGS, MOCK_NEXT);
    });

    it("should not enrich context if requirements return null", async () => {
        const routeMiddleware = RouteMiddleware
            .with(async () => ({ first: true }))
            .with(async () => ({ second: true }))
            .with(async () => null)
            .build(async (_, context) => {
                expectTypeOf(context).toMatchObjectType<{
                    first: boolean;
                    second: boolean;
                }>();
                expect(context).toStrictEqual({ first: true, second: true });

                return null;
            });

        await routeMiddleware(MOCK_ARGS, MOCK_NEXT);
    });

    it("should receive the args given to the route middleware", async () => {
        const routeMiddleware = RouteMiddleware
            .with(async (args) => {
                expectTypeOf(args).toEqualTypeOf<RouteMiddlewareArgs>();
                expect(args).toMatchObject({
                    request: MOCK_ARGS.request,
                    params: MOCK_ARGS.params
                });

                return null;
            })
            .build();

        await routeMiddleware(MOCK_ARGS, MOCK_NEXT);
    });
});

describe("Requirements on the route middleware usage", () => {
    it("should be executed with default build", async () => {
        let called = false;

        const routeMiddleware = RouteMiddleware
            .with(async () => {
                called = true;

                return null;
            })
            .build();

        await routeMiddleware(MOCK_ARGS, MOCK_NEXT);

        expect(called).toBe(true);
    });

    it("should be executed with custom build", async () => {
        let called = false;

        const routeMiddleware = RouteMiddleware
            .with(async () => {
                called = true;

                return null;
            })
            .build(async () => null);

        await routeMiddleware(MOCK_ARGS, MOCK_NEXT);

        expect(called).toBe(true);
    });
});
