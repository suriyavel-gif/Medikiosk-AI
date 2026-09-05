import hashlib
from datetime import datetime, timezone, timedelta, time
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.models import (
    Prescription,
    PrescriptionItem,
    Medicine,
    MedicineIntakeSchedule,
    Visit,
    Doctor,
    Patient,
    IntakeFrequencyEnum,
    AuditActionEnum,
)
from app.schemas.prescription import (
    PrescriptionCreateRequest,
    PrescriptionDetailResponse,
    PrescriptionItemResponse,
    MedicineScheduleSlotResponse,
    MedicineCreateRequest,
    MedicineResponse,
)
from app.services.audit_service import AuditService


class PrescriptionService:
    @staticmethod
    def create_medicine(db: Session, req: MedicineCreateRequest) -> MedicineResponse:
        """Add medicine to master formulary."""
        med = Medicine(
            brand_name=req.brand_name.strip(),
            generic_name=req.generic_name.strip(),
            form=req.form,
            strength=req.strength.strip(),
            manufacturer=req.manufacturer,
            rxnorm_cui=req.rxnorm_cui,
            is_antibiotic=req.is_antibiotic,
            is_narcotic_controlled=req.is_narcotic_controlled,
        )
        db.add(med)
        db.commit()
        db.refresh(med)
        return MedicineResponse.model_validate(med)

    @staticmethod
    def search_medicines(db: Session, query_str: str) -> List[MedicineResponse]:
        """Search medicines by brand or generic name."""
        q = query_str.strip()
        meds = db.query(Medicine).filter(
            (Medicine.brand_name.ilike(f"%{q}%")) | (Medicine.generic_name.ilike(f"%{q}%"))
        ).limit(25).all()
        return [MedicineResponse.model_validate(m) for m in meds]

    @staticmethod
    def _generate_intake_slots(
        prescription_item_id: str,
        patient_id: str,
        frequency: IntakeFrequencyEnum,
        duration_days: int,
        dosage_amount: str,
    ) -> List[MedicineIntakeSchedule]:
        """Generate individualized intake schedule time slots for the full course."""
        schedules = []
        now = datetime.now(timezone.utc)
        base_date = now.date()

        # Define daily time distribution
        time_slots = {
            IntakeFrequencyEnum.ONCE_DAILY: [time(9, 0)],
            IntakeFrequencyEnum.TWICE_DAILY: [time(9, 0), time(21, 0)],
            IntakeFrequencyEnum.THRICE_DAILY: [time(8, 0), time(14, 0), time(20, 0)],
            IntakeFrequencyEnum.FOUR_TIMES_DAILY: [time(8, 0), time(12, 0), time(16, 0), time(20, 0)],
            IntakeFrequencyEnum.EVERY_4_HOURS: [time(6, 0), time(10, 0), time(14, 0), time(18, 0), time(22, 0)],
            IntakeFrequencyEnum.EVERY_6_HOURS: [time(6, 0), time(12, 0), time(18, 0), time(0, 0)],
            IntakeFrequencyEnum.EVERY_8_HOURS: [time(8, 0), time(16, 0), time(0, 0)],
            IntakeFrequencyEnum.STAT_IMMEDIATE: [time(now.hour, (now.minute + 5) % 60)],
            IntakeFrequencyEnum.AS_NEEDED_PRN: [time(12, 0)],
        }

        selected_times = time_slots.get(frequency, [time(9, 0), time(21, 0)])

        for day in range(duration_days):
            current_day = base_date + timedelta(days=day)
            for t in selected_times:
                slot_datetime = datetime.combine(current_day, t, tzinfo=timezone.utc)
                schedules.append(
                    MedicineIntakeSchedule(
                        prescription_item_id=prescription_item_id,
                        patient_id=patient_id,
                        scheduled_intake_timestamp=slot_datetime,
                        dosage_amount=dosage_amount,
                    )
                )
        return schedules


    @staticmethod
    def create_prescription(
        db: Session, doctor_id: str, req: PrescriptionCreateRequest, client_ip: str = "127.0.0.1"
    ) -> PrescriptionDetailResponse:
        """Create a new prescription, validate items, and generate automated intake schedules."""
        visit = db.query(Visit).filter(Visit.id == req.visit_id).first()
        if not visit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")

        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not doctor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")

        patient = db.query(Patient).filter(Patient.id == req.patient_id).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

        # Generate unique prescription number
        rx_count = db.query(Prescription).count() + 10001
        rx_number = f"RX-{datetime.now().strftime('%Y%m%d')}-{rx_count}"

        # Digital signature hash
        sig_raw = f"{rx_number}:{doctor_id}:{patient.id}:{datetime.now(timezone.utc).isoformat()}"
        digital_signature = hashlib.sha256(sig_raw.encode()).hexdigest()

        # Build FHIR MedicationRequest JSON
        fhir_med_req = {
            "resourceType": "MedicationRequest",
            "identifier": [{"system": "https://medikiosk.ai/prescriptions", "value": rx_number}],
            "status": "active",
            "intent": "order",
            "subject": {"reference": f"Patient/{patient.id}", "display": f"{patient.first_name} {patient.last_name}"},
            "requester": {"reference": f"Practitioner/{doctor.id}", "display": f"Dr. {doctor.first_name} {doctor.last_name}"},
        }

        prescription = Prescription(
            prescription_number=rx_number,
            visit_id=req.visit_id,
            patient_id=req.patient_id,
            doctor_id=doctor_id,
            digital_signature_hash=digital_signature,
            clinical_notes=req.clinical_notes,
            fhir_medication_request_payload=fhir_med_req,
        )
        db.add(prescription)
        db.commit()
        db.refresh(prescription)

        # Process Items & Schedules
        for item_data in req.items:
            med = None
            if item_data.medicine_id:
                med = db.query(Medicine).filter(Medicine.id == item_data.medicine_id).first()
            if not med and item_data.medicine_name:
                med = db.query(Medicine).filter(Medicine.brand_name.ilike(item_data.medicine_name.strip())).first()
            if not med and item_data.medicine_name:
                med = Medicine(
                    brand_name=item_data.medicine_name.strip(),
                    generic_name=item_data.generic_name or item_data.medicine_name.strip(),
                    strength="Standard",
                )
                db.add(med)
                db.commit()
                db.refresh(med)

            if not med:
                continue

            item = PrescriptionItem(
                prescription_id=prescription.id,
                medicine_id=med.id,
                dosage_instruction=item_data.dosage_instruction,
                frequency=item_data.frequency,
                duration_days=item_data.duration_days,
                total_quantity_prescribed=item_data.total_quantity_prescribed,
                special_intake_conditions=item_data.special_intake_conditions,
            )
            db.add(item)
            db.commit()
            db.refresh(item)

            # Generate schedules
            schedules = PrescriptionService._generate_intake_slots(
                prescription_item_id=item.id,
                patient_id=patient.id,
                frequency=item_data.frequency,
                duration_days=item_data.duration_days,
                dosage_amount=item_data.dosage_instruction,
            )
            db.add_all(schedules)

        db.commit()

        # Audit log
        AuditService.log_event(
            db=db,
            action=AuditActionEnum.CREATE,
            target_table="prescriptions",
            target_record_id=prescription.id,
            actor_user_id=doctor_id,
            actor_role="DOCTOR",
            actor_name=f"Dr. {doctor.first_name} {doctor.last_name}",
            hospital_id=visit.hospital_id,
            client_ip=client_ip,
            description=f"Prescription #{rx_number} generated for Patient {patient.hospital_mrn}",
        )

        # Trigger Patient Notification: Prescription Ready & Intake Schedules Active
        from app.services.notification_service import NotificationService
        NotificationService.trigger_prescription_ready(
            db=db,
            patient_id=req.patient_id,
            prescription_number=rx_number,
            doctor_name=f"{doctor.first_name} {doctor.last_name}",
            item_count=len(req.items),
        )

        return PrescriptionService.get_prescription_by_id(db, prescription.id)


    @staticmethod
    def get_prescription_by_id(db: Session, prescription_id: str) -> PrescriptionDetailResponse:
        """Retrieve prescription details with items and schedule slots."""
        p = db.query(Prescription).filter(Prescription.id == prescription_id).first()
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found")

        items_resp = []
        schedules_resp = []
        for item in p.items:
            items_resp.append(
                PrescriptionItemResponse(
                    id=item.id,
                    medicine_id=item.medicine_id,
                    medicine_name=item.medicine.brand_name if item.medicine else "Medicine",
                    generic_name=item.medicine.generic_name if item.medicine else "",
                    form=item.medicine.form.value if item.medicine else "TABLET",
                    strength=item.medicine.strength if item.medicine else "",
                    dosage_instruction=item.dosage_instruction,
                    frequency=item.frequency,
                    duration_days=item.duration_days,
                    total_quantity_prescribed=float(item.total_quantity_prescribed),
                    special_intake_conditions=item.special_intake_conditions,
                )
            )
            for sch in item.schedules:
                schedules_resp.append(
                    MedicineScheduleSlotResponse(
                        id=sch.id,
                        medicine_name=item.medicine.brand_name if item.medicine else "Medicine",
                        dosage_amount=sch.dosage_amount,
                        scheduled_intake_timestamp=sch.scheduled_intake_timestamp,
                        is_taken=sch.is_taken,
                        actual_taken_timestamp=sch.actual_taken_timestamp,
                    )
                )

        return PrescriptionDetailResponse(
            id=p.id,
            prescription_number=p.prescription_number,
            visit_id=p.visit_id,
            patient_id=p.patient_id,
            doctor_id=p.doctor_id,
            doctor_name=f"Dr. {p.doctor.first_name} {p.doctor.last_name}" if p.doctor else "Doctor",
            doctor_specialty=p.doctor.primary_specialty if p.doctor else "General Medicine",
            clinical_notes=p.clinical_notes,
            digital_signature_hash=p.digital_signature_hash,
            items=items_resp,
            intake_schedules=schedules_resp,
            created_at=p.created_at,
        )
