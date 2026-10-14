from datetime import date, datetime, time, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, status
from pymongo import ReturnDocument

from ..database import Document
from ..dependencies import AdminUser, CurrentUser, Database
from ..schemas import ReservationInput

router = APIRouter(prefix="/api/reservations", tags=["Reservas"])


def reservation_not_found() -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, "La reserva no existe.")


def reservation_interval(reservation: Document) -> tuple[datetime, datetime] | None:
    if reservation.get("estado", "confirmada") == "cancelada":
        return None
    if reservation.get("modalidad", "noches") == "horario":
        start = reservation.get("inicio")
        end = reservation.get("fin")
        if not isinstance(start, datetime) or not isinstance(end, datetime):
            return None
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        return start.astimezone(timezone.utc), end.astimezone(timezone.utc)

    entry = reservation.get("entrada")
    departure = reservation.get("salida")
    if isinstance(entry, str):
        entry = date.fromisoformat(entry)
    if isinstance(departure, str):
        departure = date.fromisoformat(departure)
    if not isinstance(entry, date) or not isinstance(departure, date):
        return None
    return (
        datetime.combine(entry, time.min, timezone.utc),
        datetime.combine(departure, time.min, timezone.utc),
    )


def requested_interval(payload: ReservationInput) -> tuple[datetime, datetime]:
    if payload.modalidad == "horario":
        assert payload.inicio is not None and payload.fin is not None
        return payload.inicio.astimezone(timezone.utc), payload.fin.astimezone(timezone.utc)
    assert payload.entrada is not None and payload.salida is not None
    return (
        datetime.combine(payload.entrada, time.min, timezone.utc),
        datetime.combine(payload.salida, time.min, timezone.utc),
    )


def ensure_available(
    database: Database, service_id: str, interval: tuple[datetime, datetime], ignore_id: str | None = None
) -> None:
    related_reservations = {"$or": [{"servicioId": service_id}, {"habitacionId": service_id}]}
    for existing in database["reservas"].find(related_reservations):
        if existing.get("id") == ignore_id:
            continue
        existing_interval = reservation_interval(existing)
        if existing_interval and interval[0] < existing_interval[1] and interval[1] > existing_interval[0]:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "El servicio ya está reservado en ese horario. Selecciona otra fecha u hora.",
            )


def public_reservation(document: Document) -> dict[str, Any]:
    result = {
        "id": document["id"],
        "servicioId": document["servicioId"],
        "habitacionId": document["servicioId"],
        "servicio": document["servicio"],
        "habitacion": document["servicio"],
        "correo": document["correo"],
        "modalidad": document.get("modalidad", "noches"),
        "entrada": document.get("entrada"),
        "salida": document.get("salida"),
        "inicio": document.get("inicio"),
        "fin": document.get("fin"),
        "huespedes": document.get("huespedes", 1),
        "observaciones": document.get("observaciones", ""),
        "total": document["total"],
        "estado": document.get("estado", "confirmada"),
    }
    for field in ("inicio", "fin"):
        if isinstance(result[field], datetime):
            result[field] = result[field].isoformat()
    for field in ("entrada", "salida"):
        if isinstance(result[field], date):
            result[field] = result[field].isoformat()
    return result


def build_reservation(
    database: Database, payload: ReservationInput, user: Document, reservation_id: str
) -> Document:
    service = database["servicios"].find_one({"id": payload.servicioId})
    if service is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "El servicio seleccionado no existe.")
    if service["estado"] != "disponible":
        raise HTTPException(status.HTTP_409_CONFLICT, "El servicio seleccionado está inactivo.")
    if payload.huespedes > service["capacidad"]:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"El servicio admite como máximo {service['capacidad']} huésped(es).",
        )
    if payload.modalidad == "noches":
        assert payload.entrada is not None and payload.salida is not None
        nights = (payload.salida - payload.entrada).days
        if payload.entrada < datetime.now(timezone.utc).date():
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, "La fecha de entrada no puede ser anterior a hoy."
            )
        if nights < service["duracion"]:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"La estancia mínima es de {service['duracion']} noche(s).",
            )
        total = round(service["precio"] * nights, 2)
    else:
        assert payload.inicio is not None
        if payload.inicio.astimezone(timezone.utc) <= datetime.now(timezone.utc):
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, "La cita debe comenzar en una fecha y hora futuras."
            )
        total = round(service["precio"], 2)

    interval = requested_interval(payload)
    ensure_available(database, payload.servicioId, interval, ignore_id=reservation_id)
    return {
        "id": reservation_id,
        "servicioId": service["id"],
        "servicio": service["nombre"],
        "correo": user["correo"],
        "modalidad": payload.modalidad,
        "entrada": payload.entrada.isoformat() if payload.entrada else None,
        "salida": payload.salida.isoformat() if payload.salida else None,
        "inicio": payload.inicio.astimezone(timezone.utc) if payload.inicio else None,
        "fin": payload.fin.astimezone(timezone.utc) if payload.fin else None,
        "huespedes": payload.huespedes,
        "observaciones": payload.observaciones,
        "total": total,
        "estado": "confirmada",
        "createdAt": datetime.now(timezone.utc),
    }


@router.get("")
def list_reservations(user: CurrentUser, database: Database) -> dict[str, Any]:
    query = {} if user["rol"] == "administrador" else {"correo": user["correo"]}
    documents = database["reservas"].find(query).sort("createdAt", -1)
    return {"items": [public_reservation(document) for document in documents]}


@router.get("/availability")
def check_availability(
    user: CurrentUser,
    database: Database,
    servicio_id: str = Query(min_length=1, max_length=64),
    modalidad: str = Query(pattern="^(noches|horario)$"),
    entrada: date | None = None,
    salida: date | None = None,
    inicio: datetime | None = None,
    fin: datetime | None = None,
) -> dict[str, bool]:
    del user
    payload = ReservationInput(
        servicioId=servicio_id,
        modalidad=modalidad,
        entrada=entrada,
        salida=salida,
        inicio=inicio,
        fin=fin,
    )
    service = database["servicios"].find_one({"id": servicio_id})
    if service is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "El servicio seleccionado no existe.")
    if service["estado"] != "disponible":
        raise HTTPException(status.HTTP_409_CONFLICT, "El servicio seleccionado está inactivo.")
    ensure_available(database, servicio_id, requested_interval(payload))
    return {"disponible": True}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_reservation(
    payload: ReservationInput, user: CurrentUser, database: Database
) -> dict[str, Any]:
    reservation = build_reservation(database, payload, user, str(uuid4()))
    database["reservas"].insert_one(reservation)
    return {"reserva": public_reservation(reservation)}


@router.put("/{reservation_id}")
def update_reservation(
    reservation_id: str,
    payload: ReservationInput,
    user: CurrentUser,
    database: Database,
) -> dict[str, Any]:
    existing = database["reservas"].find_one({"id": reservation_id})
    if existing is None:
        raise reservation_not_found()
    if user["rol"] != "administrador" and existing["correo"] != user["correo"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para editar esta reserva.")
    reservation = build_reservation(database, payload, user, reservation_id)
    reservation["correo"] = existing["correo"]
    reservation["createdAt"] = existing.get("createdAt", datetime.now(timezone.utc))
    database["reservas"].find_one_and_update(
        {"id": reservation_id}, {"$set": reservation}, return_document=ReturnDocument.AFTER
    )
    return {"reserva": public_reservation(reservation)}


@router.delete("/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reservation(reservation_id: str, user: CurrentUser, database: Database) -> None:
    reservation = database["reservas"].find_one({"id": reservation_id})
    if reservation is None:
        raise reservation_not_found()
    if reservation["correo"] != user["correo"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo puedes eliminar tus propias reservas.")
    database["reservas"].delete_one({"id": reservation_id})


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_own_reservations(user: CurrentUser, database: Database) -> None:
    database["reservas"].delete_many({"correo": user["correo"]})
