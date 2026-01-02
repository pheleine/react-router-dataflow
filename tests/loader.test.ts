import { describe, expect, expectTypeOf, it } from "vitest";
import { Loader, Middleware } from "../src/index";
import { LoaderFunctionArgs } from "react-router";

const MOCK_ARGS = {
    params: { id: "test" },
    request: new Request("http://example.com", { method: "GET" }),
    context: {},
    unstable_pattern: ""
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
    it("should enrich context for next intermediate steps and final build", async () => {
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
        const withPredefined: Middleware<LoaderFunctionArgs, { withPredefined: string }> = async () => {
            return {
                withPredefined: "withPredefined"
            };
        };

        const requirePredefined: Middleware<LoaderFunctionArgs, { requirePredefined: boolean }> = async () => {
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

    it("should receive the args given to the loader", async () => {
        const predefined: Middleware<LoaderFunctionArgs, { predefined: boolean }> = async (args) => {
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
