import { describe, expect, expectTypeOf, it } from "vitest";
import { Loader, LoaderMiddleware, Middleware } from "../src/index";
import { LoaderFunctionArgs, RouterContextProvider } from "react-router";

const MOCK_ARGS: LoaderFunctionArgs = {
    params: { id: "test" },
    url: new URL("http://example.com"),
    request: new Request("http://example.com", { method: "GET" }),
    context: {} as Readonly<RouterContextProvider>,
    pattern: ""
};

describe("Loader builder", () => {
    it("should build with an empty handler", async () => {
        const loader = Loader.build();

        expectTypeOf(loader).toEqualTypeOf<(args: LoaderFunctionArgs) => Promise<null>>();

        const result = await loader(MOCK_ARGS);

        expect(result).toBeNull();
    });

    it("should build with a handler", async () => {
        const loader = Loader.build(async () => {
            return {
                isWorking: true
            };
        });

        expectTypeOf(loader).toEqualTypeOf<(args: LoaderFunctionArgs) => Promise<{ isWorking: boolean }>>();

        const result = await loader(MOCK_ARGS);

        expect(result).toStrictEqual({ isWorking: true });
    });

    it("should pass given args to the handler", async () => {
        const loader = Loader.build(async (args) => {
            expectTypeOf(args).toEqualTypeOf<LoaderFunctionArgs>();
            expect(args).toStrictEqual(MOCK_ARGS);

            return null;
        });

        const result = await loader(MOCK_ARGS);

        expect(result).toBeNull();
    });
});

describe("Loader builder intermediate steps", () => {
    it("should enrich context with inline middlewares", async () => {
        const loader = Loader
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

                return {
                    isWorking: true,
                    ...context
                };
            });

        const result = await loader(MOCK_ARGS);

        expect(result).toStrictEqual({
            isWorking: true,
            first: true,
            second: "second"
        });
    });

    it("should enrich context with predefined middlewares", async () => {
        const withPredefined: Middleware<{ withPredefined: string }> = async () => {
            return {
                withPredefined: "withPredefined"
            };
        };

        const requirePredefined: LoaderMiddleware<{ requirePredefined: boolean }> = async () => {
            return {
                requirePredefined: true
            };
        };

        const loader = Loader
            .with(withPredefined)
            .with(requirePredefined)
            .build(async (_, context) => {
                expectTypeOf(context).toMatchObjectType<{
                    withPredefined: string;
                    requirePredefined: boolean;
                }>();

                expect(context).toStrictEqual({
                    withPredefined: "withPredefined",
                    requirePredefined: true
                });

                return null;
            });

        const result = await loader(MOCK_ARGS);

        expect(result).toBeNull();
    });

    it ("should not enrich context with middleware returning null", async () => {
        const loader = Loader
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

        const result = await loader(MOCK_ARGS);

        expect(result).toBeNull();
    });

    it("should receive the args given to the loader", async () => {
        const predefined: LoaderMiddleware<{ predefined: boolean }> = async (args) => {
            expectTypeOf(args).toEqualTypeOf<LoaderFunctionArgs>();
            expect(args).toStrictEqual(MOCK_ARGS);

            return {
                predefined: true
            };
        };

        const loader = Loader
            .with(predefined)
            .with(async (args) => {
                expectTypeOf(args).toEqualTypeOf<LoaderFunctionArgs>();
                expect(args).toStrictEqual(MOCK_ARGS);

                return {
                    inline: true
                };
            })
            .build();

        const result = await loader(MOCK_ARGS);

        expect(result).toBeNull();
    });
});

describe("Middlewares on the loader usage", () => {
    it("should be executed with default build", async () => {
        let called = false;

        const loader = Loader
            .with(async () => {
                called = true;

                return null;
            })
            .build();

        await loader(MOCK_ARGS);

        expect(called).toBe(true);
    });

    it("should be executed with custom build", async () => {
        let called = false;

        const loader = Loader
            .with(async () => {
                called = true;

                return null;
            })
            .build(async () => null);

        await loader(MOCK_ARGS);

        expect(called).toBe(true);
    });
});
