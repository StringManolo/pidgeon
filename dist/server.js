"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const node_rsa_1 = __importDefault(require("node-rsa"));
const crypto_1 = __importDefault(require("crypto"));
const app = (0, express_1.default)();
const port = 3000;
app.use(express_1.default.json());
app.use((0, cors_1.default)());
const userList = [];
const randomStrings = [];
// Generar una clave aleatoria y cifrarla con la clave pública del usuario
function encryptRandomKey(publicKey) {
    const randomString = crypto_1.default.randomBytes(32).toString('hex');
    console.log(`El string random es: ${randomString}`);
    const key = new node_rsa_1.default();
    key.importKey(publicKey, 'pkcs8-public-pem');
    return [randomString, key.encrypt(randomString, 'base64')];
}
// Verificar si la clave de borrado descifrada es correcta
function isDeleteKeyValid(deleteKey, decryptedKey) {
    return deleteKey !== undefined && deleteKey === decryptedKey;
}
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
    res.json({ success: true });
});
// Enviar mensaje a un usuario
app.post('/users/:userId/inbox', (req, res) => {
    const userId = req.params.userId;
    const { sender, content } = req.body;
    const user = userList.find((u) => u.alias === userId || u.pubKey === userId);
    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const message = {
        sender,
        content,
        timestamp: Date.now(),
    };
    user.inbox.push(message);
    res.json({ success: true });
});
// Buscar usuario por alias o pubKey
app.get('/users/:userId', (req, res) => {
    const userId = req.params.userId;
    const user = userList.find((u) => u.alias === userId || u.pubKey === userId);
    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
});
// Obtener lista de usuarios
app.get('/users', (req, res) => {
    const userListWithoutInbox = userList.map((user) => {
        const { inbox } = user, userWithoutInbox = __rest(user, ["inbox"]);
        return userWithoutInbox;
    });
    res.json(userListWithoutInbox);
});
// Obtener la bandeja de entrada de un usuario
app.get('/users/:userId/inbox', (req, res) => {
    const userId = req.params.userId;
    const user = userList.find((u) => u.alias === userId || u.pubKey === userId);
    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user.inbox);
});
// Generar y enviar la clave aleatoria cifrada al usuario para borrar los mensajes
app.get('/users/:userId/inbox/deleteKey', (req, res) => {
    const userId = req.params.userId;
    const user = userList.find((u) => u.alias === userId || u.pubKey === userId);
    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const [_randomString, encryptedKey] = encryptRandomKey(user.pubKey);
    randomStrings.push({ randomString: _randomString, id: user.alias });
    user.deleteKey = encryptedKey; // Almacenar la clave cifrada en el usuario
    res.json({ encryptedKey });
});
// Borrar los mensajes de la bandeja de entrada de un usuario
app.delete('/users/:userId/inbox', (req, res) => {
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
            break;
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
