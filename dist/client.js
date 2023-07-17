"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteInbox = exports.decryptInbox = exports.getUserList = exports.findUser = exports.sendMessage = exports.createUser = exports.privateKeyExists = exports.decryptMessage = exports.encryptMessage = exports.generateRSAKeyPair = exports.setServerEndpoint = void 0;
const axios_1 = __importDefault(require("axios"));
const node_rsa_1 = __importDefault(require("node-rsa"));
const fs_1 = __importDefault(require("fs"));
let serverEndpoint = 'https://publicpidgeon.glitch.me/'; // Endpoint por defecto
// Función para cambiar el endpoint del servidor
function setServerEndpoint(endpoint) {
    serverEndpoint = endpoint;
}
exports.setServerEndpoint = setServerEndpoint;
// Generar un par de claves RSA
function generateRSAKeyPair() {
    const key = new node_rsa_1.default({ b: 2048 }); // Seleccionar el tamaño de clave adecuado
    return {
        publicKey: key.exportKey('pkcs8-public-pem'),
        privateKey: key.exportKey('pkcs8-private-pem'),
    };
}
exports.generateRSAKeyPair = generateRSAKeyPair;
// Cifrar un mensaje con la clave pública del destinatario
function encryptMessage(message, publicKey) {
    const key = new node_rsa_1.default();
    key.importKey(publicKey, 'pkcs8-public-pem');
    return key.encrypt(message, 'base64');
}
exports.encryptMessage = encryptMessage;
// Descifrar un mensaje con la clave privada del destinatario
function decryptMessage(encryptedMessage, privateKey) {
    const key = new node_rsa_1.default();
    key.importKey(privateKey, 'pkcs8-private-pem');
    return key.decrypt(encryptedMessage, 'utf8');
}
exports.decryptMessage = decryptMessage;
// Verificar si existe el archivo de clave privada o si el usuario existe en la base de datos
function privateKeyExists(alias) {
    return __awaiter(this, void 0, void 0, function* () {
        const privateKeyPath = `./pidgeon_${alias}_privKey.pem`;
        const existsLocally = fs_1.default.existsSync(privateKeyPath);
        if (!existsLocally) {
            try {
                yield axios_1.default.get(`${serverEndpoint}/users/${alias}`);
                return true; // El usuario existe en la base de datos
            }
            catch (error) {
                return false; // El usuario no existe en la base de datos
            }
        }
        return existsLocally;
    });
}
exports.privateKeyExists = privateKeyExists;
// Crear un nuevo usuario con alias y par de claves
function createUser(alias) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        // Verificar si el usuario ya existe en la base de datos
        try {
            yield axios_1.default.get(`${serverEndpoint}/users/${alias}`);
            console.log('El usuario ya existe en la base de datos.');
            return;
        }
        catch (error) {
            // El usuario no existe en la base de datos
        }
        // Verificar si el usuario ya tiene una clave privada
        if (yield privateKeyExists(alias)) {
            console.log(`El usuario ya tiene una clave privada pero no existe en la base de datos. Elimina la clave:

rm "./pidgeon_${alias}_privKey.pem"
`);
            return;
        }
        try {
            const keyPair = generateRSAKeyPair();
            yield axios_1.default.post(`${serverEndpoint}/users`, { alias, pubKey: keyPair.publicKey });
            // Escribir la clave privada en un archivo
            const privateKeyPath = `./pidgeon_${alias}_privKey.pem`;
            fs_1.default.writeFileSync(privateKeyPath, keyPair.privateKey);
            console.log('Usuario creado exitosamente');
            console.log(`Clave privada guardada en: ${privateKeyPath}`);
        }
        catch (error) {
            console.error('Error al crear el usuario:', (_a = error.response) === null || _a === void 0 ? void 0 : _a.data.error);
        }
    });
}
exports.createUser = createUser;
// Enviar un mensaje a un usuario
function sendMessage(userId, sender, content) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(`${serverEndpoint}/users/${userId}`);
            const user = response.data;
            const encryptedMessage = encryptMessage(content, user.pubKey);
            const messageData = {
                sender,
                content: encryptedMessage,
            };
            yield axios_1.default.post(`${serverEndpoint}/users/${userId}/inbox`, messageData);
            console.log('Mensaje enviado exitosamente');
        }
        catch (error) {
            console.error('Error al enviar el mensaje:', error);
        }
    });
}
exports.sendMessage = sendMessage;
// Buscar un usuario por alias o pubKey
function findUser(userId) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(`${serverEndpoint}/users/${userId}`);
            console.log('Usuario encontrado:', response.data);
        }
        catch (error) {
            console.error('Error al buscar el usuario:', (_a = error.response) === null || _a === void 0 ? void 0 : _a.data.error);
        }
    });
}
exports.findUser = findUser;
// Obtener la lista de usuarios
function getUserList() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(`${serverEndpoint}/users`);
            console.log('Lista de usuarios:', response.data);
        }
        catch (error) {
            console.error('Error al obtener la lista de usuarios:', (_a = error.response) === null || _a === void 0 ? void 0 : _a.data.error);
        }
    });
}
exports.getUserList = getUserList;
// Descifrar la bandeja de entrada de un usuario
function decryptInbox(userId) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const privateKeyPath = `./pidgeon_${userId}_privKey.pem`;
            const privateKey = fs_1.default.readFileSync(privateKeyPath, 'utf8');
            const response = yield axios_1.default.get(`${serverEndpoint}/users/${userId}/inbox`);
            const inbox = response.data;
            // Descifrar cada mensaje en la bandeja de entrada
            const decryptedInbox = inbox.map((message) => {
                const decryptedContent = decryptMessage(message.content, privateKey);
                return Object.assign(Object.assign({}, message), { content: decryptedContent });
            });
            console.log('Bandeja de entrada descifrada:', decryptedInbox);
        }
        catch (error) {
            console.error('Error al descifrar la bandeja de entrada:', (_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error);
        }
    });
}
exports.decryptInbox = decryptInbox;
// Vaciar el inbox de un usuario
function deleteInbox(userId) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(`${serverEndpoint}/users/${userId}/inbox/deleteKey`);
            const { encryptedKey } = response.data;
            const privateKeyPath = `./pidgeon_${userId}_privKey.pem`;
            const privateKey = fs_1.default.readFileSync(privateKeyPath, 'utf8');
            const key = new node_rsa_1.default();
            key.importKey(privateKey, 'pkcs8-private-pem');
            const decryptedKey = key.decrypt(encryptedKey, 'utf8');
            console.log(`[DEBUG] Decrypted key: ${decryptedKey}`);
            const deleteResponse = yield axios_1.default.delete(`${serverEndpoint}/users/${userId}/inbox`, {
                data: { deleteKey: decryptedKey },
            });
            if (deleteResponse.data.success) {
                console.log('Bandeja de entrada vaciada correctamente');
            }
            else {
                console.log('No se pudo vaciar la bandeja de entrada');
            }
        }
        catch (error) {
            console.error('Error al vaciar el inbox:', (_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error);
        }
    });
}
exports.deleteInbox = deleteInbox;
