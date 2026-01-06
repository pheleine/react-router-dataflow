<h1 align="center">React Router Dataflow</h1>

<p align="center">A tiny, fully type-safe composer for React Router loaders and actions</p>
<p align="center">
  <a href="https://github.com/pheleine/react-router-dataflow/actions/workflows/ci.yaml"><img src="https://github.com/pheleine/react-router-dataflow/actions/workflows/ci.yaml/badge.svg?branch=master"/></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Strict-blue"/></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-brightgreen.svg"/></a>
</p>

## What is React Router Dataflow?

React Router loaders and actions scale poorly once you start sharing logic.
Context becomes implicit, middleware composition is manual, and type safety quickly degrades.

React Router Dataflow fixes this by letting you compose loaders and actions as
typed middleware pipelines, producing a fully type-safe context per route.

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

> Middlewares can also be typed action-only (`ActionMiddleware`) or universal (`Middleware`).

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

## Integration in React Router

Loaders and actions created with React Router Dataflow are standard React Router data functions and behave the same way on the client and on the server.
They can be used in:
- framework mode (route files)
- data routers (`createBrowserRouter`)
- declarative routes (`<Route loader/>`)

### Framework mode example

```tsx
// app/routes/example.tsx

import { Loader, Action } from "react-router-dataflow";
import { requireAuth } from "~/middlewares/require-auth";

// Auth is enforced, no data is returned
export const loader = Loader.with(requireAuth).build();

// Auth is enforced, only PATCH/patch requests are handled
export const action = Action.with(requireAuth).build({
  PATCH: async ({ request }) => {
    const updatedData = /* data update using request */;
    return { updatedData };
  }
});

const ExamplePage = () => <h1>Example page</h1>;

export default ExamplePage;
```
