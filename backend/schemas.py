from __future__ import annotations

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    month: str
    day_of_week: str
    junction_control: str
    junction_detail: str
    light_conditions: str
    road_surface_conditions: str
    road_type: str
    speed_limit: int = Field(ge=10, le=120)
    urban_or_rural_area: str
    weather_conditions: str
    vehicle_type: str
    number_of_casualties: int = Field(ge=0, le=20)
    number_of_vehicles: int = Field(ge=1, le=20)
    accident_time: str = Field(default="12:00")

