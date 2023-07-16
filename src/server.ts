import express, { Request, Response } from 'express';
import { User } from './models';

const app = express();
const port = 3000;

// Endpoint para obtener la lista de usuarios
app.get('/users', (req: Request, res: Response) => {
  // Lógica para obtener la lista de usuarios
  const userList: User[] = []; // Aquí debes implementar la lógica para obtener la lista
  res.json(userList);
});

// Endpoint para enviar un mensaje a otro usuario
app.post('/users/:userId/messages', (req: Request, res: Response) => {
  const userId = req.params.userId;
  const message = req.body.message;
  // Lógica para enviar el mensaje al usuario con el ID especificado
  res.json({ success: true });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor iniciado en http://localhost:${port}`);
});

