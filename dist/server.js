"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const node_rsa_1 = __importDefault(require("node-rsa"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
const port = 3000;
app.use(express_1.default.json());
app.use((0, cors_1.default)());
const randomStrings = [];
// Ruta del archivo de datos
const dataFilePath = './data.json';
// Leer los datos almacenados en el archivo
function readDataFromFile() {
    try {
        const data = fs_1.default.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        // Si el archivo no existe o hay algún error al leerlo, retorna datos vacíos
        return { userList: [] };
    }
}
// Guardar los datos en el archivo
function saveDataToFile(data) {
    fs_1.default.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}
// Generar una clave aleatoria y cifrarla con la clave pública del usuario
function encryptRandomKey(publicKey) {
    const randomString = crypto_1.default.randomBytes(32).toString('hex');
    const key = new node_rsa_1.default();
    key.importKey(publicKey, 'pkcs8-public-pem');
    return [randomString, key.encrypt(randomString, 'base64')];
}
// Verificar si la clave de borrado descifrada es correcta
function isDeleteKeyValid(deleteKey, decryptedKey) {
    if (deleteKey === undefined) {
        return false;
    }
    return deleteKey === decryptedKey;
}
// Leer los datos almacenados en el archivo al iniciar el servidor
let { userList } = readDataFromFile();
// Crear un nuevo usuario con alias y clave pública
app.post('/users', (req, res) => {
    const alias = req.body.alias;
    const pubKey = req.body.pubKey;
    // Comprobar si ya existe un usuario con el mismo alias
    const existingUser = userList.find((user) => user.alias === alias);
    if (existingUser) {
        return res.status(409).json({ error: 'Ya existe un usuario con ese alias' });
    }
    const user = { alias, pubKey, inbox: [] };
    userList.push(user);
    // Guardar los datos en el archivo
    saveDataToFile({ userList });
    res.json({ success: true });
});
// Enviar mensaje a un usuario
app.post('/users/:userId/inbox', (req, res) => {
    const userId = req.params.userId;
    const { sender, content } = req.body;
    const user = userList.find((u) => u.alias === userId);
    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const message = {
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
app.get('/users/:alias', (req, res) => {
    const alias = req.params.alias;
    const user = userList.find((u) => u.alias === alias);
    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
});
// Obtener lista de usuarios
app.get('/users', (req, res) => {
    res.json(userList);
});
// Obtener la bandeja de entrada de un usuario
app.get('/users/:alias/inbox', (req, res) => {
    const alias = req.params.alias;
    const user = userList.find((u) => u.alias === alias);
    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user.inbox);
});
// Generar y enviar la clave aleatoria cifrada al usuario para borrar los mensajes
app.get('/users/:alias/inbox/deleteKey', (req, res) => {
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
app.delete('/users/:alias/inbox', (req, res) => {
    const alias = req.params.alias;
    const user = userList.find((u) => u.alias === alias);
    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const deleteKey = req.body.deleteKey;
    const randomStringId = alias;
    // Buscar el randomString correspondiente al randomStringId en el array global
    const randomStringObj = randomStrings.find((obj) => obj.id === randomStringId);
    if (!randomStringObj || !isDeleteKeyValid(deleteKey, randomStringObj.randomString)) {
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
