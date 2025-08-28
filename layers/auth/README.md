# Auth Layer

## Description

The `auth` layer is responsible for everything related to user authentication and session management. It integrates with `sidebase-auth` to provide functionalities like login, logout, and session handling.

This layer ensures that protected routes are only accessible to authenticated users and provides the necessary tools to manage user data throughout the application.

## Key Components

- `app/`
  - `middleware/`: Contains route middleware, such as `auth.ts`, which protects pages from unauthenticated access.
  - `pages/`: Includes authentication-related pages like `login.vue` and `register.vue`.

- `server/`
  - `api/auth/`: Endpoints provided by `sidebase-auth` to handle authentication flows (e.g., callbacks from OAuth providers).

- `nuxt.config.ts`: Configures the `sidebase-auth` module, defining authentication providers (like GitHub, Google) and session management strategies.

## Configuration

This layer extends the `base` layer and adds authentication capabilities. It is configured to work with environment variables for sensitive data like OAuth client IDs and secrets.

The global `auth` middleware is defined here, which can be easily applied to any page in other layers by adding `definePageMeta({ middleware: 'auth' })`.
