import axios from 'axios';
import NodeRSA from 'node-rsa';
import fs from 'fs';

let serverEndpoint = 'http://localhost:3000'; // Endpoint por defecto

// Función para cambiar el endpoint del servidor
export function setServerEndpoint(endpoint: string) {
  serverEndpoint = endpoint;
}

// Generar un par de claves RSA
export function generateRSAKeyPair(): { publicKey: string; privateKey: string } {
  const key = new NodeRSA({ b: 2048 }); // Seleccionar el tamaño de clave adecuado
  return {
    publicKey: key.exportKey('pkcs8-public-pem'),
    privateKey: key.exportKey('pkcs8-private-pem'),
  };
}

// Cifrar un mensaje con la clave pública del destinatario
export function encryptMessage(message: string, publicKey: string): string {
  const key = new NodeRSA();
  key.importKey(publicKey, 'pkcs8-public-pem');
  return key.encrypt(message, 'base64');
}

// Descifrar un mensaje con la clave privada del destinatario
export function decryptMessage(encryptedMessage: string, privateKey: string): string {
  const key = new NodeRSA();
  key.importKey(privateKey, 'pkcs8-private-pem');
  return key.decrypt(encryptedMessage, 'utf8');
}

// Verificar si existe el archivo de clave privada o si el usuario existe en la base de datos
export async function privateKeyExists(alias: string): Promise<boolean> {
  const privateKeyPath = `./pidgeon_${alias}_privKey.pem`;
  const existsLocally = fs.existsSync(privateKeyPath);

  if (!existsLocally) {
    try {
      await axios.get(`${serverEndpoint}/users/${alias}`);
      return true; // El usuario existe en la base de datos
    } catch (error: unknown) {
      return false; // El usuario no existe en la base de datos
    }
  }

  return existsLocally;
}

// Crear un nuevo usuario con alias y par de claves
export async function createUser(alias: string) {
  // Verificar si el usuario ya existe en la base de datos
  try {
    await axios.get(`${serverEndpoint}/users/${alias}`);
    console.log('El usuario ya existe en la base de datos.');
    return;
  } catch (error: unknown) {
    // El usuario no existe en la base de datos
  }

  // Verificar si el usuario ya tiene una clave privada
  if (await privateKeyExists(alias)) {
    console.log(`El usuario ya tiene una clave privada pero no existe en la base de datos. Elimina la clave:

rm "./pidgeon_${alias}_privKey.pem"
`);
    return;
  }

  try {
    const keyPair = generateRSAKeyPair();
    await axios.post(`${serverEndpoint}/users`, { alias, pubKey: keyPair.publicKey });

    // Escribir la clave privada en un archivo
    const privateKeyPath = `./pidgeon_${alias}_privKey.pem`;
    fs.writeFileSync(privateKeyPath, keyPair.privateKey);
    console.log('Usuario creado exitosamente');
    console.log(`Clave privada guardada en: ${privateKeyPath}`);
  } catch (error: unknown) {
    console.error('Error al crear el usuario:', (error as any).response?.data.error);
  }
}

// Enviar un mensaje a un usuario
export async function sendMessage(userId: string, sender: string, content: string) {
  try {
    const response = await axios.get(`${serverEndpoint}/users/${userId}`);
    const user = response.data;
    const encryptedMessage = encryptMessage(content, user.pubKey);

    const messageData = {
      sender,
      content: encryptedMessage,
    };
    await axios.post(`${serverEndpoint}/users/${userId}/inbox`, messageData);
    console.log('Mensaje enviado exitosamente');
  } catch (error: unknown) {
    console.error('Error al enviar el mensaje:', error);
  }
}

// Buscar un usuario por alias o pubKey
export async function findUser(userId: string) {
  try {
    const response = await axios.get(`${serverEndpoint}/users/${userId}`);
    console.log('Usuario encontrado:', response.data);
  } catch (error: unknown) {
    console.error('Error al buscar el usuario:', (error as any).response?.data.error);
  }
}

// Obtener la lista de usuarios
export async function getUserList() {
  try {
    const response = await axios.get(`${serverEndpoint}/users`);
    console.log('Lista de usuarios:', response.data);
  } catch (error: unknown) {
    console.error('Error al obtener la lista de usuarios:', (error as any).response?.data.error);
  }
}

// Descifrar la bandeja de entrada de un usuario
export async function decryptInbox(userId: string) {
  try {
    const privateKeyPath = `./pidgeon_${userId}_privKey.pem`;
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

    const response = await axios.get(`${serverEndpoint}/users/${userId}/inbox`);
    const inbox = response.data;

    // Descifrar cada mensaje en la bandeja de entrada
    const decryptedInbox = inbox.map((message: any) => {
      const decryptedContent = decryptMessage(message.content, privateKey);
      return { ...message, content: decryptedContent };
    });

    console.log('Bandeja de entrada descifrada:', decryptedInbox);
  } catch (error: unknown) {
    console.error('Error al descifrar la bandeja de entrada:', (error as any)?.response?.data?.error);
  }
}

// Vaciar el inbox de un usuario
export async function deleteInbox(userId: string) {
  try {
    const response = await axios.get(`${serverEndpoint}/users/${userId}/inbox/deleteKey`);
    const { encryptedKey } = response.data;

    const privateKeyPath = `./pidgeon_${userId}_privKey.pem`;
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const key = new NodeRSA();
    key.importKey(privateKey, 'pkcs8-private-pem');
    const decryptedKey = key.decrypt(encryptedKey, 'utf8');
    console.log(`[DEBUG] Decrypted key: ${decryptedKey}`);

    const deleteResponse = await axios.delete(`${serverEndpoint}/users/${userId}/inbox`, {
      data: { deleteKey: decryptedKey },
    });

    if (deleteResponse.data.success) {
      console.log('Bandeja de entrada vaciada correctamente');
    } else {
      console.log('No se pudo vaciar la bandeja de entrada');
    }
  } catch (error: unknown) {
    console.error('Error al vaciar el inbox:', (error as any)?.response?.data?.error);
  }
}

