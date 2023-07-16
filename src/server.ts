import express, { Request, Response } from 'express';
import { User, Message, RandomString } from './models';
import NodeRSA from 'node-rsa';
import crypto from 'crypto';

const app = express();
const port = 3000;
app.use(express.json());

const userList: User[] = [];
const randomStrings: RandomString[] = [];

// Generar una clave aleatoria y cifrarla con la clave pública del usuario
function encryptRandomKey(publicKey: string): [ string, string ] {
  const randomString = crypto.randomBytes(32).toString('hex');
console.log(`El string random es: ${randomString}`);
  const key = new NodeRSA();
  key.importKey(publicKey, 'pkcs8-public-pem');
  return [ randomString, key.encrypt(randomString, 'base64') ];
}

// Verificar si la clave privada descifrada es correcta
function isDeleteKeyValid(deleteKey: string | undefined, decryptedKey: string): boolean {
  return deleteKey !== undefined && deleteKey === decryptedKey;
}

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

// Generar y enviar la clave aleatoria cifrada al usuario para borrar los mensajes
app.get('/users/:userId/inbox/deleteKey', (req: Request, res: Response) => {
  const userId = req.params.userId;
  const user = userList.find((u) => u.alias === userId || u.pubKey === userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const [ _randomString, encryptedKey ] = encryptRandomKey(user.pubKey);
  randomStrings.push( { randomString: _randomString, id: user.alias } );
  user.deleteKey = encryptedKey; // Almacenar la clave cifrada en el usuario

  res.json({ encryptedKey });
});

// Borrar los mensajes de la bandeja de entrada de un usuario
app.delete('/users/:userId/inbox', (req: Request, res: Response) => {
  const userId = req.params.userId;
  const user = userList.find((u) => u.alias === userId || u.pubKey === userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const deleteKey = req.body.deleteKey;



  let randomString = "";
  for (let i in randomStrings) {
    if (randomStrings[i].id === userId) {
      randomString = randomStrings[i].randomString;
      break
    }
  }


  if (user.deleteKey && !isDeleteKeyValid(deleteKey, randomString)) {
    return res.json({ success: false });
  }

  user.inbox = [];
  delete user.deleteKey; // Eliminar la propiedad deleteKey

  res.json({ success: true });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor iniciado en http://localhost:${port}`);
});
