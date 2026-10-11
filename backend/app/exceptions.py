"""Domain exceptions.

Kept small and explicit so API handlers can translate them into HTTP responses
without leaking implementation detail.
"""

from __future__ import annotations


class SikhyaSetuError(Exception):
    """Base class for domain errors."""


class ProfileNotFoundError(SikhyaSetuError):
    def __init__(self, profile_id: str) -> None:
        super().__init__(f"Learner profile not found: {profile_id}")
        self.profile_id = profile_id


class ConceptNotFoundError(SikhyaSetuError):
    def __init__(self, concept_id: str) -> None:
        super().__init__(f"Concept not found: {concept_id}")
        self.concept_id = concept_id


class InvalidPackError(SikhyaSetuError):
    """Raised when a pack fails integrity verification."""
