from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class RiskTolerance(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


class NotificationFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    REAL_TIME = "real_time"
    OFF = "off"


class FinancialProfile(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    monthly_budget: Optional[float] = None
    fee_obligations: List[dict] = Field(default_factory=list)  # [{label, amount, due_date}]
    income_sources: List[str] = Field(default_factory=list)
    side_hustle_type: Optional[str] = None
    hostel_fee: Optional[float] = None
    tuition_amount: Optional[float] = None
    risk_tolerance: RiskTolerance = RiskTolerance.MODERATE

    # compatibility with intelligence_service
    risk_preference: Optional[str] = None
    capital_range: Optional[str] = None
    monthly_income: Optional[float] = None

    # Academic calendar — feeds λt (exam-proximity modifier) in Kelly Criterion
    # Set these to get exam-aware capital protection
    next_exam_date: Optional[str] = None       # ISO date string e.g. "2026-07-15"
    semester_start_date: Optional[str] = None  # ISO date string e.g. "2026-01-15"
    semester_length_days: Optional[int] = Field(default=120, ge=30, le=200)
    days_to_exam: Optional[int] = None         # computed/overrideable


class PreferencesProfile(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    currency: str = "NGN"
    language: str = "en"
    stress_alert_threshold: int = Field(60, ge=0, le=100)
    auto_lock_on_crisis: bool = True
    show_bayse_prices: bool = True
    plain_english_mode: bool = True

    # compatibility with intelligence_service
    primary_goal: Optional[str] = None
    decision_aggressiveness: Optional[int] = None
    stress_sensitivity: Optional[int] = None


class NotificationsProfile(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    stress_alerts: bool = True
    weekly_bq_report: bool = True
    decision_reminders: bool = True
    bayse_spike_alerts: bool = True
    frequency: NotificationFrequency = NotificationFrequency.DAILY


class UserProfile(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    uid: str
    email: str
    name: str
    picture: Optional[str] = None
    university: Optional[str] = None
    department: Optional[str] = None
    level: Optional[str] = None
    financial: FinancialProfile = Field(default_factory=FinancialProfile)
    preferences: PreferencesProfile = Field(default_factory=PreferencesProfile)
    notifications: NotificationsProfile = Field(default_factory=NotificationsProfile)


class UpdateProfileRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    name: Optional[str] = None
    university: Optional[str] = None
    department: Optional[str] = None
    level: Optional[str] = None
    financial: Optional[FinancialProfile] = None
    preferences: Optional[PreferencesProfile] = None
    notifications: Optional[NotificationsProfile] = None


class ProfileResponse(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    success: bool
    data: UserProfile