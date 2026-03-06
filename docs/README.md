# MyKino Architecture Documentation

This folder contains comprehensive architectural documentation for the MyKino application.

## Documents

1. **[01-current-architecture.md](./01-current-architecture.md)** - Current repository structure and feature map
2. **[02-data-flow.md](./02-data-flow.md)** - Detailed data flow analysis for key user journeys
3. **[03-storage-layer.md](./03-storage-layer.md)** - IndexedDB schema and storage patterns
4. **[04-external-apis.md](./04-external-apis.md)** - External API integrations (TMDB, AI providers)
5. **[05-architectural-problems.md](./05-architectural-problems.md)** - Identified issues and technical debt
6. **[06-target-architecture.md](./06-target-architecture.md)** - Proposed architecture and folder structure
7. **[07-domain-abstraction.md](./07-domain-abstraction.md)** - Domain model and abstraction strategy
8. **[08-refactoring-plan.md](./08-refactoring-plan.md)** - Step-by-step refactoring roadmap
9. **[09-final-structure.md](./09-final-structure.md)** - Complete target folder structure

## Quick Start

If you're new to this codebase:
1. Start with [01-current-architecture.md](./01-current-architecture.md) to understand what exists
2. Read [05-architectural-problems.md](./05-architectural-problems.md) to understand the issues
3. Review [06-target-architecture.md](./06-target-architecture.md) for the vision
4. Follow [08-refactoring-plan.md](./08-refactoring-plan.md) for implementation

## Context

MyKino is a frontend-only PWA for movie discovery and tracking. It uses:
- React 18 + Vite + TypeScript
- IndexedDB for local storage
- TMDB API for movie data
- Optional AI integration for recommendations
- 8 language support with i18n

The goal of this refactoring is to:
- Extract reusable core logic
- Support multiple media types (movies, books, music, games)
- Improve maintainability and testability
- Enable easier feature development
