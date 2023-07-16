import express, { Request, Response } from 'express';
import { User, Message } from './models';

const app = express();
const port = 3000;

app.use(express.json());

const userList: User[] = [];

// Crear un nuevo usuario con alias y par de claves
app.post('/users', (req: Request, res: Response) => {
  const alias = req.body.alias;
  const pubKey = req.body.pubKey;
  const user: User = { alias, pubKey, inbox: [] };
  userList.push(user);
  res.json({ success: true });
});

// Enviar mensaje a un usuario
app.post('/users/:userId/inbox', (req: Request, res: Response) => {
  const userId = req.params.userId;
  const { sender, content } = req.body;

  const user = userList.find((u) => u.alias === userId || u.pubKey === userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const message: Message = {
    sender,
    content,
    timestamp: Date.now(),
  };

  user.inbox.push(message);
  res.json({ success: true });
});

// Buscar usuario por alias o pubKey
app.get('/users/:userId', (req: Request, res: Response) => {
  const userId = req.params.userId;
  const user = userList.find((u) => u.alias === userId || u.pubKey === userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.json(user);
});

// Obtener lista de usuarios
app.get('/users', (req: Request, res: Response) => {
  const userListWithoutInbox = userList.map((user) => {
    const { inbox, ...userWithoutInbox } = user;
    return userWithoutInbox;
  });

  res.json(userListWithoutInbox);
});

// Obtener la bandeja de entrada de un usuario
app.get('/users/:userId/inbox', (req: Request, res: Response) => {
  const userId = req.params.userId;
  const user = userList.find((u) => u.alias === userId || u.pubKey === userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.json(user.inbox);
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor iniciado en http://localhost:${port}`);
});

