import express, { Request, Response } from 'express';
import cors from 'cors';
import { User, Message, RandomString } from './models';
import NodeRSA from 'node-rsa';
import crypto from 'crypto';
import fs from 'fs';

const app = express();
const port = 3000;
app.use(express.json());
app.use(cors());

const randomStrings: RandomString[] = [];
// Ruta del archivo de datos
const dataFilePath = './data.json';

// Leer los datos almacenados en el archivo
function readDataFromFile(): { userList: User[] } {
  try {
    const data = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Si el archivo no existe o hay algún error al leerlo, retorna datos vacíos
    return { userList: [] };
  }
}

// Guardar los datos en el archivo
function saveDataToFile(data: { userList: User[] }) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

// Generar una clave aleatoria y cifrarla con la clave pública del usuario
function encryptRandomKey(publicKey: string): [string, string] {
  const randomString = crypto.randomBytes(32).toString('hex');
  const key = new NodeRSA();
  key.importKey(publicKey, 'pkcs8-public-pem');
  return [randomString, key.encrypt(randomString, 'base64')];
}

// Verificar si la clave de borrado descifrada es correcta
function isDeleteKeyValid(deleteKey: string | undefined, decryptedKey: string): boolean {
  if (deleteKey === undefined) {
    return false;
  }

  return deleteKey === decryptedKey;
}

// Leer los datos almacenados en el archivo al iniciar el servidor
let { userList } = readDataFromFile();

// Crear un nuevo usuario con alias y clave pública
app.post('/users', (req: Request, res: Response) => {
  const alias = req.body.alias;
  const pubKey = req.body.pubKey;

  // Comprobar si ya existe un usuario con el mismo alias
  const existingUser = userList.find((user) => user.alias === alias);
  if (existingUser) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese alias' });
  }

  const user: User = { alias, pubKey, inbox: [] };
  userList.push(user);

  // Guardar los datos en el archivo
  saveDataToFile({ userList });

  res.json({ success: true });
});

// Enviar mensaje a un usuario
app.post('/users/:userId/inbox', (req: Request, res: Response) => {
  const userId = req.params.userId;
  const { sender, content } = req.body;

  const user = userList.find((u) => u.alias === userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const message: Message = {
    sender,
    content,
    timestamp: Date.now(),
  };

  user.inbox.push(message);

  // Guardar los datos en el archivo
  saveDataToFile({ userList });

  res.json({ success: true });
});

// Buscar usuario por alias
app.get('/users/:alias', (req: Request, res: Response) => {
  const alias = req.params.alias;
  const user = userList.find((u) => u.alias === alias);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.json(user);
});

// Obtener lista de usuarios
app.get('/users', (req: Request, res: Response) => {
  res.json(userList);
});

// Obtener la bandeja de entrada de un usuario
app.get('/users/:alias/inbox', (req: Request, res: Response) => {
  const alias = req.params.alias;
  const user = userList.find((u) => u.alias === alias);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.json(user.inbox);
});


// Generar y enviar la clave aleatoria cifrada al usuario para borrar los mensajes
app.get('/users/:alias/inbox/deleteKey', (req: Request, res: Response) => {
  const alias = req.params.alias;
  const user = userList.find((u) => u.alias === alias);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const [randomString, encryptedKey] = encryptRandomKey(user.pubKey);
  randomStrings.push({ randomString, id: alias }); // Almacenar el randomString en el array global

  user.deleteKey = encryptedKey; // Almacenar la clave cifrada en el usuario

  // Guardar los datos en el archivo
  saveDataToFile({ userList });

  res.json({ encryptedKey, alias }); // Devolver también el randomStringId al cliente
});

// Borrar los mensajes de la bandeja de entrada de un usuario
app.delete('/users/:alias/inbox', (req: Request, res: Response) => {
  const alias = req.params.alias;
  const user = userList.find((u) => u.alias === alias);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const deleteKey = req.body.deleteKey;
  const randomStringId = alias;

  // Buscar el randomString correspondiente al randomStringId en el array global
  const randomStringObj = randomStrings.find((obj) => obj.id === randomStringId);

  if (!randomStringObj || !isDeleteKeyValid(deleteKey,  randomStringObj.randomString)) {
    return res.json({ success: false });
  }

  user.inbox = [];
  delete user.deleteKey; // Eliminar la propiedad deleteKey

  // Eliminar el randomString del array global
  randomStrings.splice(randomStrings.indexOf(randomStringObj), 1);

  // Guardar los datos en el archivo
  saveDataToFile({ userList });

  res.json({ success: true });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor iniciado en http://localhost:${port}`);
});

