# Advanced middlewares

This page covers advanced middleware patterns supported by React Router Dataflow, such as context enforcement, parameterized middlewares, and composition factorization.

## Enforcing context

**TypeScript only**

You can enforce the context of predefined middlewares by giving a second generic parameter to any middleware type (`Middleware`, `LoaderMiddleware` or `ActionMiddleware`). The middleware will then only be composable in a pipeline whose accumulated context satisfies its requirements. Middlewares can be freely interleaved as long as the context requirements are satisfied.

The following examples illustrate how context requirements are enforced through middleware ordering.

```typescript
import { LoaderMiddleware, Loader } from "react-router-dataflow";
import { redirect } from "react-router";
import { requireAuth } from "~/middlewares/require-auth";
import type { User } from "~/types";

const requireAdmin: LoaderMiddleware<null, { user: User }> = async (_, { user }) => {
  if (user.role !== "admin") {
    throw redirect("/unauthorized");
  }
  
  return null;
};

// Invalid => required context is never provided
Loader
  .with(requireAdmin) // TypeScript error
  .build();

// Invalid => required context is provided too late
Loader
  .with(requireAdmin) // TypeScript error
  .with(requireAuth) // => provides { user }
  .build();

// Valid => required context is available when needed
Loader
  .with(requireAuth) // => provides { user }
  .with(requireAdmin)
  .build();
```

## Parameterized middlewares

Some middlewares need to be configured at usage time rather than being fully static. This pattern allows defining reusable middleware factories.

```typescript
import { LoaderMiddleware, Loader } from "react-router-dataflow";
import { redirect } from "react-router";
import { requireAuth } from "~/middlewares/require-auth";
import type { User } from "~/types";

const requireRole = (role: User["role"]): LoaderMiddleware<null, { user: User }> => {
  return async (_, { user }) => {
    if (user.role !== role) {
      throw redirect("/unauthorized");
    }
    
    return null;
  };
};

Loader
  .with(requireAuth) // => provides { user }
  .with(requireRole("admin"))
  .build();
```

## Factorize middleware compositions


Some middleware compositions are reused across multiple routes. Rather than repeating the same sequence, they can be factorized into reusable loader or action builders. This pattern is especially useful for defining common access policies shared across multiple routes.

```typescript
import { Loader } from "react-router-dataflow";
import { requireAuth } from "~/middlewares/require-auth";
import { requireRole } from "~/middlewares/require-role";

// Factorize
const adminLoader = Loader
  .with(requireAuth)
  .with(requireRole("admin"));

// Reuse
const loader = adminLoader.build(async () => {
  // admin-only loader logic
  return null;
});
```
