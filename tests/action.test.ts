import { describe, expect, expectTypeOf, it } from "vitest";
import { Action, ActionMiddleware, Middleware } from "../src/index";
import { ActionFunctionArgs } from "react-router";

const MOCK_ARGS_POST = {
    params: { id: "test" },
    request: new Request("http://example.com", { method: "POST" }),
    context: {},
    unstable_pattern: ""
};

const MOCK_ARGS_DELETE = {
    params: { id: "test" },
    request: new Request("http://example.com", { method: "DELETE" }),
    context: {},
    unstable_pattern: ""
};

describe("Action builder", () => {
    it("should build with handlers and use the handler according to request method", async () => {
        const action = Action.build({
            POST: async () => "post",
            delete: async () => 1
        });

        expectTypeOf(action).toEqualTypeOf<(args: ActionFunctionArgs) => Promise<string | number>>();

        const resultPOST = await action(MOCK_ARGS_POST);
        const resultDELETE = await action(MOCK_ARGS_DELETE);

        expect(resultPOST).toBe("post");
        expect(resultDELETE).toBe(1);
    });

    it("should pass given args to the handlers", async () => {
        const action = Action.build({
            POST: async (args) => {
                expectTypeOf(args).toEqualTypeOf<ActionFunctionArgs>();
                expect(args).toStrictEqual(MOCK_ARGS_POST);

                return "post";
            },
            DELETE: async (args) => {
                expectTypeOf(args).toEqualTypeOf<ActionFunctionArgs>();
                expect(args).toStrictEqual(MOCK_ARGS_DELETE);

                return 1;
            }
        });

        const resultPOST = await action(MOCK_ARGS_POST);
        const resultDELETE = await action(MOCK_ARGS_DELETE);

        expect(resultPOST).toBe("post");
        expect(resultDELETE).toBe(1);
    });

    it("should throw method not allowed when there is no correpsonding handler", async () => {
        const action = Action.build({
            POST: async ({ request }) => request.method
        });

        await expect(() => action(MOCK_ARGS_DELETE)).rejects.toThrow();

        try {
            await action(MOCK_ARGS_DELETE);
        } catch (error) {
            expect(error).toBeInstanceOf(Response);

            const thrownResponse = error as Response;
            const message = await thrownResponse.text();

            expect(thrownResponse.status).toBe(405);
            expect(message).toBe("Method not allowed");
        }
    });
});

describe("Action builder intermediate steps", () => {
    it("should enrich context with inline middlewares", async () => {
        const action = Action
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
            .build({
                POST: async (_, context) => {
                    expectTypeOf(context).toMatchObjectType<{
                        first: boolean;
                        second: string;
                    }>();
                    expect(context).toStrictEqual({
                        first: true,
                        second: "second"
                    });

                    return "post";
                },
                delete: async (_, context) => {
                    expectTypeOf(context).toMatchObjectType<{
                        first: boolean;
                        second: string;
                    }>();
                    expect(context).toStrictEqual({
                        first: true,
                        second: "second"
                    });

                    return 1;
                }
            });

        const resultPOST = await action(MOCK_ARGS_POST);
        const resultDELETE = await action(MOCK_ARGS_DELETE);

        expect(resultPOST).toBe("post");
        expect(resultDELETE).toBe(1);
    });

    it("should enrich context with predefined middlewares", async () => {
        const withPredefined: Middleware<{ withPredefined: string }> = async () => {
            return {
                withPredefined: "withPredefined"
            };
        };

        const requirePredefined: ActionMiddleware<{ requirePredefined: boolean }> = async () => {
            return {
                requirePredefined: true
            };
        };

        const action = Action
            .with(withPredefined)
            .with(requirePredefined)
            .build({
                POST: async (_, context) => {
                    expectTypeOf(context).toMatchObjectType<{
                        withPredefined: string;
                        requirePredefined: boolean;
                    }>();

                    expect(context).toStrictEqual({
                        withPredefined: "withPredefined",
                        requirePredefined: true
                    });

                    return "post";
                },
                delete: async (_, context) => {
                    expectTypeOf(context).toMatchObjectType<{
                        withPredefined: string;
                        requirePredefined: boolean;
                    }>();

                    expect(context).toStrictEqual({
                        withPredefined: "withPredefined",
                        requirePredefined: true
                    });

                    return 1;
                }
            });

        const resultPOST = await action(MOCK_ARGS_POST);
        const resultDELETE = await action(MOCK_ARGS_DELETE);

        expect(resultPOST).toBe("post");
        expect(resultDELETE).toBe(1);
    });

    it ("should not enrich context with middleware returning null", async () => {
        const action = Action
            .with(async () => ({ first: true }))
            .with(async () => ({ second: true }))
            .with(async () => null)
            .build({
                POST: async (_, context) => {
                    expectTypeOf(context).toMatchObjectType<{
                        first: boolean;
                        second: boolean;
                    }>();
                    expect(context).toStrictEqual({ first: true, second: true });

                    return "post";
                },
                delete: async (_, context) => {
                    expectTypeOf(context).toMatchObjectType<{
                        first: boolean;
                        second: boolean;
                    }>();
                    expect(context).toStrictEqual({ first: true, second: true });

                    return 1;
                }
            });

        const resultPOST = await action(MOCK_ARGS_POST);
        const resultDELETE = await action(MOCK_ARGS_DELETE);

        expect(resultPOST).toBe("post");
        expect(resultDELETE).toBe(1);
    });

    it("should receive the args given to the action", async () => {
        const predefined: ActionMiddleware<{ predefined: boolean }> = async (args) => {
            expectTypeOf(args).toEqualTypeOf<ActionFunctionArgs>();
            expect(args).toStrictEqual(MOCK_ARGS_POST);

            return {
                predefined: true
            };
        };

        const action = Action
            .with(predefined)
            .with(async (args) => {
                expectTypeOf(args).toEqualTypeOf<ActionFunctionArgs>();
                expect(args).toStrictEqual(MOCK_ARGS_POST);

                return {
                    inline: true
                };
            })
            .build({
                POST: async () => "post"
            });

        const result = await action(MOCK_ARGS_POST);

        expect(result).toBe("post");
    });
});
