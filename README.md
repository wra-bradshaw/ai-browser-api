# ai-browser-api

This project is a work in progress. The architecture is taking shape, package boundaries are still evolving, and the public developer experience should be treated as experimental for now.

## Mission

`ai-browser-api` aims to make browser-based AI integrations feel like a normal application platform instead of a collection of one-off hacks.

The long-term goal is to provide a typed bridge between web apps and a browser extension runtime so applications can:

- discover available models and providers from the browser environment,
- run AI SDK-compatible model calls through a trusted bridge,
- stream chat and model responses with stable transport boundaries, and
- build richer UX on top of shared contracts, codecs, and runtime services.

