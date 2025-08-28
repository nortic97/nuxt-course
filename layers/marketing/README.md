# Marketing Layer

## Description

The `marketing` layer contains all public-facing pages and components designed to showcase the product, attract new users, and provide general information. This includes the landing page, pricing information, feature descriptions, and contact forms.

This layer is decoupled from the core application logic (like `chat` and `auth`) and focuses purely on presentation and user acquisition.

## Key Components

- `app/`
  - `components/`: Specific components for marketing pages, such as `HeroSection.vue`, `FeatureGrid.vue`, or `PricingTable.vue`.
  - `pages/`: Publicly accessible pages like `pricing.vue`, `about.vue`, or `contact.vue`.

- `nuxt.config.ts`: Layer-specific configuration, which might include settings for SEO, analytics, or specific marketing-related modules.

## Configuration

This layer extends the `base` layer but typically does not depend on the `auth` or `chat` layers. Its primary purpose is to serve static or semi-static content to unauthenticated visitors. It may include its own set of dependencies for animations, analytics tracking, or SEO optimization.
