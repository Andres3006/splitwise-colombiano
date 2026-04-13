# Splitwise Colombiano

## Descripcion
Aplicacion web para gestionar gastos compartidos entre amigos y calcular automaticamente las deudas.

## Tecnologias usadas
- Backend: Node.js + Express
- Frontend: React
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
npm start
```

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

## Requests listas
En `backend/test-server.http` tienes peticiones listas para probar:
- auth
- grupos
- invitaciones
- gastos
- balances
- dashboard
- pagos
