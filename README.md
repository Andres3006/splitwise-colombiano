# Splitwise Colombiano

## Descripcion
Aplicacion web para gestionar gastos compartidos entre amigos y calcular automaticamente las deudas.

## Tecnologias usadas
- Backend: Node.js + Express
- Frontend: React + Vite
- Base de datos: PostgreSQL

## Instalacion

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

El frontend anterior en HTML/CSS/JS puro se conservo en `frontend/legacy/`.

## Roles
- Backend Developer: (tu nombre)
- Frontend Developer: (companero)
- Git Master + Documentador: (companero)

## Funcionalidades
- Registro de usuarios
- Creacion de grupos
- Registro de gastos
- Calculo de deudas optimizado

## Prueba rapida del servidor
1. Entra a `backend`
2. Revisa el archivo `backend/.env`
3. Ejecuta `npm run dev`
4. Prueba `GET http://localhost:3000/`
5. Prueba `GET http://localhost:3000/db-test`

## Desarrollo recomendado
1. Levanta el backend en `http://localhost:3000`
2. Levanta el frontend React con `npm run dev` en `frontend`
3. Vite proxea `/api` al backend automaticamente

## Produccion del frontend
```bash
cd frontend
npm install
npm run build
```

Despues de generar `frontend/dist`, el backend servira automaticamente ese build de React.

## Requests listas
En `backend/test-server.http` tienes peticiones listas para probar:
- auth
- grupos
- invitaciones
- gastos
- balances
- dashboard
- pagos
