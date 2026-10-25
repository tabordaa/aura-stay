# Cómo contribuir

## Ramas
- `main`: versiones entregables. Solo recibe merges desde `develop`.
- `develop`: integración. Nunca se hace push directo.
- `feat/<tarea>`, `fix/<bug>`, `chore/<tarea>`, `docs/<tema>`: se crean desde `develop`.

## Flujo
1. `git checkout develop && git pull`
2. `git checkout -b feat/mi-tarea`
3. Commits con [Conventional Commits](https://www.conventionalcommits.org/) en inglés (`feat: add room detail modal`).
4. Antes del push, desde `frontend/`: `npm run lint` y `npm run build`.
5. PR hacia `develop`; se hace merge (squash) cuando el CI está en verde.

## Diseño
Todo lo nuevo debe verse como parte de la misma app: reutiliza los tokens de `frontend/src/index.css` y los
patrones de los CSS Modules existentes. No se agregan librerías de UI, fuentes ni paletas nuevas.
