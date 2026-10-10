# Backend

The backend is structured as a FastAPI service aligned to the SikhyaSetu proposal. It is organized around the API layer, domain rules, agent orchestration, and content validation required for offline-first learning adaptation.

## Core responsibilities

- learner and lesson-pack APIs
- event ingestion and idempotent sync processing
- misconception-state and planning logic
- pack compilation and teacher-action brief generation
- SQLite-first persistence with PostgreSQL-ready layering

## Scope

This codebase is intentionally a proposal-aligned scaffold, not a full production implementation. It preserves the service boundaries needed to support the MVP architecture described in the proposal.
