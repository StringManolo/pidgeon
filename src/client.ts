import axios from 'axios';
import NodeRSA from 'node-rsa';
import fs from 'fs';

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

// Verificar si existe el archivo de clave privada
export function privateKeyExists(alias: string): boolean {
  const privateKeyPath = `./pidgeon_${alias}_privKey.pem`;
  return fs.existsSync(privateKeyPath);
}

// Crear un nuevo usuario con alias y par de claves
export async function createUser(alias: string) {
  // Verificar si el usuario ya tiene una clave privada
  if (privateKeyExists(alias)) {
    console.log('El usuario ya tiene una clave privada.');
    return;
  }

  try {
    const keyPair = generateRSAKeyPair();
    await axios.post('http://localhost:3000/users', { alias, pubKey: keyPair.publicKey });

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
    const response = await axios.get(`http://localhost:3000/users/${userId}`);
    const user = response.data;
    const encryptedMessage = encryptMessage(content, user.pubKey);

    const messageData = {
      sender,
      content: encryptedMessage,
    };
    await axios.post(`http://localhost:3000/users/${userId}/inbox`, messageData);
    console.log('Mensaje enviado exitosamente');
  } catch (error: unknown) {
    console.error('Error al enviar el mensaje:', error);
  }
}

// Buscar un usuario por alias o pubKey
export async function findUser(userId: string) {
  try {
    const response = await axios.get(`http://localhost:3000/users/${userId}`);
    console.log('Usuario encontrado:', response.data);
  } catch (error: unknown) {
    console.error('Error al buscar el usuario:', (error as any).response?.data.error);
  }
}

// Obtener la lista de usuarios
export async function getUserList() {
  try {
    const response = await axios.get('http://localhost:3000/users');
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

    const response = await axios.get(`http://localhost:3000/users/${userId}/inbox`);
    const inbox = response.data;

    // Descifrar cada mensaje en la bandeja de entrada
    const decryptedInbox = inbox.map((message: any) => {
      const decryptedContent = decryptMessage(message.content, privateKey);
      return { ...message, content: decryptedContent };
    });

    console.log('Bandeja de entrada descifrada:', decryptedInbox);
  } catch (error: unknown) {
    console.error('Error al descifrar la bandeja de entrada:', error);
  }
}

// Vaciar el inbox de un usuario
export async function deleteInbox(userId: string) {
  try {
    const response = await axios.get(`http://localhost:3000/users/${userId}/inbox/deleteKey`);
    const { encryptedKey } = response.data;

    const privateKeyPath = `./pidgeon_${userId}_privKey.pem`;
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const key = new NodeRSA();
    key.importKey(privateKey, 'pkcs8-private-pem');
    const decryptedKey = key.decrypt(encryptedKey, 'utf8');
    console.log(`[DEBUG] Decrypted key: ${decryptedKey}`);


    const deleteResponse = await axios.delete(`http://localhost:3000/users/${userId}/inbox`, { data: { deleteKey: decryptedKey } });

    if (deleteResponse.data.success) {
      console.log('Bandeja de entrada vaciada correctamente');
    } else {
      console.log('No se pudo vaciar la bandeja de entrada');
    }
  } catch (error: unknown) {
    console.error('Error al vaciar el inbox:', error);
  }
}





/*
 // Ejemplo de uso
async function runExample() {
  const alias = 'user_17371';
  await createUser(alias);
  await sendMessage(alias, 'sender', 'Hola soy StringManolo :D');
  await findUser(alias);
  await getUserList();
  await decryptInbox(alias);
  await deleteInbox(alias);
}

runExample();
*/
