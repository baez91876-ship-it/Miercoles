from __future__ import annotations

import copy
import re
import unittest
from typing import Any
from unittest.mock import patch

from bson import ObjectId
from fastapi.testclient import TestClient
from pymongo.errors import DuplicateKeyError

from PETICIONES.api.dependencies import get_database
from PETICIONES.api.main import app


class FakeCursor:
    def __init__(self, documents: list[dict[str, Any]]) -> None:
        self.documents = documents

    def sort(self, field: str, direction: int = 1) -> FakeCursor:
        self.documents.sort(key=lambda document: document.get(field), reverse=direction < 0)
        return self

    def skip(self, amount: int) -> FakeCursor:
        self.documents = self.documents[amount:]
        return self

    def limit(self, amount: int) -> FakeCursor:
        self.documents = self.documents[:amount]
        return self

    def __iter__(self):
        return iter(copy.deepcopy(self.documents))


class FakeCollection:
    def __init__(self, unique_field: str | None = None) -> None:
        self.documents: list[dict[str, Any]] = []
        self.unique_field = unique_field

    @staticmethod
    def matches(document: dict[str, Any], query: dict[str, Any]) -> bool:
        for field, expected in query.items():
            if field == "$or":
                if not any(FakeCollection.matches(document, condition) for condition in expected):
                    return False
                continue

            actual = document.get(field)
            if isinstance(expected, dict):
                if "$ne" in expected and actual == expected["$ne"]:
                    return False
                if "$regex" in expected:
                    flags = re.IGNORECASE if expected.get("$options") == "i" else 0
                    if re.search(expected["$regex"], str(actual or ""), flags) is None:
                        return False
            elif actual != expected:
                return False
        return True

    def _check_unique(self, document: dict[str, Any], excluded: dict[str, Any] | None = None) -> None:
        if self.unique_field is None:
            return
        value = document.get(self.unique_field)
        if any(
            existing is not excluded and existing.get(self.unique_field) == value
            for existing in self.documents
        ):
            raise DuplicateKeyError("duplicate key")

    def insert_one(self, document: dict[str, Any]) -> Any:
        inserted = copy.deepcopy(document)
        inserted.setdefault("_id", ObjectId())
        self._check_unique(inserted)
        self.documents.append(inserted)
        return type("InsertResult", (), {"inserted_id": inserted["_id"]})()

    def find_one(self, query: dict[str, Any]) -> dict[str, Any] | None:
        return next(
            (copy.deepcopy(document) for document in self.documents if self.matches(document, query)),
            None,
        )

    def find(self, query: dict[str, Any]) -> FakeCursor:
        documents = [document for document in self.documents if self.matches(document, query)]
        return FakeCursor(copy.deepcopy(documents))

    def find_one_and_update(
        self, query: dict[str, Any], update: dict[str, Any], return_document: Any
    ) -> dict[str, Any] | None:
        for document in self.documents:
            if self.matches(document, query):
                updated = document | update.get("$set", {})
                self._check_unique(updated, excluded=document)
                document.update(update.get("$set", {}))
                return copy.deepcopy(document)
        return None

    def count_documents(self, query: dict[str, Any], limit: int = 0) -> int:
        count = sum(self.matches(document, query) for document in self.documents)
        return min(count, limit) if limit else count

    def delete_one(self, query: dict[str, Any]) -> Any:
        for index, document in enumerate(self.documents):
            if self.matches(document, query):
                del self.documents[index]
                return type("DeleteResult", (), {"deleted_count": 1})()
        return type("DeleteResult", (), {"deleted_count": 0})()

    def delete_many(self, query: dict[str, Any]) -> Any:
        initial_count = len(self.documents)
        self.documents = [
            document for document in self.documents if not self.matches(document, query)
        ]
        return type("DeleteResult", (), {"deleted_count": initial_count - len(self.documents)})()


class FakeDatabase:
    def __init__(self) -> None:
        self.collections: dict[str, FakeCollection] = {
            "usuarios": FakeCollection("correo"),
            "servicios": FakeCollection("nombre_normalizado"),
            "reservas": FakeCollection(),
        }

    def __getitem__(self, name: str) -> FakeCollection:
        return self.collections.setdefault(name, FakeCollection())


class ApiEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.database = FakeDatabase()
        self.previous_overrides = app.dependency_overrides.copy()
        app.dependency_overrides[get_database] = lambda: self.database
        self.secret_patcher = patch(
            "PETICIONES.api.security.JWT_SECRET", "test-only-secret-that-is-at-least-32-chars"
        )
        self.setup_key_patcher = patch("PETICIONES.api.routers.auth.ADMIN_SETUP_KEY", "test-setup-key")
        self.secret_patcher.start()
        self.setup_key_patcher.start()
        self.client = TestClient(app)

        response = self.client.post(
            "/api/auth/bootstrap-admin",
            json={
                "nombre": "Admin",
                "correo": "admin@example.com",
                "password": "StrongPass1!",
                "setup_key": "test-setup-key",
            },
        )
        self.assertEqual(response.status_code, 201)
        self.admin_id = response.json()["usuario"]["id"]
        login = self.client.post(
            "/api/auth/login",
            json={"correo": "admin@example.com", "password": "StrongPass1!"},
        )
        self.assertEqual(login.status_code, 200)
        self.admin_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.clear()
        app.dependency_overrides.update(self.previous_overrides)
        self.secret_patcher.stop()
        self.setup_key_patcher.stop()

    def register_user(self, email: str = "client@example.com") -> dict[str, Any]:
        response = self.client.post(
            "/api/auth/register",
            json={
                "name": "Hotel Client",
                "email": email,
                "phone": "555-0100",
                "password": "StrongPass1!",
            },
        )
        self.assertEqual(response.status_code, 201)
        return response.json()["usuario"]

    def create_service(self, name: str = "Suite") -> dict[str, Any]:
        response = self.client.post(
            "/api/services",
            headers=self.admin_headers,
            json={
                "nombre": name,
                "detalle": "Habitación cómoda",
                "precio": 125.5,
                "duracion": 2,
                "capacidad": 3,
                "categoria": "Habitación",
            },
        )
        self.assertEqual(response.status_code, 201)
        return response.json()["servicio"]

    def test_registration_login_and_current_session(self) -> None:
        user = self.register_user(" CLIENT@Example.com ")
        self.assertEqual(user["correo"], "client@example.com")
        self.assertNotIn("password", user)
        self.assertNotIn("password_hash", user)
        stored = self.database["usuarios"].find_one({"correo": "client@example.com"})
        self.assertIsNotNone(stored)
        self.assertNotEqual(stored["password_hash"], "StrongPass1!")

        login = self.client.post(
            "/api/auth/login",
            json={"correo": "client@example.com", "password": "StrongPass1!"},
        )
        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.json()["token_type"], "bearer")

        me = self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {login.json()['access_token']}"},
        )
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["usuario"]["id"], user["id"])

        invalid_login = self.client.post(
            "/api/auth/login",
            json={"correo": "client@example.com", "password": "incorrecta"},
        )
        self.assertEqual(invalid_login.status_code, 401)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

    def test_registration_rejects_duplicate_email_and_weak_password(self) -> None:
        self.register_user()
        duplicate = self.client.post(
            "/api/auth/register",
            json={
                "nombre": "Duplicado",
                "correo": "CLIENT@example.com",
                "password": "StrongPass1!",
            },
        )
        self.assertEqual(duplicate.status_code, 409)

        weak_password = self.client.post(
            "/api/auth/register",
            json={
                "nombre": "Débil",
                "correo": "weak@example.com",
                "password": "weakpass",
            },
        )
        self.assertEqual(weak_password.status_code, 422)

    def test_admin_bootstrap_requires_setup_key_and_only_runs_once(self) -> None:
        payload = {
            "nombre": "Segundo administrador",
            "correo": "second-admin@example.com",
            "password": "StrongPass1!",
            "setup_key": "wrong-key",
        }
        self.assertEqual(
            self.client.post("/api/auth/bootstrap-admin", json=payload).status_code, 403
        )
        payload["setup_key"] = "test-setup-key"
        self.assertEqual(
            self.client.post("/api/auth/bootstrap-admin", json=payload).status_code, 409
        )

    def test_inactive_user_cannot_log_in_or_use_token_and_cannot_delete_reservation_owner(self) -> None:
        user = self.register_user()
        login = self.client.post(
            "/api/auth/login",
            json={"correo": user["correo"], "password": "StrongPass1!"},
        ).json()
        user_headers = {"Authorization": f"Bearer {login['access_token']}"}

        deactivated = self.client.put(
            f"/api/users/{user['id']}",
            headers=self.admin_headers,
            json={"estado": "inactivo"},
        )
        self.assertEqual(deactivated.status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me", headers=user_headers).status_code, 401)
        self.assertEqual(
            self.client.post(
                "/api/auth/login",
                json={"correo": user["correo"], "password": "StrongPass1!"},
            ).status_code,
            401,
        )

        self.client.put(
            f"/api/users/{user['id']}",
            headers=self.admin_headers,
            json={"estado": "activo"},
        )
        self.database["reservas"].insert_one({"correo": user["correo"]})
        self.assertEqual(
            self.client.delete(f"/api/users/{user['id']}", headers=self.admin_headers).status_code,
            409,
        )

    def test_users_crud_search_authorization_and_protected_deletion(self) -> None:
        user = self.register_user()
        user_headers = {
            "Authorization": f"Bearer {self.client.post('/api/auth/login', json={'correo': user['correo'], 'password': 'StrongPass1!'}).json()['access_token']}"
        }
        self.assertEqual(self.client.get("/api/users").status_code, 401)
        self.assertEqual(self.client.get("/api/users", headers=user_headers).status_code, 403)

        listing = self.client.get("/api/users?q=CLIENT", headers=self.admin_headers)
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.json()["total"], 1)
        self.assertEqual(listing.json()["items"][0]["id"], user["id"])

        created = self.client.post(
            "/api/users",
            headers=self.admin_headers,
            json={
                "nombre": "Nuevo",
                "correo": "new@example.com",
                "password": "StrongPass1!",
                "rol": "usuario",
                "estado": "activo",
            },
        )
        self.assertEqual(created.status_code, 201)
        created_user = created.json()["usuario"]
        updated = self.client.put(
            f"/api/users/{created_user['id']}",
            headers=self.admin_headers,
            json={"nombre": "Nombre actualizado"},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["usuario"]["nombre"], "Nombre actualizado")

        duplicate_email = self.client.put(
            f"/api/users/{created_user['id']}",
            headers=self.admin_headers,
            json={"correo": user["correo"]},
        )
        self.assertEqual(duplicate_email.status_code, 409)
        self.assertEqual(
            self.client.put(
                "/api/users/id-no-valido", headers=self.admin_headers, json={"nombre": "X"}
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.put(
                f"/api/users/{self.admin_id}",
                headers=self.admin_headers,
                json={"rol": "usuario"},
            ).status_code,
            409,
        )
        self.assertEqual(
            self.client.delete(f"/api/users/{self.admin_id}", headers=self.admin_headers).status_code,
            409,
        )
        self.assertEqual(
            self.client.delete(f"/api/users/{created_user['id']}", headers=self.admin_headers).status_code,
            204,
        )

    def test_pending_user_is_listed_and_cannot_log_in(self) -> None:
        response = self.client.post(
            "/api/users",
            headers=self.admin_headers,
            json={
                "nombre": "Cuenta pendiente",
                "correo": "pending@example.com",
                "password": "StrongPass1!",
                "estado": "pendiente",
            },
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["usuario"]["estado"], "pendiente")

        listing = self.client.get("/api/users?estado=pendiente", headers=self.admin_headers)
        self.assertEqual(listing.status_code, 200)
        self.assertEqual([item["correo"] for item in listing.json()["items"]], ["pending@example.com"])

        login = self.client.post(
            "/api/auth/login",
            json={"correo": "pending@example.com", "password": "StrongPass1!"},
        )
        self.assertEqual(login.status_code, 401)

    def test_services_crud_search_visibility_and_duplicate_validation(self) -> None:
        user = self.register_user()
        login = self.client.post(
            "/api/auth/login",
            json={"correo": user["correo"], "password": "StrongPass1!"},
        ).json()
        user_headers = {"Authorization": f"Bearer {login['access_token']}"}
        service = self.create_service()
        self.assertEqual(self.client.get("/api/services").status_code, 401)

        inactive = self.client.post(
            "/api/services",
            headers=self.admin_headers,
            json={
                "nombre": "Inactivo",
                "detalle": "No disponible",
                "precio": 99,
                "duracion": 1,
                "capacidad": 2,
                "categoria": "Suite",
                "estado": "inactivo",
            },
        )
        self.assertEqual(inactive.status_code, 201)

        client_listing = self.client.get("/api/services?q=Suite", headers=user_headers)
        self.assertEqual(client_listing.status_code, 200)
        self.assertEqual([item["id"] for item in client_listing.json()["items"]], [service["id"]])
        admin_listing = self.client.get("/api/services", headers=self.admin_headers)
        self.assertEqual(len(admin_listing.json()["items"]), 2)

        updated = self.client.put(
            f"/api/services/{service['id']}",
            headers=self.admin_headers,
            json={"nombre": "Suite Familiar", "imagen": None},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["servicio"]["nombre"], "Suite Familiar")
        self.assertIsNone(updated.json()["servicio"]["imagen"])

        duplicate = self.client.post(
            "/api/services",
            headers=self.admin_headers,
            json={
                "nombre": "suite familiar",
                "detalle": "Duplicado",
                "precio": 120,
                "duracion": 1,
                "capacidad": 2,
                "categoria": "Suite",
            },
        )
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(
            self.client.put(
                f"/api/services/{service['id']}",
                headers=self.admin_headers,
                json={"precio": None},
            ).status_code,
            422,
        )
        self.assertEqual(
            self.client.delete(f"/api/services/{service['id']}", headers=self.admin_headers).status_code,
            204,
        )

    def test_service_with_reservations_cannot_be_deleted(self) -> None:
        service = self.create_service()
        self.database["reservas"].insert_one({"servicioId": service["id"]})
        response = self.client.delete(
            f"/api/services/{service['id']}", headers=self.admin_headers
        )
        self.assertEqual(response.status_code, 409)

    def test_dashboard_statistics_are_scoped_to_the_authenticated_user(self) -> None:
        user = self.register_user()
        self.create_service()
        self.database["reservas"].insert_one({"correo": user["correo"]})
        self.database["reservas"].insert_one({"correo": "other@example.com"})
        login = self.client.post(
            "/api/auth/login",
            json={"correo": user["correo"], "password": "StrongPass1!"},
        ).json()
        user_headers = {"Authorization": f"Bearer {login['access_token']}"}

        admin_stats = self.client.get("/api/stats", headers=self.admin_headers).json()
        user_stats = self.client.get("/api/stats", headers=user_headers).json()
        self.assertEqual(admin_stats, {"usuarios": 2, "servicios": 1, "reservas": 2})
        self.assertEqual(user_stats, {"usuarios": None, "servicios": 1, "reservas": 1})

    def test_reservations_support_stays_and_appointments_with_authorization_and_conflicts(self) -> None:
        service = self.create_service()
        user = self.register_user()
        login = self.client.post(
            "/api/auth/login",
            json={"correo": user["correo"], "password": "StrongPass1!"},
        ).json()
        user_headers = {"Authorization": f"Bearer {login['access_token']}"}

        stay = {
            "servicioId": service["id"],
            "modalidad": "noches",
            "entrada": "2030-04-10",
            "salida": "2030-04-12",
            "huespedes": 2,
            "observaciones": "Llegada tarde",
        }
        created_stay = self.client.post(
            "/api/reservations", headers=user_headers, json=stay
        )
        self.assertEqual(created_stay.status_code, 201)
        stay_id = created_stay.json()["reserva"]["id"]
        self.assertEqual(created_stay.json()["reserva"]["total"], 251.0)

        overlapping_stay = stay | {"entrada": "2030-04-11", "salida": "2030-04-13"}
        self.assertEqual(
            self.client.post(
                "/api/reservations", headers=user_headers, json=overlapping_stay
            ).status_code,
            409,
        )
        self.assertEqual(
            self.client.get(
                "/api/reservations", headers=self.admin_headers
            ).json()["items"][0]["id"],
            stay_id,
        )
        self.assertEqual(
            self.client.put(
                f"/api/reservations/{stay_id}", headers=self.admin_headers, json=stay
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.delete(f"/api/reservations/{stay_id}", headers=self.admin_headers).status_code,
            403,
        )
        self.assertEqual(
            self.client.delete(f"/api/reservations/{stay_id}", headers=user_headers).status_code,
            204,
        )

        appointment = {
            "servicioId": service["id"],
            "modalidad": "horario",
            "inicio": "2030-04-20T14:00:00Z",
            "fin": "2030-04-20T15:30:00Z",
            "observaciones": "Necesito acceso anticipado",
        }
        created_appointment = self.client.post(
            "/api/reservations", headers=user_headers, json=appointment
        )
        self.assertEqual(created_appointment.status_code, 201)
        self.assertEqual(created_appointment.json()["reserva"]["total"], 125.5)
        overlap = appointment | {
            "inicio": "2030-04-20T15:00:00Z",
            "fin": "2030-04-20T16:00:00Z",
        }
        self.assertEqual(
            self.client.post("/api/reservations", headers=user_headers, json=overlap).status_code,
            409,
        )
        self.assertEqual(
            self.client.get(
                "/api/reservations/availability",
                headers=user_headers,
                params={
                    "servicio_id": service["id"],
                    "modalidad": "horario",
                    "inicio": "2030-04-20T15:00:00Z",
                    "fin": "2030-04-20T16:00:00Z",
                },
            ).status_code,
            409,
        )
        self.assertEqual(
            self.client.delete("/api/reservations", headers=user_headers).status_code,
            204,
        )
        self.assertEqual(self.client.get("/api/reservations", headers=user_headers).json()["items"], [])

    def test_reservation_validates_dates_capacity_and_inactive_services(self) -> None:
        service = self.create_service()
        login = self.client.post(
            "/api/auth/login",
            json={"correo": "admin@example.com", "password": "StrongPass1!"},
        ).json()
        headers = {"Authorization": f"Bearer {login['access_token']}"}
        stay = {
            "servicioId": service["id"],
            "modalidad": "noches",
            "entrada": "2030-04-10",
            "salida": "2030-04-11",
            "huespedes": 4,
        }
        self.assertEqual(
            self.client.post("/api/reservations", headers=headers, json=stay).status_code,
            422,
        )
        self.assertEqual(
            self.client.post(
                "/api/reservations",
                headers=headers,
                json=stay | {"salida": "2030-04-10"},
            ).status_code,
            422,
        )
        self.client.put(
            f"/api/services/{service['id']}",
            headers=self.admin_headers,
            json={"estado": "inactivo"},
        )
        self.assertEqual(
            self.client.post("/api/reservations", headers=headers, json=stay).status_code,
            409,
        )


if __name__ == "__main__":
    unittest.main()
