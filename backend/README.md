# Aura Stay — backend

La v1 de Aura Stay es solo frontend: todos los datos son mock y viven en `frontend/src/mocks/`.

La capa `frontend/src/services/` ya expone las mismas funciones asíncronas que tendrá la API real
(mismos nombres, parámetros y forma de las respuestas). Cuando se construya el backend (FastAPI, igual que en
Aura Food), basta con reemplazar el cuerpo de cada servicio por llamadas a `fetchWithAuth`, sin tocar las páginas.

El contrato REST que deberá cumplir el backend se documentará en este archivo.
