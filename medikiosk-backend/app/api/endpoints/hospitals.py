from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/hospitals", tags=["Hospital Master & Isolation"])

_hospitals_master: List[Dict[str, Any]] = [
    {
        "id": "aiims-delhi",
        "name": "AIIMS New Delhi",
        "short_name": "AIIMS Delhi",
        "network_code": "AIIMS-ND-01",
        "type": "All India Institute of Medical Sciences",
        "category": "Apex Institute",
        "city": "New Delhi",
        "state": "Delhi NCR",
        "coordinates": {"lat": 28.5672, "lng": 77.2100},
        "beds": 2478,
        "icu_beds": 310,
        "available_beds": 142,
        "emergency_status": "READY",
        "emergency_helpline": "+91-11-26588500",
        "address": "Sri Aurobindo Marg, Ansari Nagar, New Delhi 110029",
        "departments": [
            {"code": "CARD", "name": "Cardiology & Cardiothoracic", "head": "Dr. Randeep Guleria, MD", "beds": 350, "active_doctors": 18},
            {"code": "NEURO", "name": "Neurology & Neurosurgery", "head": "Dr. Manjari Tripathi, MD", "beds": 280, "active_doctors": 14},
            {"code": "GEN", "name": "Internal Medicine", "head": "Dr. Naval Vikram, MD", "beds": 420, "active_doctors": 22},
            {"code": "EMERG", "name": "Emergency Trauma Center", "head": "Dr. Sanjeev Bhoi, MD", "beds": 160, "active_doctors": 28},
        ],
        "doctors": [
            {"id": "DOC-AIIMS-01", "name": "Dr. Rajesh Sharma, MD", "specialty": "Cardiology", "room": "Room 102", "is_available": True, "queue_count": 8},
            {"id": "DOC-AIIMS-02", "name": "Dr. Ananya Iyer, MD", "specialty": "Neurology", "room": "Room 104", "is_available": True, "queue_count": 5},
            {"id": "DOC-AIIMS-03", "name": "Dr. Sandeep Nair, MS", "specialty": "Orthopedics", "room": "Room 108", "is_available": False, "queue_count": 0},
        ],
        "emergency_desk": {
            "on_duty_nurse": "Sister Sunita R.",
            "crash_team_ready": True,
            "trauma_bays_free": 6,
        },
    },
    {
        "id": "apollo-main",
        "name": "Apollo Hospitals Main Campus",
        "short_name": "Apollo Chennai",
        "network_code": "APOLLO-CHN-01",
        "type": "Multi-Super Specialty Hospital",
        "category": "Super Specialty",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "coordinates": {"lat": 13.0604, "lng": 80.2496},
        "beds": 750,
        "icu_beds": 120,
        "available_beds": 48,
        "emergency_status": "READY",
        "emergency_helpline": "1066",
        "address": "21 Greams Lane, Thousand Lights, Chennai 600006",
        "departments": [
            {"code": "CARD", "name": "Cardiology OPD (Room 304)", "head": "Dr. Rajesh Sharma, MD", "beds": 140, "active_doctors": 12},
            {"code": "GEN", "name": "General Medicine", "head": "Dr. Anita Desai, MD", "beds": 200, "active_doctors": 16},
            {"code": "ORTHO", "name": "Orthopedics & Joint Replacement", "head": "Dr. Sandeep Nair, MS", "beds": 90, "active_doctors": 8},
            {"code": "EMERG", "name": "Emergency Triage", "head": "Dr. K. Srinivas, MD", "beds": 50, "active_doctors": 14},
        ],
        "doctors": [
            {"id": "DOC-CARD-001", "name": "Dr. Rajesh Sharma, MD", "specialty": "Cardiology", "room": "Room 304", "is_available": True, "queue_count": 4},
            {"id": "DOC-GEN-002", "name": "Dr. Anita Desai, MD", "specialty": "General Medicine", "room": "Room 201", "is_available": True, "queue_count": 6},
            {"id": "DOC-PED-003", "name": "Dr. Priya Patel, MD", "specialty": "Pediatrics", "room": "Room 105", "is_available": True, "queue_count": 3},
        ],
        "emergency_desk": {
            "on_duty_nurse": "Sister Mary John",
            "crash_team_ready": True,
            "trauma_bays_free": 4,
        },
    },
    {
        "id": "fortis-healthcare",
        "name": "Fortis Memorial Research Institute",
        "short_name": "Fortis Gurugram",
        "network_code": "FORTIS-NCR-02",
        "type": "Super Specialty Hospital & Research",
        "category": "Super Specialty",
        "city": "Gurugram",
        "state": "Haryana",
        "coordinates": {"lat": 28.4595, "lng": 77.0266},
        "beds": 1000,
        "icu_beds": 180,
        "available_beds": 82,
        "emergency_status": "READY",
        "emergency_helpline": "105010",
        "address": "Sector 44, Opposite HUDA City Centre, Gurugram 122002",
        "departments": [
            {"code": "ONCO", "name": "Medical Oncology", "head": "Dr. Vinod Raina, MD", "beds": 220, "active_doctors": 15},
            {"code": "CARD", "name": "Cardiology", "head": "Dr. T.S. Kler, MD", "beds": 180, "active_doctors": 10},
            {"code": "GEN", "name": "Internal Medicine", "head": "Dr. Anita Desai, MD", "beds": 150, "active_doctors": 12},
        ],
        "doctors": [
            {"id": "DOC-FORT-01", "name": "Dr. Anita Desai, MD", "specialty": "Internal Medicine", "room": "Room 201", "is_available": True, "queue_count": 3},
            {"id": "DOC-FORT-02", "name": "Dr. Sandeep Nair, MS", "specialty": "Orthopedics", "room": "Room 108", "is_available": True, "queue_count": 5},
        ],
        "emergency_desk": {
            "on_duty_nurse": "Sister Pooja V.",
            "crash_team_ready": True,
            "trauma_bays_free": 5,
        },
    },
    {
        "id": "cmc-vellore",
        "name": "CMC Hospital Vellore",
        "short_name": "CMC Vellore",
        "network_code": "CMC-VEL-01",
        "type": "Christian Medical College & Hospital",
        "category": "Academic Medical Center",
        "city": "Vellore",
        "state": "Tamil Nadu",
        "coordinates": {"lat": 12.9246, "lng": 79.1350},
        "beds": 3000,
        "icu_beds": 340,
        "available_beds": 190,
        "emergency_status": "READY",
        "emergency_helpline": "+91-416-2281000",
        "address": "Ida Scudder Road, Vellore 632004",
        "departments": [
            {"code": "IMMUN", "name": "Clinical Immunology", "head": "Dr. David Pulimood, MD", "beds": 180, "active_doctors": 14},
            {"code": "CARD", "name": "Cardiology", "head": "Dr. Oommen George, MD", "beds": 260, "active_doctors": 16},
            {"code": "GASTRO", "name": "Gastroenterology", "head": "Dr. C.E. Eapen, MD", "beds": 220, "active_doctors": 12},
        ],
        "doctors": [
            {"id": "DOC-CMC-01", "name": "Dr. Rajesh Sharma, MD", "specialty": "Cardiology", "room": "Room 114", "is_available": True, "queue_count": 7},
            {"id": "DOC-CMC-02", "name": "Dr. Priya Patel, MD", "specialty": "Pediatrics", "room": "Room 102", "is_available": True, "queue_count": 4},
        ],
        "emergency_desk": {
            "on_duty_nurse": "Sister Rachel S.",
            "crash_team_ready": True,
            "trauma_bays_free": 8,
        },
    },
]


class UpdateHospitalProfileInput(BaseModel):
    name: Optional[str] = None
    emergency_helpline: Optional[str] = None
    address: Optional[str] = None
    beds: Optional[int] = None
    icu_beds: Optional[int] = None
    emergency_status: Optional[str] = "READY"


@router.get("", response_model=Dict[str, Any])
def list_hospitals():
    """Returns all registered hospitals in Hospital Master."""
    return {
        "success": True,
        "count": len(_hospitals_master),
        "hospitals": _hospitals_master,
    }


@router.get("/{hospital_id}", response_model=Dict[str, Any])
def get_hospital_by_id(hospital_id: str):
    """Returns isolated hospital profile by ID."""
    for h in _hospitals_master:
        if h["id"] == hospital_id:
            return {"success": True, "hospital": h}
    return {"success": True, "hospital": _hospitals_master[0]}


@router.put("/{hospital_id}", response_model=Dict[str, Any])
def update_hospital_profile(hospital_id: str, req: UpdateHospitalProfileInput):
    """Hospital Admin updates profile, emergency contacts, or bed capacity."""
    for h in _hospitals_master:
        if h["id"] == hospital_id:
            if req.name:
                h["name"] = req.name
            if req.emergency_helpline:
                h["emergency_helpline"] = req.emergency_helpline
            if req.address:
                h["address"] = req.address
            if req.beds is not None:
                h["beds"] = req.beds
            if req.icu_beds is not None:
                h["icu_beds"] = req.icu_beds
            if req.emergency_status:
                h["emergency_status"] = req.emergency_status
            return {"success": True, "message": "Hospital profile updated successfully", "hospital": h}

    raise HTTPException(status_code=404, detail="Hospital not found")
