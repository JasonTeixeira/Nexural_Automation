"""Scenario-driven, safety-first Automation Academy domain package."""

from .catalog import CurriculumCatalog
from .service import AcademyService

__all__ = ["AcademyService", "CurriculumCatalog"]
