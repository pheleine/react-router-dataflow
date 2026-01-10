<h1 align="center">React Router Dataflow</h1>

<p align="center">A tiny, fully type-safe composer for React Router loaders, actions, and route guards.</p>
<p align="center">
  <a href="https://github.com/pheleine/react-router-dataflow/actions/workflows/ci.yaml"><img src="https://github.com/pheleine/react-router-dataflow/actions/workflows/ci.yaml/badge.svg?branch=master"/></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Strict-blue"/></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-brightgreen.svg"/></a>
</p>

## What is React Router Dataflow?

React Router loaders and actions scale poorly once you start sharing logic.
Context becomes implicit, middleware composition is manual, and type safety quickly degrades.

React Router Dataflow fixes this by letting you compose loaders, actions, and route guards as typed pipelines, producing a fully type-safe execution context per route.

```typescript
import { Loader } from "react-router-dataflow";

const loader = Loader
  .with(parseParams)
  .with(fetchData)
  .build(async (_, { params, data }) => {
    // params and data are guaranteed to be available here
    return data;
  });

// => loader can be used as a standard React Router loader
```


## What problems does it solve?

React Router Dataflow is useful as soon as your routes have different contexts or you start sharing logic between loaders or actions. It makes execution order explicit, context predictable, and removes
the need for defensive runtime checks.

## Installation

```sh
npm install react-router-dataflow
```
```sh
yarn add react-router-dataflow
```
```sh
pnpm add react-router-dataflow
```

## Basic usage

Compose loaders and actions as pipelines with a progressively typed context.

### Define reusable middlewares

```ts
import { LoaderMiddleware, Loader } from "react-router-dataflow";

// Explicitly typed middleware (optional, but recommended)
const mw: LoaderMiddleware<{ data: string }> = async (args) => {
  /* do stuff with args */
  return { data: "OK" };
};

Loader.with(mw);
```

> Middlewares steps (for loader/action context pipelines) can also be typed action-only (`ActionMiddleware`) or universal (`Middleware`).

### Declare middlewares inline

```ts
import { Loader } from "react-router-dataflow";

Loader
  .with(async (args) => {
    /* do stuff with args */
    return { data: "OK" };
  })
  .with(async (_, { data }) => {
    // data is guaranteed here
    return null; // no context enrichment
  });
```

### Build a loader or an action

```ts
import { Loader } from "react-router-dataflow";

// When loader should send data
Loader
  .with(mw)
  .with(async () => ({ additional: 1 }))
  .build(async (_, { data, additional }) => {
    // data and additional are guaranteed here
    return { data, additional };
  });

// When it should not
Loader.with(mw).build();
```

```ts
import { Action } from "react-router-dataflow";

// throws 405 response for any method not handled (ignoring case)
Action.build({
  POST: async (args) => ({ data: "post" }),
  DELETE: async (args) => ({ deleted: true })
});

// Runs middlewares then throws 405 response for any method not handled (ignoring case)
Action
  .with(mw)
  .with(async () => ({ additional: 1 }))
  .build({
    POST: async (_, { data, additional }) => {
      /* data and additional are guaranteed here */
      return { data, additional };
    },
    DELETE: async (_, { data, additional }) => {
      /* data and additional are guaranteed here */
      return { deleted: true };
    }
  });
```

> For more advanced patterns such as context enforcement, parameterized middlewares and middleware factorization, see the [advanced middleware documentation](https://github.com/pheleine/react-router-dataflow/blob/master/docs/advanced_middlewares.md).

## RouteMiddleware - Guarding routes with React Router

React Router Dataflow includes support for building **React Router middlewares** with a fully typed internal pipeline, using the same `with`/`build` builder API as loaders and actions.
`RouteMiddleware` is a builder that produces a **single React Router middleware** suitable for guarding routes and short-circuiting navigation.

> `RouteMiddleware` is not related to middlewares types used by `Loader` and `Action` builders which are composing functions of loaders and actions.

`RouteMiddleware` focuses on composing route guards by letting you compose a sequence of typed steps called **route requirements**.
Each requirement runs before the route is entered, can enrich internal context, and can throw a `Response` to block navigation.
Route requirements can be predefined in the same way as [loaders and actions middlewares](#define-reusable-middlewares) using `RouteRequirement` type.

> `RouteMiddleware` does not support post-processing or response interception.
> If you need a pre/post middleware, write a React Router middleware directly and compose it alongside `RouteMiddleware`.

> *Terminology*
> - **Middleware**: a loader/action pipeline step
> - **RouteMiddleware**: a builder that produces a React Router middleware
> - **RouteRequirement**: a typed guard step executed inside a RouteMiddleware

```typescript
import { RouteMiddleware } from "react-router-dataflow";
import { requireAuth } from "~/guards/require-auth";

// Ensures user is authenticated and has "admin" role
RouteMiddleware
  .with(requireAuth) // => { user }
  .build(async (_, { user }) => {
    if (user.role !== "admin") {
      throw new Response("Unauthorized", { status: 401 });
    }

    return null;
  });
```

## Integration in React Router

Loaders, actions, and route middlewares created with React Router Dataflow are standard React Router primitives and behave the same way on the client and on the server.
They can be used in:
- framework mode (route files)
- data routers (`createBrowserRouter`)
- declarative routes (`<Route loader/>`)

### Framework mode example

```tsx
// app/routes/data.$id.tsx

import { Loader, Action } from "react-router-dataflow";
import { requireAuth } from "~/guards/require-auth";
import { dataFromParams } from "~/middlewares/data-from-params";

// Auth is enforced on the route
export const middleware = [
  RouteMiddleware
    .with(requireAuth)
    .build()
];

// => reached only if authenticated, get data from route params
export const loader = Loader
  .with(dataFromParams) // => { data }
  .build(async (_, { data }) => data);

// => reached only if authenticated, only PATCH/patch requests are handled
export const action = Action
  .with(dataFromParams) // => { data }
  .build({
    PATCH: async ({ request }, { data }) => {
      const updatedData = /* data update using request */;
      return updatedData;
    }
  });

const ExamplePage = () => <h1>Example page</h1>;

export default ExamplePage;
```
